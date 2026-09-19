
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import date, timedelta
from pathlib import Path

from data_sources.dgca_routes import load_route_basket
from scraper.collector import collect_flights
from scraper.config import (
    ADVANCE_WINDOWS,
    RATE_LIMIT_SECONDS,
    RAW_DATA_DIR,
)
from scraper.storage import save_collection
from scraper.validator import validate_records


# ============================================================
# PROJECT PATHS
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent

DEFAULT_ROUTE_FILE = (
    PROJECT_ROOT
    / "data"
    / "dgca_processed"
    / "route_basket_2024_25.json"
)


# ============================================================
# LOAD DGCA ROUTES
# ============================================================

def load_routes(route_file: Path) -> list[dict]:
    if not route_file.exists():
        raise FileNotFoundError(
            f"DGCA route basket not found: {route_file}"
        )

    return load_route_basket(
        route_file,
        min_routes=1,
    )


# ============================================================
# CALCULATE TRAVEL DATE
# ============================================================

def travel_date_for_advance(
    advance_days: int,
) -> str:
    return (
        date.today()
        + timedelta(days=advance_days)
    ).isoformat()


# ============================================================
# CHECK WHETHER COLLECTION ALREADY EXISTS
# ============================================================

def find_existing_collection(
    origin: str,
    destination: str,
    advance_days: int,
    travel_date: str,
) -> Path | None:

    pattern = (
        f"{origin}_{destination}"
        f"_T{advance_days}_{travel_date}_*.json"
    )

    candidates = sorted(
        RAW_DATA_DIR.glob(pattern),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )

    for path in candidates:

        try:
            payload = json.loads(
                path.read_text(
                    encoding="utf-8"
                )
            )

        except (OSError, json.JSONDecodeError):
            continue

        status = payload.get(
            "collection_status"
        )

        if status == "success":
            return path

    return None


# ============================================================
# COLLECT ONE ROUTE / LEAD-TIME WINDOW
# ============================================================

def collect_route_window(
    route: dict,
    advance_days: int,
) -> dict:

    origin = route["origin"]
    destination = route["destination"]

    travel_date = travel_date_for_advance(
        advance_days
    )

    print()
    print("-" * 70)
    print(
        f"COLLECTING {origin} → {destination}"
    )
    print(
        f"Advance window : T+{advance_days}"
    )
    print(
        f"Travel date    : {travel_date}"
    )
    print("-" * 70)

    # --------------------------------------------------------
    # RESUME CHECK
    # --------------------------------------------------------

    existing_file = find_existing_collection(
        origin=origin,
        destination=destination,
        advance_days=advance_days,
        travel_date=travel_date,
    )

    if existing_file is not None:

        print(
            "SKIPPED: successful collection already exists"
        )

        print(
            f"Existing file  : {existing_file.name}"
        )

        return {
            "origin": origin,
            "destination": destination,
            "advance_days": advance_days,
            "travel_date": travel_date,
            "raw_records": 0,
            "valid_records": 0,
            "rejected_records": 0,
            "status": "skipped_existing",
            "output_file": str(existing_file),
            "elapsed_seconds": 0.0,
        }

    # --------------------------------------------------------
    # REAL COLLECTION
    # --------------------------------------------------------

    started = time.perf_counter()

    try:

        records, collection_timestamp, metadata = (
            collect_flights(
                origin=origin,
                destination=destination,
                travel_date=travel_date,
            )
        )

        # ----------------------------------------------------
        # VALIDATE
        # ----------------------------------------------------

        valid_records, rejected_records = (
            validate_records(records)
        )

        # ----------------------------------------------------
        # STATUS
        # ----------------------------------------------------

        if valid_records:
            status = "success"

        else:
            status = "no_flights"

        # ----------------------------------------------------
        # SAVE
        # ----------------------------------------------------

        output_file = save_collection(
            records=valid_records,
            rejected_records=rejected_records,
            output_directory=RAW_DATA_DIR,
            origin=origin,
            destination=destination,
            travel_date=travel_date,
            advance_days=advance_days,
            collection_timestamp=(
                collection_timestamp.isoformat()
            ),
            status=status,
            pipeline_run_id=None,
            source=metadata.get(
                "source",
                "google_flights",
            ),
            metadata=metadata,
        )

        elapsed = (
            time.perf_counter()
            - started
        )

        # ----------------------------------------------------
        # RESULT
        # ----------------------------------------------------

        print(
            f"Raw records      : {len(records)}"
        )

        print(
            f"Valid records    : {len(valid_records)}"
        )

        print(
            f"Rejected records : {len(rejected_records)}"
        )

        print(
            f"Status           : {status}"
        )

        print(
            f"Saved            : {output_file.name}"
        )

        print(
            f"Time             : {elapsed:.2f}s"
        )

        return {
            "origin": origin,
            "destination": destination,
            "advance_days": advance_days,
            "travel_date": travel_date,
            "raw_records": len(records),
            "valid_records": len(valid_records),
            "rejected_records": len(rejected_records),
            "status": status,
            "output_file": str(output_file),
            "elapsed_seconds": round(
                elapsed,
                2,
            ),
        }

    except KeyboardInterrupt:
        raise

    except Exception as exc:

        elapsed = (
            time.perf_counter()
            - started
        )

        print(
            f"ERROR: {type(exc).__name__}: {exc}"
        )

        return {
            "origin": origin,
            "destination": destination,
            "advance_days": advance_days,
            "travel_date": travel_date,
            "raw_records": 0,
            "valid_records": 0,
            "rejected_records": 0,
            "status": "source_error",
            "error": str(exc),
            "elapsed_seconds": round(
                elapsed,
                2,
            ),
        }


