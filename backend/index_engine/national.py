from index_engine.config import configured_routes
from index_engine.route_index import calculate_route_indices, calculate_national_index

def rebuild_all(pipeline_run_id=None, reference_period=None):
    route_results=[]
    for origin,destination in configured_routes():
        route_results.extend(calculate_route_indices(origin,destination,pipeline_run_id))
    return calculate_national_index(route_results,reference_period,pipeline_run_id)
