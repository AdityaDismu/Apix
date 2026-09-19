from collections import defaultdict
from index_engine.basket import build_snapshot_indices
from index_engine.calculations import calculate_weighted_jevons
from index_engine.config import BASE_INDEX, METHODOLOGY_VERSION, MIN_NATIONAL_ROUTE_COVERAGE
from index_engine.repository import fetch_observations, save_snapshot, save_route_index, fetch_route_weights, save_national_index


def calculate_lead_time_snapshot_indices(origin,destination,pipeline_run_id=None):
    rows=build_snapshot_indices(fetch_observations(origin,destination))
    for r in rows: save_snapshot(r,pipeline_run_id)
    return rows


def calculate_route_indices(origin,destination,pipeline_run_id=None):
    rows=calculate_lead_time_snapshot_indices(origin,destination,pipeline_run_id)
    grouped=defaultdict(list)
    for r in rows: grouped[r['collection_timestamp']].append(r)
    out=[]
    for ts, vals in sorted(grouped.items()):
        if not vals: continue
        idx=calculate_weighted_jevons([v['index'] for v in vals],[1.0]*len(vals),BASE_INDEX)
        coverage=sum(v['coverage_ratio'] for v in vals)/len(vals)
        result={'origin':origin,'destination':destination,'collection_timestamp':ts,'observation_date':ts.date() if hasattr(ts,'date') else ts,'index':idx,'lead_time_windows':len(vals),'observations_used':sum(v['observations_used'] for v in vals),'coverage_ratio':coverage,'methodology_version':METHODOLOGY_VERSION}
        save_route_index(result,pipeline_run_id); out.append(result)
    return out


def calculate_national_index(route_results, reference_period=None, pipeline_run_id=None):
    weights=fetch_route_weights(reference_period)
    if not weights: return []
    weight_map={(r[0].strip(),r[1].strip()):(float(r[2]),r[3]) for r in weights}
    selected_period = weights[0][3] if weights else reference_period
    expected=len(weight_map)
    grouped=defaultdict(list)
    for r in route_results:
        key=(r['origin'].strip(),r['destination'].strip())
        if key in weight_map: grouped[r['collection_timestamp']].append((r,weight_map[key][0]))
    out=[]
    for ts,items in sorted(grouped.items()):
        coverage=len(items)/expected if expected else 0
        if coverage < MIN_NATIONAL_ROUTE_COVERAGE: continue
        idx=calculate_weighted_jevons([x[0]['index'] for x in items],[x[1] for x in items],BASE_INDEX)
        result={'collection_timestamp':ts,'observation_date':ts.date() if hasattr(ts,'date') else ts,'index':idx,'routes_used':len(items),'routes_expected':expected,'route_coverage_ratio':coverage,'observations_used':sum(x[0]['observations_used'] for x in items),'weight_reference_period':selected_period,'methodology_version':METHODOLOGY_VERSION}
        save_national_index(result,pipeline_run_id); out.append(result)
    return out
