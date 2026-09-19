"""Compatibility wrapper around the canonical cleaner deduplicator."""
from cleaning.cleaner import deduplicate

def deduplicate_records(records):
    return deduplicate(records)
