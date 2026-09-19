from __future__ import annotations

import json

from .airline_parser import parse_airline_pdf
from .config import (
    AIRLINE_PDF,
    CITY_PAIR_PDF,
    VALIDATION_JSON,
    ensure_directories,
)
from .pdf_parser import (
    EXPECTED_RECORDS,
    EXPECTED_TOTAL_PASSENGERS,
    KNOWN_SOURCE_ANOMALIES,
    parse_city_pair_pdf,
)
from .route_basket import build_route_basket


EXPECTED_INDUSTRY_PASSENGERS = EXPECTED_TOTAL_PASSENGERS
EXPECTED_ANALYTICAL_PASSENGERS = (
    EXPECTED_INDUSTRY_PASSENGERS - 2
)


def main():

    print()
    print("=" * 70)
    print("APIx DGCA 2024-25 DATASET BUILDER")
    print("=" * 70)

    ensure_directories()

    print()
    print("[1/5] Parsing DGCA city-pair traffic...")

    city_rows = parse_city_pair_pdf(
        CITY_PAIR_PDF
    )

    print(
        f"Extracted city-pair rows: "
        f"{len(city_rows)}"
    )

    print()
    print("[2/5] Validating passenger totals...")

    total_passengers = sum(
        row["passengers_to_city_2"]
        + row["passengers_from_city_2"]
        for row in city_rows
    )

    print(
        f"City-pair passenger total: "
        f"{total_passengers:,}"
    )

    print(
        f"DGCA airline-table total: "
        f"{EXPECTED_INDUSTRY_PASSENGERS:,}"
    )

    print(
        f"Expected analytical total: "
        f"{EXPECTED_ANALYTICAL_PASSENGERS:,}"
    )

    total_match = (
        total_passengers
        == EXPECTED_ANALYTICAL_PASSENGERS
    )

    print(
        "TOTAL CROSS-CHECK:",
        "PASS" if total_match else "FAIL",
    )

    if not total_match:
        raise RuntimeError(
            "DGCA city-pair passenger total "
            "does not match the analytical total."
        )

    print()
    print("[3/5] Building route basket...")

    routes = build_route_basket(
        city_rows
    )

    print(
        f"Directional routes created: "
        f"{len(routes)}"
    )

    selected_volume = sum(
        route["passenger_volume"]
        for route in routes
    )

    coverage = (
        selected_volume
        / total_passengers
        * 100
    )

    print(
        f"Basket traffic coverage: "
        f"{coverage:.2f}%"
    )

    print()
    print("[4/5] Reading airline statistics...")

    airline_result = parse_airline_pdf(
        AIRLINE_PDF
    )

    print(
        f"Airlines detected: "
        f"{airline_result['airlines_found']}"
    )

    print()
    print("[5/5] Writing validation report...")

    validation = {
        "reference_period":
            "2024-25",

        "source_record_count":
            EXPECTED_RECORDS,

        "known_source_anomalies":
            sorted(KNOWN_SOURCE_ANOMALIES),

        "city_pair_rows":
            len(city_rows),

        "city_pair_total_passengers":
            total_passengers,

        "airline_table_total_passengers":
            EXPECTED_INDUSTRY_PASSENGERS,

        "analytical_total_passengers":
            EXPECTED_ANALYTICAL_PASSENGERS,

        "excluded_source_passengers":
            EXPECTED_INDUSTRY_PASSENGERS
            - EXPECTED_ANALYTICAL_PASSENGERS,

        "total_cross_check":
            total_match,

        "directional_routes":
            len(routes),

        "basket_passenger_volume":
            selected_volume,

        "basket_traffic_coverage_percent":
            round(coverage, 4),

        "airlines_detected":
            airline_result["airlines_found"],

        "status":
            "success",
    }

    VALIDATION_JSON.write_text(
        json.dumps(
            validation,
            indent=2,
        ),
        encoding="utf-8",
    )

    print()
    print("=" * 70)
    print("DGCA DATASET BUILD SUCCESS")
    print("=" * 70)

    print(
        f"Source records    : {EXPECTED_RECORDS}"
    )

    print(
        f"Valid city pairs  : {len(city_rows)}"
    )

    print(
        f"Total passengers  : "
        f"{total_passengers:,}"
    )

    print(
        f"Directional routes: "
        f"{len(routes)}"
    )

    print(
        f"Basket coverage   : "
        f"{coverage:.2f}%"
    )

    print()
    print("STATUS: SUCCESS")


if __name__ == "__main__":
    main()