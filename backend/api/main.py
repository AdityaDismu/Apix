from datetime import date

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database.db import test_connection, get_connection

from index_engine.config import (
    METHODOLOGY_VERSION,
    configured_routes,
    SUPPORTED_ADVANCE_WINDOWS,
    BASE_INDEX,
    MIN_NATIONAL_ROUTE_COVERAGE,
    ROUTE_SOURCE,
    ROUTE_REFERENCE_PERIOD,
)

from index_engine.repository import fetch_route_history, fetch_national_history
from index_engine.periodic import fetch_periodic, rebuild_periodic_indices

from scraper.source_registry import source_capabilities

from analytics.diagnostics import summary as diagnostics_summary
from analytics.heatmap import route_change_matrix
from analytics.elasticity import lead_time_elasticity

from backtesting.runner import run_backtest


app = FastAPI(
    title="APIx Airfare Price Index API",
    version="4.0.0",
    description="Real-time airfare price measurement prototype for India.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class IndexPoint(BaseModel):
    collection_timestamp: str | None = None
    observation_date: str | None = None
    index: float


def _route_row(r):
    return {
        "origin": str(r[0]).strip().upper(),
        "destination": str(r[1]).strip().upper(),
        "active": r[2],
        "route_name": r[3],
        "source": r[4],
        "passenger_volume": float(r[5]) if r[5] is not None else None,
        "volume_period": r[6],
        "weight": float(r[7]) if r[7] is not None else None,
    }


@app.get("/api/health")
def health():
    try:
        return {
            "status": "ok",
            "database": "ok",
            "database_time": test_connection(),
            "methodology_version": METHODOLOGY_VERSION,
        }
    except Exception as exc:
        return {
            "status": "degraded",
            "database": "error",
            "detail": str(exc),
            "methodology_version": METHODOLOGY_VERSION,
        }


@app.get("/api/config")
def config():
    return {
        "routes": [
            {"origin": origin, "destination": destination}
            for origin, destination in configured_routes()
        ],
        "lead_times": SUPPORTED_ADVANCE_WINDOWS,
        "base_index": BASE_INDEX,
        "methodology_version": METHODOLOGY_VERSION,
        "national_min_route_coverage": MIN_NATIONAL_ROUTE_COVERAGE,
        "source_capabilities": source_capabilities(),
    }


@app.get("/api/routes")
def routes():
    """
    Return the complete configured route basket.

    The configured DGCA basket is authoritative for Route Explorer.
    Database rows are merged into it so that routes with no collected
    airfare observations are still visible.

    This prevents a partially populated routes table from making the
    frontend appear to have fewer routes than the actual basket.
    """

    with get_connection() as c:
        with c.cursor() as cur:
            cur.execute(
                """
                SELECT
                    origin,
                    destination,
                    active,
                    route_name,
                    source,
                    passenger_volume,
                    volume_period,
                    weight
                FROM routes
                ORDER BY origin, destination
                """
            )
            rows = cur.fetchall()

    db_routes = {
        (
            str(row[0]).strip().upper(),
            str(row[1]).strip().upper(),
        ): _route_row(row)
        for row in rows
    }

    configured = configured_routes()

    result = []

    for origin, destination in configured:
        key = (
            str(origin).strip().upper(),
            str(destination).strip().upper(),
        )

        if key in db_routes:
            result.append(db_routes[key])
        else:
            result.append(
                {
                    "origin": key[0],
                    "destination": key[1],
                    "active": True,
                    "route_name": f"{key[0]} → {key[1]}",
                    "source": ROUTE_SOURCE,
                    "passenger_volume": None,
                    "volume_period": ROUTE_REFERENCE_PERIOD,
                    "weight": None,
                }
            )

    return result


@app.get("/api/index/route/{origin}/{destination}")
def route_index(
    origin: str,
    destination: str,
    limit: int = Query(100, ge=1, le=5000),
):
    rows = fetch_route_history(
        origin.upper(),
        destination.upper(),
        limit,
    )

    return [
        {
            "collection_timestamp": row[0],
            "observation_date": row[1],
            "index": float(row[2]),
            "lead_time_windows": row[3],
            "observations_used": row[4],
            "coverage_ratio": float(row[5] or 0),
        }
        for row in rows
    ]


@app.get("/api/index/national")
def national_index(
    limit: int = Query(100, ge=1, le=5000),
):
    rows = fetch_national_history(limit)

    return [
        {
            "collection_timestamp": row[0],
            "observation_date": row[1],
            "index": float(row[2]),
            "routes_used": row[3],
            "routes_expected": row[4],
            "route_coverage_ratio": float(row[5] or 0),
            "observations_used": row[6],
            "weight_reference_period": row[7],
        }
        for row in rows
    ]


@app.get("/api/index/periodic/{frequency}")
def periodic_index(
    frequency: str,
    limit: int = Query(100, ge=1, le=5000),
    rebuild: bool = False,
):
    if frequency not in {"daily", "weekly", "monthly"}:
        raise HTTPException(
            400,
            "frequency must be daily, weekly or monthly",
        )

    if rebuild:
        rebuild_periodic_indices()

    rows = fetch_periodic(frequency, limit)

    return [
        {
            "period_start": row[0],
            "period_end": row[1],
            "index": float(row[2]),
            "source_observations": row[3],
            "source_days": row[4],
            "route_coverage_ratio": float(row[5] or 0),
            "methodology_version": row[6],
        }
        for row in rows
    ]


@app.get("/api/airfares")
def airfares(
    origin: str | None = None,
    destination: str | None = None,
    travel_date: str | None = None,
    advance_days: int | None = None,
    airline: str | None = None,
    quality_status: str | None = None,
    limit: int = Query(100, ge=1, le=5000),
    offset: int = Query(0, ge=0),
):
    query = """
        SELECT
            observation_id,
            collection_timestamp,
            origin,
            destination,
            travel_date,
            advance_days,
            airline,
            flight_number,
            departure_time,
            arrival_time,
            duration_minutes,
            stops,
            total_fare,
            base_fare,
            tax_amount,
            airport_fee,
            udf,
            convenience_fee,
            other_mandatory_fee,
            fare_components_complete,
            currency,
            quality_status,
            quality_flags,
            flight_instance_id,
            fare_match_key,
            source,
            source_metadata
        FROM airfare_observations
        WHERE 1=1
    """

    params = []

    filters = [
        ("origin", origin),
        ("destination", destination),
        ("travel_date", travel_date),
        ("advance_days", advance_days),
        ("airline", airline),
        ("quality_status", quality_status),
    ]

    for field, value in filters:
        if value is not None:
            query += f" AND {field}=%s"

            if isinstance(value, str) and field in {
                "origin",
                "destination",
                "airline",
                "quality_status",
            }:
                params.append(value.upper())
            else:
                params.append(value)

    query += """
        ORDER BY
            collection_timestamp DESC,
            travel_date,
            advance_days,
            airline
        LIMIT %s OFFSET %s
    """

    params.extend([limit, offset])

    with get_connection() as c:
        with c.cursor() as cur:
            cur.execute(query, params)
            rows = cur.fetchall()

    fields = [
        "observation_id",
        "collection_timestamp",
        "origin",
        "destination",
        "travel_date",
        "advance_days",
        "airline",
        "flight_number",
        "departure_time",
        "arrival_time",
        "duration_minutes",
        "stops",
        "total_fare",
        "base_fare",
        "tax_amount",
        "airport_fee",
        "udf",
        "convenience_fee",
        "other_mandatory_fee",
        "fare_components_complete",
        "currency",
        "quality_status",
        "quality_flags",
        "flight_instance_id",
        "fare_match_key",
        "source",
        "source_metadata",
    ]

    result = []

    for row in rows:
        data = dict(zip(fields, row))

        data["observation_id"] = str(data["observation_id"])
        data["total_fare"] = float(data["total_fare"])

        for key in (
            "base_fare",
            "tax_amount",
            "airport_fee",
            "udf",
            "convenience_fee",
            "other_mandatory_fee",
        ):
            data[key] = (
                float(data[key])
                if data[key] is not None
                else None
            )

        result.append(data)

    return result


@app.get("/api/quality")
def quality():
    result = diagnostics_summary()

    with get_connection() as c:
        with c.cursor() as cur:
            cur.execute(
                """
                SELECT
                    event_type,
                    SUM(count)
                FROM data_quality_events
                GROUP BY event_type
                ORDER BY event_type
                """
            )

            result["events"] = {
                row[0]: row[1]
                for row in cur.fetchall()
            }

    return result


@app.get("/api/quality/events")
def quality_events(
    limit: int = Query(100, ge=1, le=5000),
):
    with get_connection() as c:
        with c.cursor() as cur:
            cur.execute(
                """
                SELECT
                    quality_event_id,
                    pipeline_run_id,
                    origin,
                    destination,
                    event_type,
                    severity,
                    count,
                    details,
                    created_at
                FROM data_quality_events
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (limit,),
            )

            rows = cur.fetchall()

    return [
        {
            "id": row[0],
            "pipeline_run_id": str(row[1]) if row[1] else None,
            "origin": row[2].strip() if row[2] else None,
            "destination": row[3].strip() if row[3] else None,
            "event_type": row[4],
            "severity": row[5],
            "count": row[6],
            "details": row[7],
            "created_at": row[8],
        }
        for row in rows
    ]


@app.get("/api/collection/runs")
def collection_runs(
    limit: int = Query(100, ge=1, le=5000),
):
    with get_connection() as c:
        with c.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    pipeline_run_id,
                    source,
                    origin,
                    destination,
                    travel_date,
                    advance_days,
                    collection_timestamp,
                    collection_status,
                    raw_records,
                    valid_records,
                    rejected_records,
                    duplicate_records,
                    outliers_flagged,
                    source_metadata
                FROM collection_runs
                ORDER BY collection_timestamp DESC
                LIMIT %s
                """,
                (limit,),
            )

            rows = cur.fetchall()

    return [
        {
            "id": row[0],
            "pipeline_run_id": str(row[1]) if row[1] else None,
            "source": row[2],
            "origin": row[3].strip(),
            "destination": row[4].strip(),
            "travel_date": row[5],
            "advance_days": row[6],
            "collection_timestamp": row[7],
            "status": row[8],
            "raw_records": row[9],
            "valid_records": row[10],
            "rejected_records": row[11],
            "duplicate_records": row[12],
            "outliers_flagged": row[13],
            "source_metadata": row[14],
        }
        for row in rows
    ]


@app.get("/api/pipeline/runs")
def pipeline_runs(
    limit: int = Query(100, ge=1, le=1000),
):
    with get_connection() as c:
        with c.cursor() as cur:
            cur.execute(
                """
                SELECT
                    pipeline_run_id,
                    started_at,
                    finished_at,
                    status,
                    routes_requested,
                    routes_succeeded,
                    routes_failed,
                    observations_collected,
                    error_summary,
                    metadata
                FROM pipeline_runs
                ORDER BY started_at DESC
                LIMIT %s
                """,
                (limit,),
            )

            rows = cur.fetchall()

    return [
        {
            "pipeline_run_id": str(row[0]),
            "started_at": row[1],
            "finished_at": row[2],
            "status": row[3],
            "routes_requested": row[4],
            "routes_succeeded": row[5],
            "routes_failed": row[6],
            "observations_collected": row[7],
            "errors": row[8],
            "metadata": row[9],
        }
        for row in rows
    ]


@app.get("/api/analytics/heatmap")
def heatmap():
    return route_change_matrix()


@app.get("/api/analytics/elasticity/{origin}/{destination}")
def elasticity(
    origin: str,
    destination: str,
):
    return lead_time_elasticity(
        origin,
        destination,
    )


@app.get("/api/analytics/diagnostics")
def diagnostics():
    return diagnostics_summary()


@app.get("/api/methodology")
def methodology():
    return {
        "version": METHODOLOGY_VERSION,
        "base_index": BASE_INDEX,
        "lead_time_windows": SUPPORTED_ADVANCE_WINDOWS,
        "elementary_formula": (
            "Geometric mean (Jevons-style) of positive price relatives."
        ),
        "price_relative": (
            "current standardized mandatory consumer fare / "
            "reference standardized fare."
        ),
        "route_aggregation": (
            "Equal-weight geometric aggregation across available "
            "lead-time windows in the prototype."
        ),
        "national_aggregation": (
            "Passenger-volume-weighted geometric aggregation across "
            "covered routes; published only when minimum route "
            "coverage is met."
        ),
        "outlier_policy": (
            "Flag, retain, and exclude flagged observations from "
            "index calculations."
        ),
        "missing_source_policy": (
            "Record source failure status; never substitute "
            "fabricated fares."
        ),
        "fare_component_policy": (
            "Only source-observed components are stored; "
            "unavailable components remain null."
        ),
        "cpi_relationship": (
            "High-frequency airfare indicator intended to "
            "support/augment airfare price measurement; not an "
            "official CPI replacement."
        ),
    }


@app.get("/api/sources")
def sources():
    return source_capabilities()


@app.post("/api/backtest/run")
def backtest_run(
    path: str | None = None,
):
    from index_engine.config import BACKTEST_FILE

    reference = path or str(BACKTEST_FILE)

    try:
        return run_backtest(reference)
    except Exception as exc:
        raise HTTPException(
            400,
            str(exc),
        ) from exc


@app.get("/api/backtest/runs")
def backtest_runs(
    limit: int = Query(20, ge=1, le=200),
):
    with get_connection() as c:
        with c.cursor() as cur:
            cur.execute(
                """
                SELECT
                    backtest_run_id,
                    started_at,
                    finished_at,
                    reference_source,
                    status,
                    observations_compared,
                    routes_compared,
                    metrics,
                    methodology_version
                FROM backtest_runs
                ORDER BY started_at DESC
                LIMIT %s
                """,
                (limit,),
            )

            rows = cur.fetchall()

    return [
        {
            "backtest_run_id": str(row[0]),
            "started_at": row[1],
            "finished_at": row[2],
            "reference_source": row[3],
            "status": row[4],
            "observations_compared": row[5],
            "routes_compared": row[6],
            "metrics": row[7],
            "methodology_version": row[8],
        }
        for row in rows
    ]


@app.get("/api/backtest/{backtest_run_id}")
def backtest_detail(
    backtest_run_id: str,
):
    with get_connection() as c:
        with c.cursor() as cur:
            cur.execute(
                """
                SELECT
                    backtest_run_id,
                    started_at,
                    finished_at,
                    reference_source,
                    status,
                    observations_compared,
                    routes_compared,
                    metrics,
                    methodology_version
                FROM backtest_runs
                WHERE backtest_run_id=%s
                """,
                (backtest_run_id,),
            )

            run = cur.fetchone()

            if not run:
                raise HTTPException(
                    404,
                    "Backtest run not found",
                )

            cur.execute(
                """
                SELECT
                    route_origin,
                    route_destination,
                    period_start,
                    api_index,
                    reference_value,
                    api_change_pct,
                    reference_change_pct,
                    absolute_error,
                    squared_error
                FROM backtest_observations
                WHERE backtest_run_id=%s
                ORDER BY
                    period_start,
                    route_origin,
                    route_destination
                """,
                (backtest_run_id,),
            )

            rows = cur.fetchall()

    return {
        "run": {
            "backtest_run_id": str(run[0]),
            "started_at": run[1],
            "finished_at": run[2],
            "reference_source": run[3],
            "status": run[4],
            "observations_compared": run[5],
            "routes_compared": run[6],
            "metrics": run[7],
            "methodology_version": run[8],
        },
        "observations": [
            {
                "origin": row[0].strip(),
                "destination": row[1].strip(),
                "period_start": row[2],
                "api_index": float(row[3]),
                "reference_index": float(row[4]),
                "api_change_pct": (
                    float(row[5])
                    if row[5] is not None
                    else None
                ),
                "reference_change_pct": (
                    float(row[6])
                    if row[6] is not None
                    else None
                ),
                "absolute_error": float(row[7]),
                "squared_error": float(row[8]),
            }
            for row in rows
        ],
    }