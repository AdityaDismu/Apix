from datetime import date, datetime
import random
import time
import uuid
from typing import Any

from scraper.models import FlightRecord, SourceCapabilities
from scraper.config import (
    ADULTS,
    CURRENCY,
    MAX_RETRIES,
    RATE_LIMIT_SECONDS,
    SEAT_CLASS,
    SOURCE_TIMEOUT_SECONDS,
    TRIP_TYPE,
)
from cleaning.normalizer import normalize_airline


class GoogleFlightsAdapter:
    """Live adapter for the currently verified fast-flights source.

    fast-flights exposes total consumer fare and itinerary information in
    the current implementation. It does not reliably expose a breakdown of
    base fare, taxes, UDF and convenience fee, so those fields remain NULL.
    """

    name = "google_flights"

    capabilities = SourceCapabilities(
        source=name,
        total_fare=True,
        base_fare=False,
        tax_amount=False,
        airport_fee=False,
        udf=False,
        convenience_fee=False,
        flight_number=False,
        baggage=False,
        fare_family=False,
    )

    def capability_metadata(self) -> dict:
        """Return the declared capabilities of this source adapter."""
        return {
            "source": self.capabilities.source,
            "total_fare": self.capabilities.total_fare,
            "base_fare": self.capabilities.base_fare,
            "tax_amount": self.capabilities.tax_amount,
            "airport_fee": self.capabilities.airport_fee,
            "udf": self.capabilities.udf,
            "convenience_fee": self.capabilities.convenience_fee,
            "flight_number": self.capabilities.flight_number,
            "baggage": self.capabilities.baggage,
            "fare_family": self.capabilities.fare_family,
        }

    def _query(self, origin: str, destination: str, travel_date: str):
        from fast_flights import FlightQuery, Passengers, create_query

        return create_query(
            flights=[
                FlightQuery(
                    date=travel_date,
                    from_airport=origin,
                    to_airport=destination,
                )
            ],
            seat=SEAT_CLASS,
            trip=TRIP_TYPE,
            passengers=Passengers(adults=ADULTS),
            currency=CURRENCY,
        )

    def collect(
        self,
        origin,
        destination,
        travel_date,
        pipeline_run_id,
        collection_timestamp,
    ):
        if RATE_LIMIT_SECONDS > 0:
            time.sleep(RATE_LIMIT_SECONDS)

        query = self._query(origin, destination, travel_date)
        last_error: Exception | None = None
        results = None
        started = time.monotonic()

        for attempt in range(MAX_RETRIES + 1):
            try:
                from fast_flights import get_flights

                results = get_flights(query)
                break

            except Exception as exc:
                last_error = exc

                if attempt >= MAX_RETRIES:
                    break

                delay = min(
                    60.0,
                    RATE_LIMIT_SECONDS + (2 ** attempt),
                ) + random.uniform(0, 0.5)

                time.sleep(delay)

            if time.monotonic() - started > SOURCE_TIMEOUT_SECONDS:
                break

        if results is None:
            message = str(last_error or "source returned no result")

            status = (
                "captcha_detected"
                if "captcha" in message.lower()
                else "source_blocked"
                if any(
                    x in message.lower()
                    for x in ("blocked", "forbidden", "403")
                )
                else "source_timeout"
            )

            return [], {
                "status": status,
                "error": message,
                "attempts": MAX_RETRIES + 1,
            }

        travel_date_obj = date.fromisoformat(travel_date)
        advance_days = (
            travel_date_obj - collection_timestamp.date()
        ).days

        records: list[FlightRecord] = []

        for flight in results:
            if not flight.flights:
                continue

            if len(flight.flights) != 1:
                continue

            segment = flight.flights[0]

            dep = segment.departure.time
            arr = segment.arrival.time

            departure_time = f"{dep[0]:02d}:{dep[1]:02d}"
            arrival_time = f"{arr[0]:02d}:{arr[1]:02d}"

            airline = normalize_airline(
                flight.airlines[0]
                if flight.airlines
                else "Unknown"
            )

            records.append(
                FlightRecord(
                    observation_id=str(uuid.uuid4()),
                    pipeline_run_id=pipeline_run_id,
                    source=self.name,
                    collection_timestamp=collection_timestamp.isoformat(),
                    origin=origin,
                    destination=destination,
                    travel_date=travel_date,
                    advance_days=advance_days,
                    airline=airline,
                    flight_number=None,
                    departure_time=departure_time,
                    arrival_time=arrival_time,
                    duration_minutes=int(segment.duration),
                    stops=0,
                    total_fare=float(flight.price),
                    currency=CURRENCY,
                    source_capabilities=self.capability_metadata(),
                )
            )

        status = "success" if records else "no_flights"

        return records, {
            "status": status,
            "records": len(records),
            "capabilities": self.capability_metadata(),
        }