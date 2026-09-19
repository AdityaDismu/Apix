from pathlib import Path
import csv
import tempfile
from data_sources.dgca_routes import load_route_basket


def test_route_weights_are_normalized_from_supplied_data():
    with tempfile.TemporaryDirectory() as d:
        path=Path(d)/"routes.csv"
        path.write_text("origin,destination,passenger_volume,reference_period,source,effective_from\nDEL,BOM,60,2026Q2,DGCA,2026-04-01\nDEL,BLR,40,2026Q2,DGCA,2026-04-01\n",encoding="utf-8")
        rows=load_route_basket(path)
        assert len(rows)==2
        assert abs(sum(r["weight"] for r in rows)-1)<1e-12
        assert rows[0]["weight"]==0.6
