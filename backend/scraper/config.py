from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
RAW_DATA_DIR = PROJECT_ROOT / "data" / "raw"

SOURCE = os.getenv("APIX_FARE_SOURCE", "google_flights")
CURRENCY = "INR"
SEAT_CLASS = "economy"
TRIP_TYPE = "one-way"
ADULTS = 1
ADVANCE_WINDOWS = [1, 7, 15, 21, 30, 45]
NON_STOP_ONLY = os.getenv("APIX_NON_STOP_ONLY", "true").lower() == "true"
MAX_RETRIES = max(0, int(os.getenv("APIX_MAX_RETRIES", "3")))
RATE_LIMIT_SECONDS = max(0.0, float(os.getenv("APIX_RATE_LIMIT_SECONDS", "1")))
SOURCE_TIMEOUT_SECONDS = max(5.0, float(os.getenv("APIX_SOURCE_TIMEOUT_SECONDS", "45")))
