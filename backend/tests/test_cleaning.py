from cleaning.cleaner import clean_data


def test_cleaner_preserves_unavailable_fare_components():
    raw={
        "source":"google_flights","pipeline_run_id":"x",
        "origin":"DEL","destination":"BOM","travel_date":"2026-10-01","advance_days":21,
        "collection_timestamp":"2026-09-10T10:00:00+05:30",
        "flights":[{"observation_id":"00000000-0000-0000-0000-000000000001","source":"google_flights","origin":"DEL","destination":"BOM","travel_date":"2026-10-01","advance_days":21,"airline":"IndiGo","flight_number":None,"departure_time":"10:00","arrival_time":"12:00","duration_minutes":120,"stops":0,"total_fare":6000,"currency":"INR"}]
    }
    out=clean_data(raw)
    obs=out["observations"][0]
    assert obs["total_fare"]==6000
    assert obs["base_fare"] is None
    assert obs["fare_components_complete"] is False
    assert obs["fare_match_key"]


def test_cleaner_preserves_source_failure_status():
    raw={"source":"google_flights","collection_status":"source_blocked","origin":"DEL","destination":"BOM","travel_date":"2026-10-01","advance_days":21,"collection_timestamp":"2026-09-10T10:00:00+05:30","flights":[]}
    out=clean_data(raw)
    assert out["status"]=="source_blocked"
