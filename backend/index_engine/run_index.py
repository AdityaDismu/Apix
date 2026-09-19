import argparse
from index_engine.config import configured_routes
from index_engine.route_index import calculate_route_indices,calculate_national_index

def main():
    p=argparse.ArgumentParser(); p.add_argument('--origin'); p.add_argument('--destination'); p.add_argument('--national',action='store_true'); p.add_argument('--reference-period'); a=p.parse_args()
    routes=[(a.origin.upper(),a.destination.upper())] if a.origin and a.destination else configured_routes(); all_results=[]
    for o,d in routes:
        results=calculate_route_indices(o,d); all_results.extend(results); print(f"{o}-{d}: {len(results)} snapshots")
    if a.national:
        national=calculate_national_index(all_results,a.reference_period); print(f"National snapshots: {len(national)}")

if __name__=='__main__': main()
