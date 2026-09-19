from datetime import date, datetime

from scraper.config import NON_STOP_ONLY, SOURCE
from scraper.source_registry import get_adapter


def collect_flights(origin, destination, travel_date, pipeline_run_id=None, collection_timestamp=None):
    origin = origin.upper().strip()
    destination = destination.upper().strip()
    if not origin or not destination or origin == destination:
        raise ValueError("Valid, different origin and destination airport codes are required.")
    date.fromisoformat(travel_date)
    collection_timestamp = collection_timestamp or datetime.now().astimezone()
    adapter = get_adapter(SOURCE)
    records, metadata = adapter.collect(origin, destination, travel_date, pipeline_run_id, collection_timestamp)
    if NON_STOP_ONLY:
        records = [record for record in records if record.stops == 0]
    return records, collection_timestamp, metadata
