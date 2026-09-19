from dataclasses import dataclass
from typing import Optional

@dataclass
class CleanFare:
    observation_id: str
    source: str
    source_type: str
    collection_timestamp: str
    origin: str
    destination: str
    travel_date: str
    advance_days: int
    airline: str
    flight_number: Optional[str]
    departure_time: str
    arrival_time: str
    duration_minutes: int
    stops: int
    fare_class: str
    trip_type: str
    base_fare: Optional[float]
    taxes: Optional[float]
    mandatory_charges: Optional[float]
    total_fare: float
    currency: str
    availability: str
    flight_instance_id: str
    quality_status: str
    quality_flags: list[str]
