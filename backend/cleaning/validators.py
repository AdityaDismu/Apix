from datetime import date, datetime


VALID_CURRENCY = "INR"
VALID_FARE_CLASS = "economy"
VALID_TRIP_TYPE = "one-way"


def validate_iata(code: str) -> bool:
    return (
        isinstance(code, str)
        and len(code) == 3
        and code.isalpha()
        and code.isupper()
    )


def validate_route(origin: str, destination: str) -> list[str]:
    errors = []

    if not validate_iata(origin):
        errors.append("invalid_origin")

    if not validate_iata(destination):
        errors.append("invalid_destination")

    if origin == destination:
        errors.append("same_origin_destination")

    return errors


def validate_travel_date(travel_date: str) -> list[str]:
    errors = []

    try:
        travel = datetime.strptime(travel_date, "%Y-%m-%d").date()

        if travel < date.today():
            errors.append("past_travel_date")

    except (ValueError, TypeError):
        errors.append("invalid_travel_date")

    return errors


def validate_fare(fare, currency: str) -> list[str]:
    errors = []

    if fare is None:
        errors.append("missing_total_fare")
        return errors

    try:
        fare_value = float(fare)

        if fare_value <= 0:
            errors.append("invalid_total_fare")

    except (ValueError, TypeError):
        errors.append("invalid_total_fare")

    if currency != VALID_CURRENCY:
        errors.append("unsupported_currency")

    return errors


def validate_advance_days(
    travel_date: str,
    collection_timestamp: str,
    expected_advance_days: int,
) -> list[str]:

    errors = []

    try:
        travel = datetime.strptime(
            travel_date,
            "%Y-%m-%d"
        ).date()

        collected = datetime.fromisoformat(
            collection_timestamp
        ).date()

        actual_days = (travel - collected).days

        if actual_days != expected_advance_days:
            errors.append("advance_days_mismatch")

    except (ValueError, TypeError):
        errors.append("invalid_date_calculation")

    return errors