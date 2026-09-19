"""Backward-compatible entry point for the Phase-3 index builder.
The Phase-4/5+ implementation now lives in basket.py and route_index.py.
"""
from index_engine.route_index import calculate_lead_time_snapshot_indices

def calculate_lead_time_indices(origin,destination):
    return calculate_lead_time_snapshot_indices(origin,destination)
