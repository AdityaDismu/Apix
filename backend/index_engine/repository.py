from database.db import get_connection

OBS_COLUMNS = "observation_id,collection_timestamp,origin,destination,travel_date,advance_days,airline,flight_number,departure_time,arrival_time,duration_minutes,total_fare,currency,flight_instance_id,fare_match_key"


def fetch_observations(origin=None, destination=None, limit=200000):
    q=f"SELECT {OBS_COLUMNS} FROM airfare_observations WHERE quality_status='valid' AND currency='INR' AND trip_type='one-way' AND fare_class='economy' AND stops=0"
    params=[]
    if origin: q += " AND origin=%s"; params.append(origin.upper())
    if destination: q += " AND destination=%s"; params.append(destination.upper())
    q += " ORDER BY collection_timestamp,advance_days,travel_date,fare_match_key LIMIT %s"; params.append(limit)
    with get_connection() as c:
        with c.cursor() as cur: cur.execute(q,params); return cur.fetchall()


def save_snapshot(r, pipeline_run_id=None):
    with get_connection() as c:
        with c.cursor() as cur:
            cur.execute("""
                INSERT INTO index_snapshots(pipeline_run_id,origin,destination,advance_days,travel_date,collection_timestamp,index_value,observations_used,matched_observations,coverage_ratio,calculation_method,base_snapshot_timestamp,methodology_version)
                VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT(origin,destination,advance_days,travel_date,collection_timestamp) DO UPDATE SET
                  pipeline_run_id=EXCLUDED.pipeline_run_id,index_value=EXCLUDED.index_value,observations_used=EXCLUDED.observations_used,
                  matched_observations=EXCLUDED.matched_observations,coverage_ratio=EXCLUDED.coverage_ratio,
                  calculation_method=EXCLUDED.calculation_method,base_snapshot_timestamp=EXCLUDED.base_snapshot_timestamp,
                  methodology_version=EXCLUDED.methodology_version RETURNING snapshot_id
            """,(pipeline_run_id,r['origin'],r['destination'],r['advance_days'],r['travel_date'],r['collection_timestamp'],r['index'],r['observations_used'],r['matched_observations'],r['coverage_ratio'],r['calculation_method'],r['base_snapshot_timestamp'],r['methodology_version']))
        c.commit(); return cur.fetchone()[0]


def save_route_index(r, pipeline_run_id=None):
    with get_connection() as c:
        with c.cursor() as cur:
            cur.execute("""
                INSERT INTO route_index_values(pipeline_run_id,origin,destination,collection_timestamp,observation_date,index_value,lead_time_windows,observations_used,coverage_ratio,methodology_version)
                VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT(origin,destination,collection_timestamp) DO UPDATE SET
                  pipeline_run_id=EXCLUDED.pipeline_run_id,index_value=EXCLUDED.index_value,lead_time_windows=EXCLUDED.lead_time_windows,
                  observations_used=EXCLUDED.observations_used,coverage_ratio=EXCLUDED.coverage_ratio,methodology_version=EXCLUDED.methodology_version
            """,(pipeline_run_id,r['origin'],r['destination'],r['collection_timestamp'],r['observation_date'],r['index'],r['lead_time_windows'],r['observations_used'],r['coverage_ratio'],r['methodology_version']))
        c.commit()


def fetch_route_weights(reference_period=None):
    q="SELECT origin,destination,weight,reference_period FROM route_weights WHERE (effective_to IS NULL OR effective_to>=CURRENT_DATE)"
    params=[]
    if reference_period:
        q += " AND reference_period=%s"; params.append(reference_period)
    else:
        q += " AND reference_period=(SELECT MAX(reference_period) FROM route_weights WHERE (effective_to IS NULL OR effective_to>=CURRENT_DATE))"
    q += " ORDER BY origin,destination"
    with get_connection() as c:
        with c.cursor() as cur: cur.execute(q,params); return cur.fetchall()


def save_national_index(r, pipeline_run_id=None):
    with get_connection() as c:
        with c.cursor() as cur:
            cur.execute("""
                INSERT INTO national_index_values(pipeline_run_id,collection_timestamp,observation_date,index_value,routes_used,routes_expected,route_coverage_ratio,observations_used,weight_reference_period,methodology_version)
                VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT(collection_timestamp) DO UPDATE SET
                  pipeline_run_id=EXCLUDED.pipeline_run_id,index_value=EXCLUDED.index_value,routes_used=EXCLUDED.routes_used,
                  routes_expected=EXCLUDED.routes_expected,route_coverage_ratio=EXCLUDED.route_coverage_ratio,
                  observations_used=EXCLUDED.observations_used,weight_reference_period=EXCLUDED.weight_reference_period,
                  methodology_version=EXCLUDED.methodology_version
            """,(pipeline_run_id,r['collection_timestamp'],r['observation_date'],r['index'],r['routes_used'],r['routes_expected'],r['route_coverage_ratio'],r['observations_used'],r.get('weight_reference_period'),r['methodology_version']))
        c.commit()


def fetch_route_history(origin,destination,limit=500):
    with get_connection() as c:
        with c.cursor() as cur:
            cur.execute("SELECT collection_timestamp,observation_date,index_value,lead_time_windows,observations_used,coverage_ratio FROM route_index_values WHERE origin=%s AND destination=%s ORDER BY collection_timestamp DESC LIMIT %s",(origin,destination,limit)); return cur.fetchall()


def fetch_national_history(limit=500):
    with get_connection() as c:
        with c.cursor() as cur:
            cur.execute("SELECT collection_timestamp,observation_date,index_value,routes_used,routes_expected,route_coverage_ratio,observations_used,weight_reference_period FROM national_index_values ORDER BY collection_timestamp DESC LIMIT %s",(limit,)); return cur.fetchall()
