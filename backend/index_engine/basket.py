from collections import defaultdict
from index_engine.calculations import calculate_price_relative, calculate_jevons_from_relatives
from index_engine.config import BASE_INDEX, MIN_OBSERVATIONS, METHODOLOGY_VERSION


KEYS = ["observation_id","collection_timestamp","origin","destination","travel_date","advance_days","airline","flight_number","departure_time","arrival_time","duration_minutes","total_fare","currency","flight_instance_id","fare_match_key"]


def row_to_dict(row):
    d = dict(zip(KEYS, row))
    d["total_fare"] = float(d["total_fare"])
    return d


def group_snapshots(rows):
    groups = defaultdict(lambda: defaultdict(dict))
    for row in rows:
        o = row_to_dict(row)
        match_key = o.get("fare_match_key") or o.get("flight_instance_id")
        if not match_key:
            continue
        o["fare_match_key"] = match_key
        group_key = (o["origin"], o["destination"], o["advance_days"])
        ts = o["collection_timestamp"]
        groups[group_key][ts][o["fare_match_key"]] = o
    return groups


def calculate_snapshot(base, current):
    common = sorted(set(base) & set(current))
    if len(common) >= MIN_OBSERVATIONS:
        relatives = [calculate_price_relative(current[k]["total_fare"], base[k]["total_fare"]) for k in common]
        return calculate_jevons_from_relatives(relatives, BASE_INDEX), len(current), len(common), "matched_jevons"

    if len(base) >= MIN_OBSERVATIONS and len(current) >= MIN_OBSERVATIONS:
        # Fallback preserves real-time movement when a source changes its
        # itinerary identifiers. It compares the current and base cross-
        # sectional median consumer fare for the same route/lead-time basket.
        base_prices = sorted(v["total_fare"] for v in base.values())
        current_prices = sorted(v["total_fare"] for v in current.values())
        b = base_prices[len(base_prices)//2] if len(base_prices)%2 else (base_prices[len(base_prices)//2-1]+base_prices[len(base_prices)//2])/2
        c = current_prices[len(current_prices)//2] if len(current_prices)%2 else (current_prices[len(current_prices)//2-1]+current_prices[len(current_prices)//2])/2
        return calculate_jevons_from_relatives([calculate_price_relative(c,b)], BASE_INDEX), len(current), len(common), "median_level_jevons"
    return None


def build_snapshot_indices(rows):
    results = []
    for group_key, snapshots in group_snapshots(rows).items():
        timestamps = sorted(snapshots)
        base_ts = timestamps[0]
        base = snapshots[base_ts]
        if len(base) < MIN_OBSERVATIONS:
            continue
        for ts in timestamps:
            current = snapshots[ts]
            if ts == base_ts:
                value, used, matched, method = BASE_INDEX, len(current), len(current), "base_snapshot"
            else:
                result = calculate_snapshot(base, current)
                if result is None:
                    continue
                value, used, matched, method = result
            results.append({
                "origin": group_key[0], "destination": group_key[1], "advance_days": group_key[2],
                "travel_date": min(v["travel_date"] for v in current.values()),
                "collection_timestamp": ts, "index": value, "observations_used": used,
                "matched_observations": matched, "coverage_ratio": matched / used if used else 0,
                "calculation_method": method, "base_snapshot_timestamp": base_ts,
                "methodology_version": METHODOLOGY_VERSION,
            })
    return results
