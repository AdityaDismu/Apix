import json
from datetime import datetime
from pathlib import Path


def save_collection(records, rejected_records, output_directory, origin, destination, travel_date, advance_days, collection_timestamp, status, pipeline_run_id=None, source="google_flights", metadata=None):
    output_directory.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    output_file = output_directory / f"{origin}_{destination}_T{advance_days}_{travel_date}_{stamp}.json"
    payload = {
        "schema_version": "2.0",
        "pipeline_run_id": pipeline_run_id,
        "collection_status": status,
        "source": source,
        "source_metadata": metadata or {},
        "collection_timestamp": collection_timestamp,
        "origin": origin,
        "destination": destination,
        "travel_date": travel_date,
        "advance_days": advance_days,
        "records_found": len(records) + len(rejected_records),
        "records_valid": len(records),
        "records_rejected": len(rejected_records),
        "rejected_records": rejected_records,
        "flights": [r.to_dict() for r in records],
    }
    output_file.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return output_file
