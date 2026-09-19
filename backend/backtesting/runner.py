import csv, uuid, math
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from database.db import get_connection
from backtesting.metrics import mae,rmse,mape,correlation
from index_engine.config import METHODOLOGY_VERSION


def _load_reference(path):
    with Path(path).open("r",encoding="utf-8-sig",newline="") as f:
        rows=list(csv.DictReader(f))
    required={"origin","destination","period_start","reference_value"}
    if rows and not required.issubset(rows[0]): raise ValueError(f"Backtest file requires {sorted(required)}")
    out=[]
    for r in rows:
        out.append((r["origin"].strip().upper(),r["destination"].strip().upper(),r["period_start"],float(r["reference_value"])))
    return out


def _api_monthly():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT origin,destination,date_trunc('month',observation_date)::date AS month,exp(sum(ln(index_value/100.0)*GREATEST(observations_used,1))/sum(GREATEST(observations_used,1)))*100 AS idx, count(*) AS days FROM route_index_values GROUP BY origin,destination,month ORDER BY month")
            return cur.fetchall()


def run_backtest(path, min_calendar_days=30):
    from psycopg.types.json import Jsonb
    run_id=str(uuid.uuid4()); started=datetime.now().astimezone(); reference=_load_reference(path); api=_api_monthly()
    ref_map={(a,b,p):(v) for a,b,p,v in reference}; api_map={(str(a).strip(),str(b).strip(),p.isoformat() if hasattr(p,"isoformat") else str(p)):(float(v),int(days)) for a,b,p,v,days in api}
    matched=[]; routes=set(); days_supported=0
    for (o,d,p),(ref_value) in ref_map.items():
        key=(o,d,p)
        if key not in api_map: continue
        api_value, days=api_map[key]; days_supported=max(days_supported,days)
        routes.add((o,d)); matched.append([o,d,p,api_value,ref_value])
    if not matched:
        raise ValueError("No route/month observations overlap between APIx and DGCA reference data.")
    # Normalize both series to 100 within each route, then compare movements.
    by_route=defaultdict(list)
    for row in matched: by_route[(row[0],row[1])].append(row)
    comparisons=[]
    for route, rows in by_route.items():
        rows.sort(key=lambda x:x[2]); api_base=rows[0][3]; ref_base=rows[0][4]
        for o,d,p,a,r in rows:
            ai=a/api_base*100; ri=r/ref_base*100; err=ai-ri
            comparisons.append((o,d,p,ai,ri,ai-100 if ai else None,ri-100 if ri else None,abs(err),err*err))
    api_vals=[x[3] for x in comparisons]; ref_vals=[x[4] for x in comparisons]; errors=[a-r for a,r in zip(api_vals,ref_vals)]
    metrics={"mae_index_points":mae(errors),"rmse_index_points":rmse(errors),"mape_percent":mape(api_vals,ref_vals),"correlation":correlation(api_vals,ref_vals),"matched_periods":len(comparisons),"routes":len(routes),"max_api_days_in_matched_period":days_supported,"minimum_calendar_day_requirement":min_calendar_days}
    status="success" if days_supported>=min_calendar_days else "partial_success"
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO backtest_runs(backtest_run_id,started_at,finished_at,reference_source,reference_period,status,observations_compared,routes_compared,metrics,methodology_version) VALUES(%s,%s,NOW(),%s,%s,%s,%s,%s,%s,%s)", (run_id,started,"DGCA reference file",None,status,len(comparisons),len(routes),Jsonb(metrics),METHODOLOGY_VERSION))
            for x in comparisons:
                cur.execute("INSERT INTO backtest_observations(backtest_run_id,route_origin,route_destination,period_start,api_index,reference_value,api_change_pct,reference_change_pct,absolute_error,squared_error) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",(run_id,x[0],x[1],x[2],x[3],x[4],x[5],x[6],x[7],x[8]))
        conn.commit()
    return {"backtest_run_id":run_id,"status":status,"metrics":metrics}
