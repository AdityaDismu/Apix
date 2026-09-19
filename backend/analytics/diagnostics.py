from database.db import get_connection


def summary():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*),COUNT(*) FILTER(WHERE quality_status='valid'),COUNT(*) FILTER(WHERE quality_status='flagged'),COUNT(*) FILTER(WHERE fare_components_complete) FROM airfare_observations")
            total,valid,flagged,components=cur.fetchone()
            cur.execute("SELECT COUNT(*),COUNT(*) FILTER(WHERE collection_status='success'),COUNT(*) FILTER(WHERE collection_status<>'success') FROM collection_runs")
            runs,successful,failed=cur.fetchone()
            cur.execute("SELECT COUNT(DISTINCT origin||destination) FROM routes WHERE active")
            routes=cur.fetchone()[0]
    return {"observations_total":total,"observations_valid":valid,"observations_flagged":flagged,"fare_component_complete":components,"collection_runs":runs,"collection_runs_success":successful,"collection_runs_non_success":failed,"active_routes":routes,"valid_rate":(valid/total if total else 0),"outlier_rate":(flagged/total if total else 0)}