# ============================================================
# COLLECT BASKET
# ============================================================

def collect_basket(
    routes: list[dict],
    limit: int | None = None,
) -> list[dict]:

    if limit is not None:
        routes = routes[:limit]

    total_jobs = (
        len(routes)
        * len(ADVANCE_WINDOWS)
    )

    print()
    print("=" * 70)
    print("APIx DGCA ROUTE BASKET COLLECTION")
    print("=" * 70)

    print(
        f"Routes selected : {len(routes)}"
    )

    print(
        f"Advance windows : {ADVANCE_WINDOWS}"
    )

    print(
        f"Collection jobs : {total_jobs}"
    )

    results = []

    completed = 0

    # --------------------------------------------------------
    # ROUTE LOOP
    # --------------------------------------------------------

    for route in routes:

        for advance_days in ADVANCE_WINDOWS:

            completed += 1

            print()
            print(
                f"[{completed}/{total_jobs}]"
            )

            result = collect_route_window(
                route=route,
                advance_days=advance_days,
            )

            results.append(result)

            # ------------------------------------------------
            # RATE LIMIT
            # ------------------------------------------------

            if (
                result["status"]
                not in {
                    "skipped_existing",
                    "source_error",
                }
                and RATE_LIMIT_SECONDS > 0
            ):
                time.sleep(
                    RATE_LIMIT_SECONDS
                )

    return results


# ============================================================
# SUMMARY
# ============================================================

def print_summary(
    results: list[dict],
):

    total_jobs = len(results)

    successful = sum(
        result["status"] == "success"
        for result in results
    )

    skipped = sum(
        result["status"] == "skipped_existing"
        for result in results
    )

    no_flights = sum(
        result["status"] == "no_flights"
        for result in results
    )

    source_errors = sum(
        result["status"] == "source_error"
        for result in results
    )

    raw_records = sum(
        result["raw_records"]
        for result in results
    )

    valid_records = sum(
        result["valid_records"]
        for result in results
    )

    rejected_records = sum(
        result["rejected_records"]
        for result in results
    )

    print()
    print("=" * 70)
    print("DGCA BASKET COLLECTION SUMMARY")
    print("=" * 70)

    print(
        f"Collection jobs : {total_jobs}"
    )

    print(
        f"Successful      : {successful}"
    )

    print(
        f"Skipped existing: {skipped}"
    )

    print(
        f"No flights      : {no_flights}"
    )

    print(
        f"Source errors   : {source_errors}"
    )

    print(
        f"Raw records     : {raw_records}"
    )

    print(
        f"Valid records   : {valid_records}"
    )

    print(
        f"Rejected records: {rejected_records}"
    )

    print()

    if source_errors == 0:
        print("STATUS: SUCCESS")

    elif (
        successful > 0
        or skipped > 0
    ):
        print("STATUS: PARTIAL SUCCESS")

    else:
        print("STATUS: FAILED")


# ============================================================
# MAIN
# ============================================================

def main():

    parser = argparse.ArgumentParser(
        description=(
            "Collect real airfare observations "
            "for the DGCA-derived APIx route basket."
        )
    )

    parser.add_argument(
        "--routes",
        type=str,
        default=str(DEFAULT_ROUTE_FILE),
        help=(
            "Path to the DGCA route basket JSON."
        ),
    )

    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help=(
            "Limit the number of routes "
            "for a controlled test."
        ),
    )

    args = parser.parse_args()

    route_file = Path(
        args.routes
    ).resolve()

    try:

        # ----------------------------------------------------
        # LOAD ROUTES
        # ----------------------------------------------------

        routes = load_routes(
            route_file
        )

        print()
        print(
            f"DGCA route basket loaded: "
            f"{len(routes)} routes"
        )

        # ----------------------------------------------------
        # APPLY TEST LIMIT
        # ----------------------------------------------------

        if args.limit is not None:

            if args.limit <= 0:
                raise ValueError(
                    "--limit must be greater than zero."
                )

            if args.limit > len(routes):
                raise ValueError(
                    f"--limit {args.limit} exceeds "
                    f"available routes ({len(routes)})."
                )

            print(
                f"Test limit applied: "
                f"{args.limit} routes"
            )

        # ----------------------------------------------------
        # COLLECT
        # ----------------------------------------------------

        results = collect_basket(
            routes=routes,
            limit=args.limit,
        )

        # ----------------------------------------------------
        # SUMMARY
        # ----------------------------------------------------

        print_summary(
            results
        )

    except KeyboardInterrupt:

        print()
        print(
            "Collection interrupted by user."
        )
        print(
            "Existing successful collections "
            "were preserved."
        )

        sys.exit(130)

    except Exception as exc:

        print()
        print("=" * 70)
        print("BASKET COLLECTION FAILED")
        print("=" * 70)

        print(
            f"{type(exc).__name__}: {exc}"
        )

        sys.exit(1)


if __name__ == "__main__":
    main()

