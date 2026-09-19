"""Generic adapter for a source with an explicitly authorized JSON endpoint.

This adapter is intentionally not enabled by default. A source owner/API
provider must supply an endpoint whose terms permit automated collection.
The endpoint must return an array of normalized fare records or an object with
`flights`. No authentication bypass or anti-bot evasion is attempted.
"""
import json
import time
import urllib.parse
import urllib.request
import uuid
from datetime import date, datetime
from scraper.models import FlightRecord, SourceCapabilities


class AuthorizedJsonAdapter:
    def __init__(self, name, endpoint, capabilities=None, timeout=30):
        self.name=name; self.endpoint=endpoint; self.timeout=timeout
        self.capabilities=capabilities or SourceCapabilities(source=name)

    def collect(self, origin, destination, travel_date, pipeline_run_id, collection_timestamp):
        params=urllib.parse.urlencode({"origin":origin,"destination":destination,"travel_date":travel_date,"passengers":1,"cabin":"economy"})
        url=self.endpoint + ("&" if "?" in self.endpoint else "?") + params
        request=urllib.request.Request(url,headers={"Accept":"application/json","User-Agent":"APIx-Research-Prototype/1.0"})
        started=time.monotonic()
        try:
            with urllib.request.urlopen(request,timeout=self.timeout) as response:
                payload=json.loads(response.read().decode("utf-8"))
        except Exception as exc:
            message=str(exc); status="captcha_detected" if "captcha" in message.lower() else "source_blocked" if any(x in message.lower() for x in ("403","forbidden","blocked")) else "source_timeout" if time.monotonic()-started>=self.timeout else "source_error"
            return [],{"status":status,"error":message,"source":self.name}
        rows=payload.get("flights",payload) if isinstance(payload,dict) else payload
        if not isinstance(rows,list): return [],{"status":"parse_error","error":"Authorized endpoint did not return a flight array"}
        records=[]; advance=(date.fromisoformat(travel_date)-collection_timestamp.date()).days
        for row in rows:
            records.append(FlightRecord(
                observation_id=str(uuid.uuid4()),pipeline_run_id=pipeline_run_id,source=self.name,
                collection_timestamp=collection_timestamp.isoformat(),origin=origin,destination=destination,
                travel_date=travel_date,advance_days=advance,airline=str(row.get("airline") or "Unknown"),
                flight_number=row.get("flight_number"),departure_time=str(row.get("departure_time") or ""),
                arrival_time=str(row.get("arrival_time") or ""),duration_minutes=int(row.get("duration_minutes") or 0),
                stops=int(row.get("stops") or 0),total_fare=float(row["total_fare"]),currency=str(row.get("currency") or "INR").upper(),
                base_fare=row.get("base_fare"),tax_amount=row.get("tax_amount"),airport_fee=row.get("airport_fee"),
                udf=row.get("udf"),convenience_fee=row.get("convenience_fee"),other_mandatory_fee=row.get("other_mandatory_fee"),
                fare_components_complete=bool(row.get("fare_components_complete",False)),source_capabilities=self.capabilities.to_dict()))
        return records,{"status":"success" if records else "no_flights","source":self.name,"capabilities":self.capabilities.to_dict()}
