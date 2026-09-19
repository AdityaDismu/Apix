"""End-to-end real-time collection pipeline.

LIVE source -> raw evidence -> cleaning -> PostgreSQL -> route APIx -> national APIx -> periodic aggregates.
No stage invents missing source values.
"""
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from database.db import get_connection
from index_engine.config import configured_routes
from index_engine.route_index import calculate_route_indices, calculate_national_index
from index_engine.periodic import rebuild_periodic_indices
from cleaning.cleaner import clean_file
from database.import_clean import import_clean_file

BACKEND_DIR=Path(__file__).resolve().parent.parent
PROJECT_ROOT=BACKEND_DIR.parent
DATA_RAW_DIR=PROJECT_ROOT/"data"/"raw"
DATA_CLEAN_DIR=PROJECT_ROOT/"data"/"clean"


def _create_run(run_id, started, routes):
    with get_connection() as c:
        with c.cursor() as cur:
            cur.execute("INSERT INTO pipeline_runs(pipeline_run_id,started_at,status,routes_requested,metadata) VALUES(%s,%s,'running',%s,%s)",(run_id,started,len(routes),json.dumps({"methodology":"4.0"})))
        c.commit()


def _finish_run(run_id,status,started,routes_ok,routes_failed,observations,errors):
    with get_connection() as c:
        with c.cursor() as cur:
            cur.execute("UPDATE pipeline_runs SET finished_at=%s,status=%s,routes_succeeded=%s,routes_failed=%s,observations_collected=%s,error_summary=%s WHERE pipeline_run_id=%s",(datetime.now(timezone.utc),status,routes_ok,routes_failed,observations,json.dumps(errors),run_id))
        c.commit()


def run_pipeline():
    run_id=str(uuid.uuid4()); started=datetime.now(timezone.utc); routes=configured_routes(); _create_run(run_id,started,routes)
    errors=[]; collection_results=[]; imported=[]; route_results=[]; national_results=[]; observations=0; route_ok=0; route_failed=0
    try:
        from flight_scraper import run_collection
        collection=run_collection(run_id,started.astimezone())
        collection_results=collection["results"]
        for result in collection_results:
            observations += result.get("records",0)
            if result.get("status") not in {"success","no_flights"}:
                errors.append({"stage":"collection","route":f"{result.get('advance_days')}","error":result.get("error") or result.get("metadata")})

        for result in collection_results:
            raw=result.get("file")
            if not raw: continue
            try:
                raw_path=Path(raw); clean_path=DATA_CLEAN_DIR/f"{raw_path.stem}_clean.json"
                clean_file(raw_path,clean_path)
                import_result=import_clean_file(clean_path); imported.append(import_result)
            except Exception as exc:
                errors.append({"stage":"clean_import","file":raw,"error":str(exc)})

        for origin,destination in routes:
            try:
                result=calculate_route_indices(origin,destination,run_id)
                route_results.extend(result)
                if result: route_ok += 1
                else: route_failed += 1
            except Exception as exc:
                route_failed += 1; errors.append({"stage":"route_index","route":f"{origin}-{destination}","error":str(exc)})

        try:
            national_results=calculate_national_index(route_results,pipeline_run_id=run_id)
        except Exception as exc:
            errors.append({"stage":"national_index","error":str(exc)})

        try: periodic=rebuild_periodic_indices()
        except Exception as exc:
            periodic=[]; errors.append({"stage":"periodic_index","error":str(exc)})

        status="failed" if not imported and not route_results else ("partial_success" if errors else "success")
        _finish_run(run_id,status,started,route_ok,route_failed,observations,errors)
        return {"pipeline_run_id":run_id,"started_at":started,"finished_at":datetime.now(timezone.utc),"status":status,"collection_results":collection_results,"clean_imports":imported,"route_results":route_results,"national_results":national_results,"periodic_results":periodic,"errors":errors}
    except Exception as exc:
        errors.append({"stage":"pipeline","error":str(exc)})
        _finish_run(run_id,"failed",started,route_ok,route_failed,observations,errors)
        return {"pipeline_run_id":run_id,"started_at":started,"finished_at":datetime.now(timezone.utc),"status":"failed","collection_results":collection_results,"clean_imports":imported,"route_results":route_results,"national_results":national_results,"periodic_results":[],"errors":errors}


if __name__=="__main__": print(json.dumps(run_pipeline(),indent=2,default=str))
