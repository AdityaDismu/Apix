import json
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


BASE_INDEX = float(os.getenv("APIX_BASE_INDEX", "100"))
MIN_OBSERVATIONS = int(os.getenv("APIX_MIN_OBSERVATIONS", "5"))

SUPPORTED_ADVANCE_WINDOWS = [1, 7, 15, 21, 30, 45]

METHODOLOGY_VERSION = "4.0"

COLLECTION_INTERVAL_MINUTES = int(
    os.getenv("APIX_COLLECTION_INTERVAL_MINUTES", "60")
)

MIN_NATIONAL_ROUTE_COVERAGE = float(
    os.getenv("APIX_MIN_NATIONAL_ROUTE_COVERAGE", "0.75")
)

ROUTE_SOURCE = os.getenv("APIX_ROUTE_SOURCE", "dgca")

ROUTE_REFERENCE_PERIOD = os.getenv("APIX_ROUTE_REFERENCE_PERIOD") or None

# The authoritative prototype route basket.
#
# This file contains the 40 directional routes selected from the
# DGCA 2024-25 top bilateral passenger-volume markets.
ROUTES_FILE = Path(
    os.getenv(
        "APIX_ROUTES_FILE",
        "../data/dgca_processed/route_basket_2024_25.json",
    )
)

BACKTEST_FILE = Path(
    os.getenv(
        "APIX_BACKTEST_FILE",
        "data_sources/reference/dgca_fares.csv",
    )
)


def _resolve(path: Path) -> Path:
    """
    Resolve a configured relative path.

    Relative paths are resolved from the backend directory.

    Example:

        ../data/dgca_processed/route_basket_2024_25.json

    resolves to:

        airfare-apix/data/dgca_processed/route_basket_2024_25.json
    """

    if path.is_absolute():
        return path

    backend_root = Path(__file__).resolve().parent.parent
    return (backend_root / path).resolve()


def configured_routes():
    """
    Return the complete configured directional route basket.

    Priority:

    1. APIX_ROUTES_JSON
       Explicit development/emergency override.

    2. Configured DGCA route basket
       The authoritative route basket for the prototype.

       Supported formats:
       - JSON route basket containing a top-level "routes" array
       - JSON containing a direct route array
       - CSV containing origin/destination columns

    3. DEL -> BOM development fallback
       Used only if the configured route file does not exist.

    No airfare observations are fabricated for routes that have
    no collected data.
    """

    # ------------------------------------------------------------------
    # 1. Explicit JSON override
    # ------------------------------------------------------------------

    raw = os.getenv("APIX_ROUTES_JSON")

    if raw:
        try:
            data = json.loads(raw)

            if isinstance(data, dict):
                data = data.get("routes", [])

            if not isinstance(data, list):
                raise TypeError("Route override must be a JSON list.")

            routes = [
                (
                    str(item["origin"]).strip().upper(),
                    str(item["destination"]).strip().upper(),
                )
                for item in data
                if isinstance(item, dict)
                and item.get("active", True)
                and item.get("origin")
                and item.get("destination")
            ]

        except (json.JSONDecodeError, TypeError, KeyError) as exc:
            raise RuntimeError(
                "APIX_ROUTES_JSON is configured but could not be parsed "
                "as a valid route list."
            ) from exc

        if not routes:
            raise RuntimeError(
                "APIX_ROUTES_JSON is configured but contains no active routes."
            )

        return _deduplicate_routes(routes)

    # ------------------------------------------------------------------
    # 2. Authoritative DGCA route basket
    # ------------------------------------------------------------------

    path = _resolve(ROUTES_FILE)

    if path.exists():
        try:
            routes = _load_routes_file(path)
        except Exception as exc:
            raise RuntimeError(
                f"Failed to load configured route basket from: {path}"
            ) from exc

        routes = _deduplicate_routes(routes)

        if not routes:
            raise RuntimeError(
                f"The configured route basket exists but contains no routes: "
                f"{path}"
            )

        return routes

    # ------------------------------------------------------------------
    # 3. Development fallback
    # ------------------------------------------------------------------

    return [("DEL", "BOM")]


def _load_routes_file(path: Path):
    """
    Load routes from the configured reference file.

    The prototype currently uses the DGCA JSON basket:

        route_basket_2024_25.json

    but CSV is also supported for compatibility with older
    development/reference files.
    """

    suffix = path.suffix.lower()

    # --------------------------------------------------------------
    # JSON route basket
    # --------------------------------------------------------------

    if suffix == ".json":
        with path.open("r", encoding="utf-8") as file:
            data = json.load(file)

        # Our DGCA route basket has:
        #
        # {
        #     "reference_period": "2024-25",
        #     ...
        #     "routes": [...]
        # }
        if isinstance(data, dict):
            data = data.get("routes", [])

        if not isinstance(data, list):
            raise ValueError(
                "JSON route basket must contain a 'routes' array."
            )

        routes = []

        for item in data:
            if not isinstance(item, dict):
                continue

            origin = item.get("origin")
            destination = item.get("destination")

            if not origin or not destination:
                continue

            if item.get("active", True) is False:
                continue

            routes.append(
                (
                    str(origin).strip().upper(),
                    str(destination).strip().upper(),
                )
            )

        return routes

    # --------------------------------------------------------------
    # CSV route basket
    # --------------------------------------------------------------

    if suffix == ".csv":
        import csv

        routes = []

        with path.open("r", encoding="utf-8-sig", newline="") as file:
            reader = csv.DictReader(file)

            for row in reader:
                origin = row.get("origin")
                destination = row.get("destination")

                if not origin or not destination:
                    continue

                active = row.get("active")

                if active is not None:
                    active_value = str(active).strip().lower()

                    if active_value in {"false", "0", "no", "inactive"}:
                        continue

                routes.append(
                    (
                        str(origin).strip().upper(),
                        str(destination).strip().upper(),
                    )
                )

        return routes

    raise ValueError(
        f"Unsupported route basket format: {path.suffix}. "
        "Use .json or .csv."
    )


def _deduplicate_routes(routes):
    """
    Remove duplicate directional routes while preserving their order.
    """

    seen = set()
    result = []

    for origin, destination in routes:
        route = (
            str(origin).strip().upper(),
            str(destination).strip().upper(),
        )

        if route in seen:
            continue

        seen.add(route)
        result.append(route)

    return result