"""Daily/weekly/monthly aggregation of the high-frequency national APIx.

Aggregation is performed in log space so an index is not averaged arithmetically.
Each source observation is weighted by the number of valid route observations that
supported its national snapshot.
"""
from collections import defaultdict
from datetime import timedelta
import math
from database.db import get_connection
from index_engine.config import METHODOLOGY_VERSION


def _period(date_value, frequency):
    if frequency == "daily":
        return date_value, date_value
    if frequency == "weekly":
        start = date_value - timedelta(days=date_value.weekday())
        return start, start + timedelta(days=6)
    start = date_value.replace(day=1)
    if date_value.month == 12:
        next_month = date_value.replace(year=date_value.year + 1, month=1, day=1)
    else:
        next_month = date_value.replace(month=date_value.month + 1, day=1)
    return start, next_month - timedelta(days=1)


def rebuild_periodic_indices():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT observation_date,index_value,observations_used,route_coverage_ratio FROM national_index_values ORDER BY observation_date,collection_timestamp")
            rows = cur.fetchall()
        grouped = {freq: defaultdict(list) for freq in ("daily","weekly","monthly")}
        for d, value, obs, coverage in rows:
            for freq in grouped:
                start, end = _period(d, freq)
                grouped[freq][start].append((float(value), max(int(obs),1), float(coverage or 0)))
        results=[]
        with conn.cursor() as cur:
            for freq, periods in grouped.items():
                for start, values in periods.items():
                    weights=[v[1] for v in values]
                    total=sum(weights)
                    index=math.exp(sum(w*math.log(v[0]/100.0) for v,w in zip(values,weights))/total)*100.0
                    end=_period(start,freq)[1]
                    coverage=sum(v[2]*w for v,w in zip(values,weights))/total
                    cur.execute("""
                        INSERT INTO periodic_index_values(frequency,period_start,period_end,index_value,source_observations,source_days,route_coverage_ratio,methodology_version)
                        VALUES(%s,%s,%s,%s,%s,%s,%s,%s)
                        ON CONFLICT(frequency,period_start) DO UPDATE SET period_end=EXCLUDED.period_end,index_value=EXCLUDED.index_value,source_observations=EXCLUDED.source_observations,source_days=EXCLUDED.source_days,route_coverage_ratio=EXCLUDED.route_coverage_ratio,methodology_version=EXCLUDED.methodology_version
                    """,(freq,start,end,index,sum(v[1] for v in values),len(values),coverage,METHODOLOGY_VERSION))
                    results.append({"frequency":freq,"period_start":start,"period_end":end,"index":index,"source_days":len(values),"source_observations":sum(v[1] for v in values),"coverage":coverage})
        conn.commit()
    return results


def fetch_periodic(frequency, limit=500):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT period_start,period_end,index_value,source_observations,source_days,route_coverage_ratio,methodology_version FROM periodic_index_values WHERE frequency=%s ORDER BY period_start DESC LIMIT %s",(frequency,limit))
            return cur.fetchall()
