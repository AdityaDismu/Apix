from scraper.adapters import FareSourceAdapter, GoogleFlightsAdapter


_ADAPTERS: dict[str, FareSourceAdapter] = {
    "google_flights": GoogleFlightsAdapter(),
}


def get_adapter(source: str) -> FareSourceAdapter:
    try:
        return _ADAPTERS[source]
    except KeyError as exc:
        raise ValueError(
            f"No implemented authorized adapter for source '{source}'. "
            f"Available adapters: {', '.join(sorted(_ADAPTERS))}"
        ) from exc


def source_capabilities() -> list[dict]:
    return [adapter.capability_metadata() for adapter in _ADAPTERS.values()]
