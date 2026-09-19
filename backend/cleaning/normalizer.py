import hashlib
import math


def normalize_airline(value):
    if value is None:
        return None
    value = " ".join(str(value).strip().split())
    return value or None


def normalize_currency(value):
    return str(value or "").strip().upper()


def normalize_money(value):
    if value is None or value == "":
        return None
    value = float(value)
    if not math.isfinite(value) or value < 0:
        raise ValueError("Money values must be finite and non-negative.")
    return round(value, 2)


def normalize_fare(value):
    value = normalize_money(value)
    if value is None or value <= 0:
        raise ValueError("Total fare must be greater than zero.")
    return value


def _digest(parts):
    return hashlib.sha256("|".join(parts).encode()).hexdigest()[:32]


def create_flight_instance_id(record):
    return _digest([
        str(record.get("source", "")), str(record.get("airline", "")).strip().lower(),
        str(record.get("origin", "")).strip().upper(), str(record.get("destination", "")).strip().upper(),
        str(record.get("travel_date", "")), str(record.get("flight_number") or "").strip().upper(),
        str(record.get("departure_time", "")), str(record.get("arrival_time", "")),
        str(record.get("duration_minutes", "")), str(record.get("stops", "")),
    ])


def create_fare_match_key(record):
    """Stable schedule key used when the source lacks a flight number.

    Travel date is intentionally excluded so a recurring scheduled service can
    be compared across daily collection runs as the travel date rolls forward.
    """
    flight_number = str(record.get("flight_number") or "").strip().upper()
    schedule_identity = [
        str(record.get("source", "")), str(record.get("airline", "")).strip().lower(),
        str(record.get("origin", "")).strip().upper(), str(record.get("destination", "")).strip().upper(),
        flight_number, str(record.get("departure_time", "")), str(record.get("arrival_time", "")),
        str(record.get("duration_minutes", "")), str(record.get("stops", "")),
    ]
    return _digest(schedule_identity)


def standardize_fare_components(record):
    components = {k: normalize_money(record.get(k)) for k in (
        "base_fare", "tax_amount", "airport_fee", "udf", "convenience_fee", "other_mandatory_fee"
    )}
    total = normalize_fare(record.get("total_fare"))
    available = [v for v in components.values() if v is not None]
    complete = len(available) == len(components) and abs(sum(available) - total) <= 1.0
    components["fare_components_complete"] = complete
    components["total_fare"] = total
    return components


def normalize_record(record):
    normalized = dict(record)
    normalized["origin"] = str(record.get("origin", "")).strip().upper()
    normalized["destination"] = str(record.get("destination", "")).strip().upper()
    normalized["airline"] = normalize_airline(record.get("airline")) or "Unknown"
    normalized["currency"] = normalize_currency(record.get("currency"))
    normalized.update(standardize_fare_components(record))
    normalized["stops"] = int(record.get("stops", 0))
    normalized["duration_minutes"] = int(record.get("duration_minutes", 0))
    normalized["fare_class"] = "economy"
    normalized["trip_type"] = "one-way"
    normalized["availability"] = record.get("availability") or "available"
    normalized["flight_instance_id"] = create_flight_instance_id(normalized)
    normalized["fare_match_key"] = create_fare_match_key(normalized)
    normalized.setdefault("quality_flags", [])
    return normalized
