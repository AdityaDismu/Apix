import math
from database.db import get_connection


def lead_time_elasticity(origin, destination):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT advance_days, percentile_cont(0.5) WITHIN GROUP(ORDER BY total_fare) AS median_fare, COUNT(*)
                FROM airfare_observations
                WHERE origin=%s AND destination=%s AND quality_status='valid' AND currency='INR'
                GROUP BY advance_days ORDER BY advance_days
            """,(origin.upper(),destination.upper()))
            rows=cur.fetchall()
    if len(rows)<2: return {"status":"insufficient_data","points":[]}
    points=[{"advance_days":int(a),"median_fare":float(f),"observations":int(n)} for a,f,n in rows]
    logs=[(math.log(p["advance_days"]),math.log(p["median_fare"])) for p in points if p["advance_days"]>0 and p["median_fare"]>0]
    if len(logs)<2: return {"status":"insufficient_data","points":points}
    mx=sum(x for x,_ in logs)/len(logs); my=sum(y for _,y in logs)/len(logs)
    beta=sum((x-mx)*(y-my) for x,y in logs)/sum((x-mx)**2 for x,_ in logs)
    return {"status":"success","elasticity":beta,"interpretation":"Approximate log-log airfare elasticity with respect to advance-purchase days; observational, not causal.","points":points}
