from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any

from scraper.models import FlightRecord, SourceCapabilities


class FareSourceAdapter(ABC):
    """Contract implemented by every authorized fare source."""

    name: str
    capabilities: SourceCapabilities

    @abstractmethod
    def collect(
        self,
        origin: str,
        destination: str,
        travel_date: str,
        pipeline_run_id: str | None,
        collection_timestamp: datetime,
    ) -> tuple[list[FlightRecord], dict[str, Any]]:
        raise NotImplementedError

    def capability_metadata(self) -> dict[str, Any]:
        return self.capabilities.to_dict()
