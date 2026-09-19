"""
Import legitimate DGCA-derived route passenger-volume weights.

Input CSV:
    origin
    destination
    passenger_volume
    weight
    reference_period
    source
    effective_from

No passenger values are fabricated by this module.
"""

from __future__ import annotations

import csv
from pathlib import Path

from database.db import get_connection


REQUIRED_COLUMNS = {
    "origin",
    "destination",
    "passenger_volume",
    "weight",
    "reference_period",
    "source",
    "effective_from",
}


def import_csv(path):

    path = Path(path)

    if not path.exists():
        raise FileNotFoundError(
            f"Route-weight CSV not found: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8",
        newline="",
    ) as file:

        rows = list(
            csv.DictReader(file)
        )

    if not rows:
        raise ValueError(
            "Route-weight CSV contains no rows."
        )

    missing = (
        REQUIRED_COLUMNS
        - set(rows[0].keys())
    )

    if missing:
        raise ValueError(
            "Missing required columns: "
            f"{sorted(missing)}"
        )

    total_weight = sum(
        float(row["weight"])
        for row in rows
    )

    if abs(total_weight - 1.0) > 0.0001:
        raise ValueError(
            "Route weights must sum to 1. "
            f"Current total = {total_weight}"
        )

    inserted = 0

    with get_connection() as connection:

        with connection.cursor() as cursor:

            for row in rows:

                origin = (
                    row["origin"]
                    .strip()
                    .upper()
                )

                destination = (
                    row["destination"]
                    .strip()
                    .upper()
                )

                if origin == destination:
                    raise ValueError(
                        "Origin and destination "
                        "cannot be identical."
                    )

                passenger_volume = float(
                    row["passenger_volume"]
                )

                weight = float(
                    row["weight"]
                )

                if passenger_volume <= 0:
                    raise ValueError(
                        f"Invalid passenger volume "
                        f"for {origin}-{destination}"
                    )

                if weight <= 0:
                    raise ValueError(
                        f"Invalid route weight "
                        f"for {origin}-{destination}"
                    )

                cursor.execute(
                    """
                    INSERT INTO route_weights (
                        origin,
                        destination,
                        weight,
                        source,
                        reference_period,
                        passenger_volume,
                        effective_from
                    )
                    VALUES (
                        %s, %s, %s, %s,
                        %s, %s, %s
                    )
                    ON CONFLICT (
                        origin,
                        destination,
                        reference_period
                    )
                    DO UPDATE SET
                        weight =
                            EXCLUDED.weight,
                        source =
                            EXCLUDED.source,
                        passenger_volume =
                            EXCLUDED.passenger_volume,
                        effective_from =
                            EXCLUDED.effective_from
                    """,
                    (
                        origin,
                        destination,
                        weight,
                        row["source"],
                        row["reference_period"],
                        passenger_volume,
                        row["effective_from"],
                    ),
                )

                inserted += 1

        connection.commit()

    return {
        "inserted": inserted,
        "weight_total": total_weight,
    }


if __name__ == "__main__":

    import argparse

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--input",
        required=True,
    )

    args = parser.parse_args()

    result = import_csv(
        args.input
    )

    print()
    print("=" * 70)
    print("DGCA ROUTE WEIGHT IMPORT")
    print("=" * 70)

    print(
        f"Routes imported : "
        f"{result['inserted']}"
    )

    print(
        f"Weight total    : "
        f"{result['weight_total']:.6f}"
    )

    print()
    print("STATUS: SUCCESS")