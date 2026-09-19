from database.db import get_connection
from index_engine.calculations import percent_change


def route_change_matrix():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                WITH ranked AS (
                  SELECT origin,destination,index_value,collection_timestamp,
                         LAG(index_value) OVER(PARTITION BY origin,destination ORDER BY collection_timestamp) AS previous
                  FROM route_index_values
                )
                SELECT origin,destination,index_value,previous,(index_value/NULLIF(previous,0)-1)*100 AS change_pct,collection_timestamp
                FROM ranked WHERE previous IS NOT NULL
                ORDER BY change_pct DESC
            """)
            rows=cur.fetchall()
    return [{"origin":r[0].strip(),"destination":r[1].strip(),"index":float(r[2]),"previous_index":float(r[3]),"change_pct":float(r[4]),"collection_timestamp":r[5]} for r in rows]
