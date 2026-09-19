import argparse, hashlib, json
from datetime import datetime
from pathlib import Path
from psycopg.types.json import Jsonb
from database.db import get_connection


def parse_timestamp(value):
    if not value:
        raise ValueError("collection_timestamp is missing")
    return datetime.fromisoformat(value)


def import_clean_file(file_path):
    file_path = Path(file_path)
    data = json.loads(file_path.read_text(encoding="utf-8"))
    if data.get("schema_version") not in {"2.0", "3.0"}:
        raise ValueError(f"Unsupported clean schema: {data.get('schema_version')}")
    if data.get("status") not in {"success", "no_flights", "source_blocked", "captcha_detected", "source_timeout", "source_error", "incomplete_fare", "parse_error"}:
        raise ValueError(f"Unsupported collection status: {data.get('status')}")
    route = data.get("route") or {}
    origin, destination = route.get("origin"), route.get("destination")
    if not origin or not destination:
        raise ValueError("Route information is missing")
    timestamp = parse_timestamp(data.get("collection_timestamp"))
    pipeline_run_id = data.get("pipeline_run_id")
    fingerprint = hashlib.sha256("|".join(map(str,[data.get("source"),origin,destination,data.get("travel_date"),data.get("advance_days"),timestamp.isoformat(),pipeline_run_id])).encode()).hexdigest()
    stats = data.get("statistics", {})

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO collection_runs(pipeline_run_id,source,origin,destination,travel_date,advance_days,collection_timestamp,collection_status,source_file,clean_file,schema_version,cleaning_version,raw_records,valid_records,rejected_records,duplicate_records,outliers_flagged,source_metadata,run_fingerprint)
                VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT(run_fingerprint) DO UPDATE SET
                    pipeline_run_id=EXCLUDED.pipeline_run_id, collection_status=EXCLUDED.collection_status,
                    source_file=EXCLUDED.source_file,clean_file=EXCLUDED.clean_file,raw_records=EXCLUDED.raw_records,
                    valid_records=EXCLUDED.valid_records,rejected_records=EXCLUDED.rejected_records,
                    duplicate_records=EXCLUDED.duplicate_records,outliers_flagged=EXCLUDED.outliers_flagged,
                    source_metadata=EXCLUDED.source_metadata
                RETURNING id
            """,(pipeline_run_id,data.get("source"),origin,destination,data.get("travel_date"),data.get("advance_days"),timestamp,data.get("status"),data.get("source_file"),file_path.name,data.get("schema_version"),data.get("cleaning_version"),stats.get("raw_records",0),stats.get("clean_records",0),stats.get("rejected",0),stats.get("duplicates",0),stats.get("outliers_flagged",0),Jsonb(data.get("source_metadata",{})),fingerprint))
            collection_run_id=cur.fetchone()[0]
            for o in data.get("observations",[]):
                values=(o["observation_id"],collection_run_id,pipeline_run_id,o.get("source"),parse_timestamp(o["collection_timestamp"]),o.get("origin"),o.get("destination"),o.get("travel_date"),o.get("advance_days"),o.get("airline"),o.get("flight_number"),o.get("departure_time"),o.get("arrival_time"),o.get("duration_minutes"),o.get("stops",0),o.get("total_fare"),o.get("base_fare"),o.get("tax_amount"),o.get("airport_fee"),o.get("udf"),o.get("convenience_fee"),o.get("other_mandatory_fee"),o.get("fare_components_complete",False),o.get("currency","INR"),o.get("fare_class","economy"),o.get("trip_type","one-way"),o.get("availability","available"),o.get("flight_instance_id"),o.get("fare_match_key"),o.get("quality_status","valid"),Jsonb(o.get("quality_flags",[])),Jsonb(o.get("source_capabilities",{})))
                cur.execute("""
                    INSERT INTO airfare_observations(observation_id,collection_run_id,pipeline_run_id,source,collection_timestamp,origin,destination,travel_date,advance_days,airline,flight_number,departure_time,arrival_time,duration_minutes,stops,total_fare,base_fare,tax_amount,airport_fee,udf,convenience_fee,other_mandatory_fee,fare_components_complete,currency,fare_class,trip_type,availability,flight_instance_id,fare_match_key,quality_status,quality_flags,source_metadata)
                    VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT(observation_id) DO UPDATE SET
                      collection_run_id=EXCLUDED.collection_run_id,pipeline_run_id=EXCLUDED.pipeline_run_id,
                      collection_timestamp=EXCLUDED.collection_timestamp,total_fare=EXCLUDED.total_fare,
                      base_fare=EXCLUDED.base_fare,tax_amount=EXCLUDED.tax_amount,airport_fee=EXCLUDED.airport_fee,
                      udf=EXCLUDED.udf,convenience_fee=EXCLUDED.convenience_fee,other_mandatory_fee=EXCLUDED.other_mandatory_fee,
                      fare_components_complete=EXCLUDED.fare_components_complete,quality_status=EXCLUDED.quality_status,
                      quality_flags=EXCLUDED.quality_flags,source_metadata=EXCLUDED.source_metadata
                """,values)
            if pipeline_run_id:
                for key,count in [("rejected",stats.get("rejected",0)),("duplicates",stats.get("duplicates",0)),("outliers",stats.get("outliers_flagged",0))]:
                    if count:
                        cur.execute("INSERT INTO data_quality_events(pipeline_run_id,collection_run_id,origin,destination,event_type,count,details) VALUES(%s,%s,%s,%s,%s,%s,%s)",(pipeline_run_id,collection_run_id,origin,destination,key,count,Jsonb({"source_file":file_path.name})))
        conn.commit()
    return {"collection_run_id":collection_run_id,"pipeline_run_id":pipeline_run_id,"observations_in_file":len(data.get("observations",[]))}


if __name__ == "__main__":
    parser=argparse.ArgumentParser(); parser.add_argument("--input",required=True); args=parser.parse_args()
    print(json.dumps(import_clean_file(args.input),indent=2,default=str))
