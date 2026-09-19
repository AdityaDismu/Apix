from pathlib import Path


# ============================================================
# PROJECT PATHS
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent

DGCA_RAW_DIR = PROJECT_ROOT / "data" / "dgca_raw"
DGCA_PROCESSED_DIR = PROJECT_ROOT / "data" / "dgca_processed"


# ============================================================
# INPUT FILES
# ============================================================

CITY_PAIR_PDF = (
    DGCA_RAW_DIR
    / "TABLE 5.01 (INDIAN CITY-WISE PASSENGER TRAFFIC).xlsx"
)

AIRLINE_PDF = (
    DGCA_RAW_DIR
    / "TABLE 4.01 (AIRLINES WISE DOMESTIC TRAFFIC STATISTICS).xlsx"
)


# ============================================================
# OUTPUT FILES
# ============================================================

CITY_PAIR_CSV = (
    DGCA_PROCESSED_DIR
    / "city_pair_passenger_2024_25.csv"
)

DIRECTIONAL_ROUTES_CSV = (
    DGCA_PROCESSED_DIR
    / "directional_route_weights_2024_25.csv"
)

ROUTE_BASKET_JSON = (
    DGCA_PROCESSED_DIR
    / "route_basket_2024_25.json"
)

AIRLINE_METRICS_JSON = (
    DGCA_PROCESSED_DIR
    / "airline_metrics_2024_25.json"
)

VALIDATION_JSON = (
    DGCA_PROCESSED_DIR
    / "dgca_validation_2024_25.json"
)


# ============================================================
# REFERENCE PERIOD
# ============================================================

REFERENCE_PERIOD = "2024-25"

EFFECTIVE_FROM = "2024-04-01"


# ============================================================
# ROUTE BASKET
# ============================================================

# Top bilateral markets to include.
#
# Each bilateral market creates TWO directional airfare routes.
#
# Example:
#
# DEL ↔ BOM
#
# becomes:
#
# DEL → BOM
# BOM → DEL

TOP_BILATERAL_ROUTES = 20


def ensure_directories():
    DGCA_RAW_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    DGCA_PROCESSED_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )