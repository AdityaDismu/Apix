from dataclasses import asdict
from datetime import date

SUPPORTED_CURRENCY = "INR"


def validate_record(record):
    try:
        travel_date = date.fromisoformat(record.travel_date)
    except (TypeError, ValueError):
        return False, "invalid_travel_date"
    if not record.origin or not record.destination or record.origin == record.destination:
        return False, "invalid_route"
    if travel_date < date.today() and record.advance_days >= 0:
        return False, "travel_date_in_past"
    if not record.airline:
        return False, "missing_airline"
    if record.total_fare is None or record.total_fare <= 0:
        return False, "invalid_fare"
    if record.currency != SUPPORTED_CURRENCY:
        return False, "unsupported_currency"
    if record.duration_minutes <= 0:
        return False, "invalid_duration"
    if record.stops < 0:
        return False, "invalid_stops"
    if not record.departure_time or not record.arrival_time:
        return False, "missing_schedule"
    return True, None


def validate_records(records):
    valid, rejected = [], []
    for record in records:
        ok, reason = validate_record(record)
        if ok:
            valid.append(record)
        else:
            rejected.append({"observation_id": record.observation_id, "reason": reason})
    return valid, rejected


def deduplicate_records(records):
    seen, unique = set(), []
    for record in records:
        identity = (record.source, record.origin, record.destination, record.travel_date,
                    record.airline, record.flight_number, record.departure_time,
                    record.arrival_time, record.duration_minutes, record.stops)
        if identity not in seen:
            seen.add(identity)
            unique.append(record)
    return unique
