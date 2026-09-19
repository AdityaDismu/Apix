from datetime import datetime, timedelta
import uuid

from scraper.collector import collect_flights
from scraper.validator import validate_records, deduplicate_records
from scraper.storage import save_collection
from scraper.config import RAW_DATA_DIR
from index_engine.config import configured_routes, SUPPORTED_ADVANCE_WINDOWS


def collect_for_advance_window(origin, destination, advance_days, pipeline_run_id, collection_timestamp):
    travel_date = collection_timestamp.date() + timedelta(days=advance_days)
    travel_date_string = travel_date.isoformat()
    try:
        records, _, metadata = collect_flights(origin, destination, travel_date_string, pipeline_run_id, collection_timestamp)
        valid_records, rejected_records = validate_records(records)
        before = len(valid_records)
        valid_records = deduplicate_records(valid_records)
        duplicates = before - len(valid_records)
        status = metadata.get("status", "success") if not valid_records else "success"
        output = save_collection(
            valid_records, rejected_records, RAW_DATA_DIR, origin, destination,
            travel_date_string, advance_days, collection_timestamp.isoformat(), status,
            pipeline_run_id, metadata=metadata,
        )
        return {"status": status, "records": len(valid_records), "duplicates_removed": duplicates,
                "file": str(output), "advance_days": advance_days, "travel_date": travel_date_string,
                "metadata": metadata}
    except Exception as error:
        return {"status": "source_error", "records": 0, "duplicates_removed": 0, "file": None,
                "advance_days": advance_days, "travel_date": travel_date_string, "error": str(error)}


def run_collection(pipeline_run_id=None, collection_timestamp=None):
    pipeline_run_id = pipeline_run_id or str(uuid.uuid4())
    collection_timestamp = collection_timestamp or datetime.now().astimezone()
    results = []
    for origin, destination in configured_routes():
        for advance_days in SUPPORTED_ADVANCE_WINDOWS:
            results.append(collect_for_advance_window(origin, destination, advance_days, pipeline_run_id, collection_timestamp))
    return {"pipeline_run_id": pipeline_run_id, "collection_timestamp": collection_timestamp, "results": results}


if __name__ == "__main__":
    result = run_collection()
    print(f"Pipeline: {result['pipeline_run_id']}")
    print(f"Windows: {len(result['results'])}")
    print(f"Successful: {sum(x['status'] == 'success' for x in result['results'])}")
