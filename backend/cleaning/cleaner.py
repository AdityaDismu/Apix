import hashlib
import json
from datetime import datetime
from pathlib import Path

from cleaning.normalizer import normalize_record

SCHEMA_VERSION = "3.0"
CLEANING_VERSION = "2.0.0"


def percentile(values, percentage):
    values = sorted(values)
    if not values:
        return None
    if len(values) == 1:
        return values[0]
    position = (len(values) - 1) * percentage / 100
    lo = int(position)
    hi = min(lo + 1, len(values) - 1)
    return values[lo] + (values[hi] - values[lo]) * (position - lo)


def validate_record(record, expected_route, expected_travel_date, expected_advance_days):
    try:
        normalized = normalize_record(record)
    except (TypeError, ValueError) as exc:
        return False, "normalization_error", None

    if not normalized["origin"] or not normalized["destination"]:
        return False, "missing_route", None
    if (normalized["origin"], normalized["destination"]) != (expected_route["origin"], expected_route["destination"]):
        return False, "route_mismatch", None
    if normalized.get("travel_date") != expected_travel_date.isoformat():
        return False, "travel_date_mismatch", None
    try:
        advance = int(record.get("advance_days"))
    except (TypeError, ValueError):
        return False, "invalid_advance_days", None
    if advance != expected_advance_days or advance < 0:
        return False, "advance_days_mismatch", None
    if not normalized["airline"] or normalized["currency"] != "INR":
        return False, "invalid_airline_or_currency", None
    if normalized["duration_minutes"] <= 0:
        return False, "invalid_duration", None
    if normalized["stops"] < 0:
        return False, "invalid_stops", None
    if normalized["stops"] != 0:
        return False, "not_nonstop", None
    if not record.get("departure_time") or not record.get("arrival_time"):
        return False, "missing_schedule", None

    normalized["advance_days"] = advance
    normalized["quality_status"] = "valid"
    normalized["quality_flags"] = []
    if normalized["duration_minutes"] < 60 or normalized["duration_minutes"] > 300:
        normalized["quality_status"] = "flagged"
        normalized["quality_flags"].append("unusual_duration")
    return True, None, normalized


def deduplicate(records):
    seen = set()
    unique = []
    duplicates = 0
    for record in records:
        key = record["flight_instance_id"]
        if key in seen:
            duplicates += 1
            continue
        seen.add(key)
        unique.append(record)
    return unique, duplicates


def detect_price_outliers(records):
    if len(records) < 5:
        return 0
    prices = [r["total_fare"] for r in records]
    q1, q3 = percentile(prices, 25), percentile(prices, 75)
    iqr = q3 - q1
    if iqr <= 0:
        return 0
    lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    count = 0
    for record in records:
        if record["total_fare"] < lower or record["total_fare"] > upper:
            if "price_outlier" not in record["quality_flags"]:
                record["quality_flags"].append("price_outlier")
                count += 1
            record["quality_status"] = "flagged"
    return count


def clean_data(raw_data):
    route = {"origin": str(raw_data.get("origin", "")).strip().upper(), "destination": str(raw_data.get("destination", "")).strip().upper()}
    try:
        travel_date = datetime.strptime(raw_data.get("travel_date"), "%Y-%m-%d").date()
        advance_days = int(raw_data.get("advance_days"))
    except (TypeError, ValueError) as exc:
        raise ValueError("Raw file contains invalid travel_date or advance_days.") from exc

    raw_records = raw_data.get("flights", [])
    if not isinstance(raw_records, list):
        raise ValueError("Raw file 'flights' must be a list.")

    valid, rejected = [], []
    for record in raw_records:
        ok, reason, normalized = validate_record(record, route, travel_date, advance_days)
        if ok:
            valid.append(normalized)
        else:
            rejected.append({"observation_id": record.get("observation_id"), "reason": reason})

    valid, duplicate_count = deduplicate(valid)
    outlier_count = detect_price_outliers(valid)
    return {
        "schema_version": SCHEMA_VERSION,
        "cleaning_version": CLEANING_VERSION,
        "source_file": raw_data.get("source_file"),
        "pipeline_run_id": raw_data.get("pipeline_run_id"),
        "route": route,
        "travel_date": travel_date.isoformat(),
        "advance_days": advance_days,
        "collection_timestamp": raw_data.get("collection_timestamp"),
        "source": raw_data.get("source"),
        "status": raw_data.get("collection_status") or ("success" if valid else "no_flights"),
        "source_metadata": raw_data.get("source_metadata", {}),
        "standard_product": {
            "passenger_type": "adult",
            "trip_type": "one-way",
            "fare_class": "economy",
            "stops": 0,
            "currency": "INR",
            "fare_definition": "Total mandatory consumer airfare. Optional services and conditional discounts are excluded when identifiable.",
        },
        "statistics": {
            "raw_records": len(raw_records),
            "valid_before_dedup": len(valid) + duplicate_count,
            "duplicates": duplicate_count,
            "clean_records": len(valid),
            "rejected": len(rejected),
            "outliers_flagged": outlier_count,
        },
        "observations": valid,
        "rejected_records": rejected,
    }


def clean_file(input_path, output_path):
    input_path, output_path = Path(input_path), Path(output_path)
    with input_path.open("r", encoding="utf-8") as f:
        raw = json.load(f)
    raw["source_file"] = input_path.name
    cleaned = clean_data(raw)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(cleaned, f, indent=2, ensure_ascii=False)
    return cleaned
