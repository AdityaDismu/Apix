from dataclasses import dataclass, asdict
from typing import Any, Optional


@dataclass
class SourceCapabilities:
    source: str
    total_fare: bool = True
    base_fare: bool = False
    tax_amount: bool = False
    airport_fee: bool = False
    udf: bool = False
    convenience_fee: bool = False
    flight_number: bool = False
    baggage: bool = False
    fare_family: bool = False

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class FlightRecord:
    observation_id: str
    pipeline_run_id: Optional[str]
    source: str
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
    total_fare: float
    currency: str
    base_fare: Optional[float] = None
    tax_amount: Optional[float] = None
    airport_fee: Optional[float] = None
    udf: Optional[float] = None
    convenience_fee: Optional[float] = None
    other_mandatory_fee: Optional[float] = None
    fare_components_complete: bool = False
    fare_class: str = "economy"
    trip_type: str = "one-way"
    availability: str = "available"
    source_capabilities: Optional[dict[str, Any]] = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
