from database.db import get_connection

def report():
    with get_connection() as c:
        with c.cursor() as cur:
            queries={
                'collection_runs':'SELECT COUNT(*) FROM collection_runs',
                'observations':'SELECT COUNT(*) FROM airfare_observations',
                'valid_observations':"SELECT COUNT(*) FROM airfare_observations WHERE quality_status='valid'",
                'flagged_observations':"SELECT COUNT(*) FROM airfare_observations WHERE quality_status='flagged'",
                'snapshot_indices':'SELECT COUNT(*) FROM index_snapshots',
                'route_indices':'SELECT COUNT(*) FROM route_index_values',
                'national_indices':'SELECT COUNT(*) FROM national_index_values',
                'routes':'SELECT COUNT(*) FROM routes WHERE active=true',
                'route_weights':'SELECT COUNT(*) FROM route_weights',
            }
            return {k:(cur.execute(q),cur.fetchone()[0])[1] for k,q in queries.items()}
if __name__=='__main__':
    for k,v in report().items(): print(f'{k:24}: {v}')
