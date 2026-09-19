"""Validated loader for externally published DGCA route/passenger data.

The loader never invents passenger volumes or routes. It accepts CSV/XLSX/JSON
files that have been obtained from a legitimate DGCA publication/export.
Required fields: origin, destination, passenger_volume, reference_period,
source, effective_from.
"""
from pathlib import Path
import csv
import json
from datetime import date


def _rows(path):
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(path)
    if path.suffix.lower() == ".json":
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else data.get("routes", [])
    if path.suffix.lower() in {".xlsx", ".xls"}:
        import pandas as pd
        return pd.read_excel(path).to_dict("records")
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def load_route_basket(path, min_routes=1):
    rows = _rows(path)
    required = {"origin", "destination", "passenger_volume", "reference_period", "source", "effective_from"}
    if rows and not required.issubset(rows[0]):
        raise ValueError(f"Route file is missing columns: {sorted(required - set(rows[0]))}")
    cleaned = []
    for row in rows:
        origin = str(row["origin"]).strip().upper()
        destination = str(row["destination"]).strip().upper()
        volume = float(row["passenger_volume"])
        if len(origin) != 3 or len(destination) != 3 or origin == destination or volume <= 0:
            raise ValueError(f"Invalid route row: {row}")
        cleaned.append({
            "origin": origin, "destination": destination,
            "passenger_volume": volume,
            "reference_period": str(row["reference_period"]).strip(),
            "source": str(row["source"]).strip(),
            "effective_from": str(row["effective_from"]).strip(),
            "effective_to": str(row.get("effective_to") or "").strip() or None,
            "route_name": str(row.get("route_name") or f"{origin} → {destination}"),
        })
    if len(cleaned) < min_routes:
        raise ValueError("DGCA route basket contains fewer routes than required.")
    by_period = {}
    for row in cleaned:
        by_period.setdefault(row["reference_period"], []).append(row)
    for period, items in by_period.items():
        total = sum(x["passenger_volume"] for x in items)
        if total <= 0:
            raise ValueError(f"Non-positive passenger volume total for {period}")
        for item in items:
            item["weight"] = item["passenger_volume"] / total
        if abs(sum(x["weight"] for x in items) - 1.0) > 1e-9:
            raise ValueError(f"Route weights do not sum to one for {period}")
    return cleaned
