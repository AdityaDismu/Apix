"""Compatibility wrapper around the canonical IQR outlier detector."""
from cleaning.cleaner import detect_price_outliers as _detect

def detect_price_outliers(records):
    _detect(records)
    return records
