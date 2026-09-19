"""
APIx Complete Index Builder

Builds:
1. Route-level APIx
2. DGCA passenger-weighted National APIx
3. Daily route APIx
4. Daily National APIx
5. Weekly APIx
6. Monthly APIx
7. Coverage metrics
8. 30-day backtest framework

Methodology:
- Standard fare = total mandatory consumer fare.
- Only valid, non-stop, economy, one-way INR observations are eligible.
- Flagged observations remain stored but are excluded from the index.
- Route representative fare = geometric mean of eligible fares.
- Route APIx = geometric-mean price relatives across available lead-time windows.
- National APIx = DGCA passenger-weighted geometric aggregation.
- Missing routes are never assigned fake fares.
- Covered-route weights are renormalized.
- No synthetic historical observations are generated.
"""

from __future__ import annotations

import argparse
import math
from collections import defaultdict
from datetime import date, timedelta

from psycopg.types.json import Jsonb

from database.db import get_connection


METHOD_VERSION = "2.0.0"

LEAD_TIME_WINDOWS = [1, 7, 15, 21, 30, 45]

MIN_ROUTE_COVERAGE = 0.80

VALID_QUALITY_STATUSES = {"valid"}

BACKTEST_DAYS = 30


# ======================================================================
# BASIC HELPERS
# ======================================================================

def geometric_mean(values: list[float]) -> float | None:
    cleaned = []

    for value in values:
        try:
            value = float(value)
        except (TypeError, ValueError):
            continue

        if value > 0 and math.isfinite(value):
            cleaned.append(value)

    if not cleaned:
        return None

    return math.exp(
        sum(math.log(value) for value in cleaned) / len(cleaned)
    )


def safe_float(value) -> float | None:
    if value is None:
        return None

    try:
        value = float(value)

        if math.isfinite(value):
            return value

    except (TypeError, ValueError):
        pass

    return None


def table_exists(cur, table_name: str) -> bool:
    cur.execute(
        """
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = %s
        )
        """,
        (table_name,),
    )

    return bool(cur.fetchone()[0])


def column_exists(
    cur,
    table_name: str,
    column_name: str,
) -> bool:

    cur.execute(
        """
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = %s
              AND column_name = %s
        )
        """,
        (table_name, column_name),
    )

    return bool(cur.fetchone()[0])


def get_required_columns(cur, table_name: str) -> list[str]:
    cur.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = %s
          AND is_nullable = 'NO'
          AND column_default IS NULL
        ORDER BY ordinal_position
        """,
        (table_name,),
    )

    return [row[0] for row in cur.fetchall()]


# ======================================================================
# SCHEMA
# ======================================================================

def ensure_schema(cur):
    """
    Ensure every table/column used by this builder exists.

    This function is additive:
    - never drops tables
    - never deletes application data
    - never changes existing primary keys
    - safe to run repeatedly
    """

    # ------------------------------------------------------------------
    # ROUTE INDEX COMPATIBILITY
    # ------------------------------------------------------------------

    cur.execute(
        """
        ALTER TABLE route_index_values
            ADD COLUMN IF NOT EXISTS route_index NUMERIC(14,6),
            ADD COLUMN IF NOT EXISTS index_value NUMERIC(14,6),
            ADD COLUMN IF NOT EXISTS coverage_ratio NUMERIC(8,4),
            ADD COLUMN IF NOT EXISTS lead_time_windows INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS observations_used INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS reference_period TEXT,
            ADD COLUMN IF NOT EXISTS methodology_version TEXT DEFAULT '2.0.0',
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()
        """
    )

    # ------------------------------------------------------------------
    # NATIONAL INDEX COMPATIBILITY
    # ------------------------------------------------------------------

    cur.execute(
        """
        ALTER TABLE national_index_values
            ADD COLUMN IF NOT EXISTS index_value NUMERIC(14,6),
            ADD COLUMN IF NOT EXISTS routes_used INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS routes_expected INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS observations_used INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS route_coverage_ratio NUMERIC(8,4),
            ADD COLUMN IF NOT EXISTS weight_reference_period TEXT,
            ADD COLUMN IF NOT EXISTS methodology_version TEXT DEFAULT '2.0.0',
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()
        """
    )

    # ------------------------------------------------------------------
    # DAILY ROUTE VALUES
    # ------------------------------------------------------------------

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS apix_route_daily_values (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            route_origin TEXT NOT NULL,
            route_destination TEXT NOT NULL,
            observation_date DATE NOT NULL,
            index_value NUMERIC(14,6) NOT NULL,
            observations_used INTEGER NOT NULL DEFAULT 0,
            lead_time_windows INTEGER NOT NULL DEFAULT 0,
            coverage_ratio NUMERIC(8,4) NOT NULL DEFAULT 0,
            methodology_version TEXT NOT NULL DEFAULT '2.0.0',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(
                route_origin,
                route_destination,
                observation_date
            )
        )
        """
    )

    # ------------------------------------------------------------------
    # DAILY NATIONAL VALUES
    # ------------------------------------------------------------------

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS apix_national_daily_values (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            observation_date DATE NOT NULL,
            index_value NUMERIC(14,6) NOT NULL,
            routes_used INTEGER NOT NULL DEFAULT 0,
            routes_expected INTEGER NOT NULL DEFAULT 0,
            route_coverage_ratio NUMERIC(8,4) NOT NULL DEFAULT 0,
            methodology_version TEXT NOT NULL DEFAULT '2.0.0',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(observation_date)
        )
        """
    )

    # ------------------------------------------------------------------
    # PERIODIC VALUES
    # ------------------------------------------------------------------

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS periodic_index_values (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            frequency TEXT NOT NULL
                CHECK (
                    frequency IN (
                        'daily',
                        'weekly',
                        'monthly'
                    )
                ),
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            index_value NUMERIC(14,6) NOT NULL,
            source_observations INTEGER NOT NULL DEFAULT 0,
            source_days INTEGER NOT NULL DEFAULT 0,
            route_coverage_ratio NUMERIC(8,4) NOT NULL DEFAULT 0,
            methodology_version TEXT NOT NULL DEFAULT '2.0.0',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(frequency, period_start)
        )
        """
    )

    # ------------------------------------------------------------------
    # BACKTEST TABLE
    #
    # This schema deliberately matches the original Batch-1/Batch-2
    # backtest structure instead of relying on a "metrics" column.
    # ------------------------------------------------------------------

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS apix_backtest_runs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            run_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            window_days INTEGER NOT NULL DEFAULT 30,
            status TEXT NOT NULL,
            routes_tested INTEGER NOT NULL DEFAULT 0,
            observations_tested INTEGER NOT NULL DEFAULT 0,
            mean_absolute_error NUMERIC(14,6),
            median_absolute_error NUMERIC(14,6),
            rmse NUMERIC(14,6),
            mean_bias NUMERIC(14,6),
            details JSONB NOT NULL DEFAULT '{}'::jsonb,
            methodology_version TEXT NOT NULL DEFAULT '2.0.0'
        )
        """
    )

    # ------------------------------------------------------------------
    # BACKTEST COMPATIBILITY COLUMNS
    #
    # Handles an existing table created by an older builder version.
    # ------------------------------------------------------------------

    cur.execute(
        """
        ALTER TABLE apix_backtest_runs
            ADD COLUMN IF NOT EXISTS run_date TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS window_days INTEGER,
            ADD COLUMN IF NOT EXISTS status TEXT,
            ADD COLUMN IF NOT EXISTS routes_tested INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS observations_tested INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS mean_absolute_error NUMERIC(14,6),
            ADD COLUMN IF NOT EXISTS median_absolute_error NUMERIC(14,6),
            ADD COLUMN IF NOT EXISTS rmse NUMERIC(14,6),
            ADD COLUMN IF NOT EXISTS mean_bias NUMERIC(14,6),
            ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb,
            ADD COLUMN IF NOT EXISTS methodology_version TEXT DEFAULT '2.0.0'
        """
    )

    # ------------------------------------------------------------------
    # DEFAULTS FOR POSSIBLY NULL COMPATIBILITY COLUMNS
    # ------------------------------------------------------------------

    cur.execute(
        """
        UPDATE route_index_values
        SET methodology_version = %s
        WHERE methodology_version IS NULL
        """,
        (METHOD_VERSION,),
    )

    cur.execute(
        """
        UPDATE national_index_values
        SET methodology_version = %s
        WHERE methodology_version IS NULL
        """,
        (METHOD_VERSION,),
    )

    cur.execute(
        """
        UPDATE apix_backtest_runs
        SET
            run_date = COALESCE(run_date, NOW()),
            window_days = COALESCE(window_days, 30),
            routes_tested = COALESCE(routes_tested, 0),
            observations_tested = COALESCE(observations_tested, 0),
            details = COALESCE(details, '{}'::jsonb),
            methodology_version = COALESCE(
                methodology_version,
                %s
            )
        """,
        (METHOD_VERSION,),
    )

    # ------------------------------------------------------------------
    # INDEXES
    # ------------------------------------------------------------------

    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS
        idx_apix_route_daily_route_date
        ON apix_route_daily_values(
            route_origin,
            route_destination,
            observation_date DESC
        )
        """
    )

    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS
        idx_apix_national_daily_date
        ON apix_national_daily_values(
            observation_date DESC
        )
        """
    )

    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS
        idx_apix_backtest_run_date
        ON apix_backtest_runs(run_date DESC)
        """
    )


# ======================================================================
# ROUTE WEIGHTS
# ======================================================================

def load_route_weights(cur):

    cur.execute(
        """
        SELECT
            origin,
            destination,
            passenger_volume,
            weight,
            reference_period,
            source
        FROM route_weights
        WHERE weight > 0
        ORDER BY origin, destination
        """
    )

    rows = cur.fetchall()

    weights = {}

    for row in rows:

        (
            origin,
            destination,
            passenger_volume,
            weight,
            reference_period,
            source,
        ) = row

        weights[(origin, destination)] = {
            "passenger_volume": safe_float(
                passenger_volume
            ) or 0.0,
            "weight": safe_float(weight) or 0.0,
            "reference_period": reference_period,
            "source": source,
        }

    return weights


# ======================================================================
# AIRFARE OBSERVATIONS
# ======================================================================

def load_observations(cur):

    cur.execute(
        """
        SELECT
            observation_id,
            origin,
            destination,
            travel_date,
            advance_days,
            collection_timestamp,
            total_fare,
            quality_status,
            quality_flags,
            stops,
            currency,
            fare_class,
            trip_type,
            availability
        FROM airfare_observations
        WHERE total_fare > 0
          AND currency = 'INR'
          AND fare_class = 'economy'
          AND trip_type = 'one-way'
          AND COALESCE(stops, 0) = 0
          AND COALESCE(availability, 'available') = 'available'
          AND quality_status = ANY(%s)
        ORDER BY
            collection_timestamp,
            origin,
            destination,
            advance_days
        """,
        (list(VALID_QUALITY_STATUSES),),
    )

    rows = cur.fetchall()

    observations = []

    for row in rows:

        (
            observation_id,
            origin,
            destination,
            travel_date,
            advance_days,
            collection_timestamp,
            total_fare,
            quality_status,
            quality_flags,
            stops,
            currency,
            fare_class,
            trip_type,
            availability,
        ) = row

        fare = safe_float(total_fare)

        if fare is None or fare <= 0:
            continue

        if advance_days not in LEAD_TIME_WINDOWS:
            continue

        if collection_timestamp is None:
            continue

        observations.append(
            {
                "observation_id": str(observation_id),
                "origin": origin,
                "destination": destination,
                "travel_date": travel_date,
                "advance_days": int(advance_days),
                "collection_timestamp": collection_timestamp,
                "fare": fare,
            }
        )

    return observations


# ======================================================================
# CURRENT ROUTE FARES
# ======================================================================

def group_current_fares(observations):

    grouped = defaultdict(
        lambda: defaultdict(list)
    )

    for observation in observations:

        route = (
            observation["origin"],
            observation["destination"],
        )

        grouped[route][
            observation["advance_days"]
        ].append(
            observation["fare"]
        )

    representative = {}

    for route, windows in grouped.items():

        representative[route] = {}

        for advance_days, fares in windows.items():

            gm = geometric_mean(fares)

            if gm is not None:

                representative[route][advance_days] = {
                    "fare": gm,
                    "observations": len(fares),
                }

    return representative


# ======================================================================
# ROUTE BASELINES
# ======================================================================

def build_route_baselines(observations):

    grouped = defaultdict(
        lambda: defaultdict(
            lambda: defaultdict(list)
        )
    )

    for observation in observations:

        route = (
            observation["origin"],
            observation["destination"],
        )

        collection_date = (
            observation["collection_timestamp"].date()
        )

        grouped[route][
            observation["advance_days"]
        ][collection_date].append(
            observation["fare"]
        )

    baselines = {}

    for route, windows in grouped.items():

        baselines[route] = {}

        for advance_days, dates in windows.items():

            earliest_date = min(dates.keys())

            gm = geometric_mean(
                dates[earliest_date]
            )

            if gm is not None:

                baselines[route][advance_days] = {
                    "date": earliest_date,
                    "fare": gm,
                }

    return baselines


# ======================================================================
# ROUTE APIx
# ======================================================================

def calculate_route_indexes(observations):

    current = group_current_fares(observations)

    baselines = build_route_baselines(
        observations
    )

    route_results = {}

    for route, windows in current.items():

        baseline_windows = baselines.get(
            route,
            {},
        )

        relatives = []

        observations_used = 0

        for advance_days, current_data in windows.items():

            baseline_data = baseline_windows.get(
                advance_days
            )

            if not baseline_data:
                continue

            baseline_fare = baseline_data["fare"]

            current_fare = current_data["fare"]

            if baseline_fare <= 0:
                continue

            relative = (
                current_fare / baseline_fare
            )

            if (
                relative > 0
                and math.isfinite(relative)
            ):

                relatives.append(relative)

                observations_used += (
                    current_data["observations"]
                )

        index = geometric_mean(relatives)

        if index is None:
            continue

        route_results[route] = {
            "index_value": index * 100.0,
            "lead_time_windows": len(relatives),
            "observations_used": observations_used,
            "coverage_ratio": (
                len(relatives)
                / len(LEAD_TIME_WINDOWS)
            ),
        }

    return route_results


# ======================================================================
# DAILY ROUTE APIx
# ======================================================================

def calculate_route_daily_indexes(observations):

    grouped = defaultdict(
        lambda: defaultdict(
            lambda: defaultdict(list)
        )
    )

    for observation in observations:

        route = (
            observation["origin"],
            observation["destination"],
        )

        collection_date = (
            observation["collection_timestamp"].date()
        )

        grouped[route][
            collection_date
        ][
            observation["advance_days"]
        ].append(
            observation["fare"]
        )

    results = []

    for route, date_map in grouped.items():

        baseline_by_window = {}

        for observation_date, windows in date_map.items():

            for advance_days, fares in windows.items():

                gm = geometric_mean(fares)

                if gm is None:
                    continue

                if advance_days not in baseline_by_window:

                    baseline_by_window[
                        advance_days
                    ] = (
                        observation_date,
                        gm,
                    )

                else:

                    existing_date, existing_value = (
                        baseline_by_window[
                            advance_days
                        ]
                    )

                    if observation_date < existing_date:

                        baseline_by_window[
                            advance_days
                        ] = (
                            observation_date,
                            gm,
                        )

        for observation_date, windows in date_map.items():

            relatives = []

            observations_used = 0

            for advance_days, fares in windows.items():

                baseline_data = baseline_by_window.get(
                    advance_days
                )

                if not baseline_data:
                    continue

                baseline_date, baseline_fare = (
                    baseline_data
                )

                current_fare = geometric_mean(
                    fares
                )

                if current_fare is None:
                    continue

                if baseline_fare <= 0:
                    continue

                relative = (
                    current_fare / baseline_fare
                )

                if (
                    relative > 0
                    and math.isfinite(relative)
                ):

                    relatives.append(relative)

                    observations_used += len(fares)

            index = geometric_mean(relatives)

            if index is None:
                continue

            results.append(
                {
                    "origin": route[0],
                    "destination": route[1],
                    "date": observation_date,
                    "index_value": index * 100.0,
                    "observations_used": observations_used,
                    "lead_time_windows": len(relatives),
                    "coverage_ratio": (
                        len(relatives)
                        / len(LEAD_TIME_WINDOWS)
                    ),
                }
            )

    return results


# ======================================================================
# NATIONAL APIx
# ======================================================================

def calculate_national_index(
    route_indexes,
    route_weights,
):

    covered = []

    for route, result in route_indexes.items():

        weight_data = route_weights.get(route)

        if not weight_data:
            continue

        weight = weight_data["weight"]

        if weight <= 0:
            continue

        index_value = safe_float(
            result.get("index_value")
        )

        if index_value is None or index_value <= 0:
            continue

        covered.append(
            (
                route,
                index_value,
                weight,
                int(
                    result.get(
                        "observations_used",
                        0,
                    )
                ),
            )
        )

    if not covered:
        return None

    weight_sum = sum(
        item[2]
        for item in covered
    )

    if weight_sum <= 0:
        return None

    weighted_log_sum = 0.0

    observations_used = 0

    for (
        route,
        index_value,
        weight,
        route_observations,
    ) in covered:

        normalized_weight = (
            weight / weight_sum
        )

        weighted_log_sum += (
            normalized_weight
            * math.log(index_value)
        )

        observations_used += route_observations

    national_index = math.exp(
        weighted_log_sum
    )

    total_routes = len(route_weights)

    routes_used = len(covered)

    return {
        "index_value": national_index,
        "routes_used": routes_used,
        "routes_expected": total_routes,
        "observations_used": observations_used,
        "route_coverage_ratio": (
            routes_used / total_routes
            if total_routes
            else 0.0
        ),
    }


# ======================================================================
# SAVE ROUTE APIx
# ======================================================================

def save_route_results(
    cur,
    route_results,
    route_weights,
):

    reference_period = None

    periods = {
        item["reference_period"]
        for item in route_weights.values()
        if item.get("reference_period")
    }

    if periods:
        reference_period = sorted(periods)[0]

    for route, result in route_results.items():

        origin, destination = route

        cur.execute(
            """
            SELECT MAX(collection_timestamp)
            FROM airfare_observations
            WHERE origin = %s
              AND destination = %s
              AND total_fare > 0
              AND currency = 'INR'
              AND fare_class = 'economy'
              AND trip_type = 'one-way'
              AND COALESCE(stops, 0) = 0
              AND COALESCE(
                    availability,
                    'available'
                  ) = 'available'
              AND quality_status = 'valid'
            """,
            (
                origin,
                destination,
            ),
        )

        row = cur.fetchone()

        collection_timestamp = (
            row[0]
            if row
            else None
        )

        if collection_timestamp is None:
            continue

        observation_date = (
            collection_timestamp.date()
        )

        index_value = result["index_value"]

        # Make repeated builder runs idempotent for the same
        # route/date combination.
        cur.execute(
            """
            DELETE FROM route_index_values
            WHERE origin = %s
              AND destination = %s
              AND observation_date = %s
            """,
            (
                origin,
                destination,
                observation_date,
            ),
        )

        cur.execute(
            """
            INSERT INTO route_index_values (
                origin,
                destination,
                collection_timestamp,
                observation_date,
                route_index,
                index_value,
                lead_time_windows,
                observations_used,
                methodology_version,
                coverage_ratio,
                reference_period
            )
            VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
            )
            """,
            (
                origin,
                destination,
                collection_timestamp,
                observation_date,
                index_value,
                index_value,
                result["lead_time_windows"],
                result["observations_used"],
                METHOD_VERSION,
                result["coverage_ratio"],
                reference_period,
            ),
        )


# ======================================================================
# SAVE NATIONAL APIx
# ======================================================================

def save_national_result(
    cur,
    national_result,
    route_weights,
):

    if national_result is None:
        return

    reference_period = None

    periods = {
        item["reference_period"]
        for item in route_weights.values()
        if item.get("reference_period")
    }

    if periods:
        reference_period = sorted(periods)[0]

    cur.execute(
        """
        SELECT MAX(collection_timestamp)
        FROM airfare_observations
        WHERE total_fare > 0
          AND currency = 'INR'
          AND fare_class = 'economy'
          AND trip_type = 'one-way'
          AND COALESCE(stops, 0) = 0
          AND COALESCE(
                availability,
                'available'
              ) = 'available'
          AND quality_status = 'valid'
        """
    )

    row = cur.fetchone()

    collection_timestamp = (
        row[0]
        if row
        else None
    )

    if collection_timestamp is None:
        raise RuntimeError(
            "Cannot save National APIx: "
            "no eligible collection timestamp exists."
        )

    observation_date = (
        collection_timestamp.date()
    )

    # Remove an existing national value for the same
    # observation date so rerunning the builder remains clean.
    cur.execute(
        """
        DELETE FROM national_index_values
        WHERE observation_date = %s
        """,
        (observation_date,),
    )

    cur.execute(
        """
        INSERT INTO national_index_values (
            collection_timestamp,
            observation_date,
            index_value,
            routes_used,
            observations_used,
            weight_reference_period,
            methodology_version,
            created_at,
            routes_expected,
            route_coverage_ratio
        )
        VALUES (
            %s,%s,%s,%s,%s,%s,%s,NOW(),%s,%s
        )
        """,
        (
            collection_timestamp,
            observation_date,
            national_result["index_value"],
            national_result["routes_used"],
            national_result["observations_used"],
            reference_period,
            METHOD_VERSION,
            national_result["routes_expected"],
            national_result["route_coverage_ratio"],
        ),
    )


# ======================================================================
# SAVE DAILY ROUTE VALUES
# ======================================================================

def save_daily_route_values(
    cur,
    daily_values,
):

    for item in daily_values:

        cur.execute(
            """
            INSERT INTO apix_route_daily_values (
                route_origin,
                route_destination,
                observation_date,
                index_value,
                observations_used,
                lead_time_windows,
                coverage_ratio,
                methodology_version
            )
            VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s
            )
            ON CONFLICT(
                route_origin,
                route_destination,
                observation_date
            )
            DO UPDATE SET
                index_value =
                    EXCLUDED.index_value,
                observations_used =
                    EXCLUDED.observations_used,
                lead_time_windows =
                    EXCLUDED.lead_time_windows,
                coverage_ratio =
                    EXCLUDED.coverage_ratio,
                methodology_version =
                    EXCLUDED.methodology_version
            """,
            (
                item["origin"],
                item["destination"],
                item["date"],
                item["index_value"],
                item["observations_used"],
                item["lead_time_windows"],
                item["coverage_ratio"],
                METHOD_VERSION,
            ),
        )


# ======================================================================
# SAVE DAILY NATIONAL VALUES
# ======================================================================

def save_daily_national_values(
    cur,
    daily_values,
    route_weights,
):

    grouped = defaultdict(dict)

    for item in daily_values:

        grouped[item["date"]][
            (
                item["origin"],
                item["destination"],
            )
        ] = item

    for observation_date, route_map in grouped.items():

        route_indexes = {}

        for route, data in route_map.items():

            route_indexes[route] = {
                "index_value": data["index_value"],
                "observations_used": data[
                    "observations_used"
                ],
            }

        national = calculate_national_index(
            route_indexes,
            route_weights,
        )

        if national is None:
            continue

        cur.execute(
            """
            INSERT INTO apix_national_daily_values (
                observation_date,
                index_value,
                routes_used,
                routes_expected,
                route_coverage_ratio,
                methodology_version
            )
            VALUES (
                %s,%s,%s,%s,%s,%s
            )
            ON CONFLICT(observation_date)
            DO UPDATE SET
                index_value =
                    EXCLUDED.index_value,
                routes_used =
                    EXCLUDED.routes_used,
                routes_expected =
                    EXCLUDED.routes_expected,
                route_coverage_ratio =
                    EXCLUDED.route_coverage_ratio,
                methodology_version =
                    EXCLUDED.methodology_version
            """,
            (
                observation_date,
                national["index_value"],
                national["routes_used"],
                national["routes_expected"],
                national["route_coverage_ratio"],
                METHOD_VERSION,
            ),
        )


# ======================================================================
# PERIODIC INDEXES
# ======================================================================

def save_periodic_indexes(cur):

    cur.execute(
        """
        SELECT
            observation_date,
            index_value,
            route_coverage_ratio
        FROM apix_national_daily_values
        ORDER BY observation_date
        """
    )

    rows = cur.fetchall()

    if not rows:
        return 0

    daily = []

    for row in rows:

        daily.append(
            {
                "date": row[0],
                "index": float(row[1]),
                "coverage": float(row[2] or 0),
            }
        )

    periods = []

    # --------------------------------------------------------------
    # DAILY
    # --------------------------------------------------------------

    for item in daily:

        periods.append(
            (
                "daily",
                item["date"],
                item["date"],
                item["index"],
                1,
                item["coverage"],
            )
        )

    # --------------------------------------------------------------
    # WEEKLY
    # --------------------------------------------------------------

    weekly = defaultdict(list)

    for item in daily:

        monday = (
            item["date"]
            - timedelta(
                days=item["date"].weekday()
            )
        )

        sunday = (
            monday
            + timedelta(days=6)
        )

        weekly[
            (
                monday,
                sunday,
            )
        ].append(item)

    for (
        start,
        end,
    ), items in weekly.items():

        values = [
            item["index"]
            for item in items
        ]

        coverage_values = [
            item["coverage"]
            for item in items
        ]

        gm = geometric_mean(values)

        if gm is None:
            continue

        coverage = (
            sum(coverage_values)
            / len(coverage_values)
            if coverage_values
            else 0.0
        )

        periods.append(
            (
                "weekly",
                start,
                end,
                gm,
                len(items),
                coverage,
            )
        )

    # --------------------------------------------------------------
    # MONTHLY
    # --------------------------------------------------------------

    monthly = defaultdict(list)

    for item in daily:

        key = (
            item["date"].year,
            item["date"].month,
        )

        monthly[key].append(item)

    for (
        year,
        month,
    ), items in monthly.items():

        start = date(
            year,
            month,
            1,
        )

        if month == 12:

            end = (
                date(
                    year + 1,
                    1,
                    1,
                )
                - timedelta(days=1)
            )

        else:

            end = (
                date(
                    year,
                    month + 1,
                    1,
                )
                - timedelta(days=1)
            )

        values = [
            item["index"]
            for item in items
        ]

        coverage_values = [
            item["coverage"]
            for item in items
        ]

        gm = geometric_mean(values)

        if gm is None:
            continue

        coverage = (
            sum(coverage_values)
            / len(coverage_values)
            if coverage_values
            else 0.0
        )

        periods.append(
            (
                "monthly",
                start,
                end,
                gm,
                len(items),
                coverage,
            )
        )

    # --------------------------------------------------------------
    # SAVE
    # --------------------------------------------------------------

    for (
        frequency,
        start,
        end,
        value,
        source_days,
        coverage,
    ) in periods:

        cur.execute(
            """
            INSERT INTO periodic_index_values (
                frequency,
                period_start,
                period_end,
                index_value,
                source_observations,
                source_days,
                route_coverage_ratio,
                methodology_version
            )
            VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s
            )
            ON CONFLICT(
                frequency,
                period_start
            )
            DO UPDATE SET
                period_end =
                    EXCLUDED.period_end,
                index_value =
                    EXCLUDED.index_value,
                source_observations =
                    EXCLUDED.source_observations,
                source_days =
                    EXCLUDED.source_days,
                route_coverage_ratio =
                    EXCLUDED.route_coverage_ratio,
                methodology_version =
                    EXCLUDED.methodology_version
            """,
            (
                frequency,
                start,
                end,
                value,
                0,
                source_days,
                coverage,
                METHOD_VERSION,
            ),
        )

    return len(periods)


# ======================================================================
# 30-DAY BACKTEST
# ======================================================================

def run_backtest(cur):

    cur.execute(
        """
        SELECT
            observation_date,
            index_value,
            routes_used,
            routes_expected,
            route_coverage_ratio
        FROM apix_national_daily_values
        ORDER BY observation_date ASC
        """
    )

    rows = cur.fetchall()

    available_days = len(rows)

    # --------------------------------------------------------------
    # INSUFFICIENT HISTORY
    # --------------------------------------------------------------

    if available_days < BACKTEST_DAYS:

        details = {
            "status": "insufficient_history",
            "window_days": BACKTEST_DAYS,
            "available_days": available_days,
            "required_days": BACKTEST_DAYS,
            "message": (
                f"{BACKTEST_DAYS} genuine daily National "
                f"APIx values are required; only "
                f"{available_days} are available."
            ),
        }

        cur.execute(
            """
            INSERT INTO apix_backtest_runs (
                run_date,
                window_days,
                status,
                routes_tested,
                observations_tested,
                mean_absolute_error,
                median_absolute_error,
                rmse,
                mean_bias,
                details,
                methodology_version
            )
            VALUES (
                NOW(),
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            """,
            (
                BACKTEST_DAYS,
                "insufficient_history",
                0,
                0,
                None,
                None,
                None,
                None,
                Jsonb(details),
                METHOD_VERSION,
            ),
        )

        return details

    # --------------------------------------------------------------
    # MOST RECENT 30 DAYS
    # --------------------------------------------------------------

    window = rows[-BACKTEST_DAYS:]

    first_date = window[0][0]
    last_date = window[-1][0]

    first_index = float(window[0][1])
    last_index = float(window[-1][1])

    values = [
        float(row[1])
        for row in window
    ]

    routes_used_values = [
        int(row[2])
        for row in window
    ]

    coverage_values = [
        float(row[4] or 0)
        for row in window
    ]

    # --------------------------------------------------------------
    # DAILY MOVEMENTS
    # --------------------------------------------------------------

    daily_changes = []

    for previous, current in zip(
        values,
        values[1:],
    ):

        daily_changes.append(
            current - previous
        )

    absolute_changes = [
        abs(value)
        for value in daily_changes
    ]

    mean_absolute_daily_change = (
        sum(absolute_changes)
        / len(absolute_changes)
        if absolute_changes
        else 0.0
    )

    # --------------------------------------------------------------
    # CHANGE
    # --------------------------------------------------------------

    if first_index > 0:

        change_percent = (
            (
                last_index
                - first_index
            )
            / first_index
        ) * 100.0

    else:

        change_percent = None

    # --------------------------------------------------------------
    # RANGE
    # --------------------------------------------------------------

    minimum_index = min(values)

    maximum_index = max(values)

    # --------------------------------------------------------------
    # MAX DRAWDOWN
    # --------------------------------------------------------------

    peak = values[0]

    max_drawdown = 0.0

    for value in values:

        if value > peak:
            peak = value

        if peak > 0:

            drawdown = (
                (peak - value)
                / peak
            ) * 100.0

            max_drawdown = max(
                max_drawdown,
                drawdown,
            )

    # --------------------------------------------------------------
    # DETAILS
    # --------------------------------------------------------------

    details = {
        "status": "success",
        "window_days": BACKTEST_DAYS,
        "available_days": available_days,
        "start_date": str(first_date),
        "end_date": str(last_date),
        "start_index": round(
            first_index,
            6,
        ),
        "end_index": round(
            last_index,
            6,
        ),
        "change_percent": (
            round(
                change_percent,
                6,
            )
            if change_percent is not None
            else None
        ),
        "minimum_index": round(
            minimum_index,
            6,
        ),
        "maximum_index": round(
            maximum_index,
            6,
        ),
        "mean_absolute_daily_change": round(
            mean_absolute_daily_change,
            6,
        ),
        "max_drawdown_percent": round(
            max_drawdown,
            6,
        ),
        "routes_used_min": min(
            routes_used_values
        ),
        "routes_used_max": max(
            routes_used_values
        ),
        "route_coverage_min": min(
            coverage_values
        ),
        "route_coverage_max": max(
            coverage_values
        ),
    }

    cur.execute(
        """
        INSERT INTO apix_backtest_runs (
            run_date,
            window_days,
            status,
            routes_tested,
            observations_tested,
            mean_absolute_error,
            median_absolute_error,
            rmse,
            mean_bias,
            details,
            methodology_version
        )
        VALUES (
            NOW(),
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s
        )
        """,
        (
            BACKTEST_DAYS,
            "success",
            max(routes_used_values),
            0,
            None,
            None,
            None,
            None,
            Jsonb(details),
            METHOD_VERSION,
        ),
    )

    return details


# ======================================================================
# FINAL DATABASE VERIFICATION
# ======================================================================

def verify_final_database(cur):

    cur.execute(
        """
        SELECT COUNT(*)
        FROM airfare_observations
        """
    )

    total_observations = cur.fetchone()[0]

    cur.execute(
        """
        SELECT COUNT(*)
        FROM (
            SELECT DISTINCT
                origin,
                destination
            FROM airfare_observations
        ) AS routes
        """
    )

    database_routes = cur.fetchone()[0]

    cur.execute(
        """
        SELECT COUNT(*)
        FROM route_index_values
        """
    )

    route_index_rows = cur.fetchone()[0]

    cur.execute(
        """
        SELECT COUNT(*)
        FROM national_index_values
        """
    )

    national_index_rows = cur.fetchone()[0]

    cur.execute(
        """
        SELECT COUNT(*)
        FROM apix_route_daily_values
        """
    )

    daily_route_rows = cur.fetchone()[0]

    cur.execute(
        """
        SELECT COUNT(*)
        FROM apix_national_daily_values
        """
    )

    daily_national_rows = cur.fetchone()[0]

    cur.execute(
        """
        SELECT COUNT(*)
        FROM periodic_index_values
        """
    )

    periodic_rows = cur.fetchone()[0]

    return {
        "total_observations": total_observations,
        "database_routes": database_routes,
        "route_index_rows": route_index_rows,
        "national_index_rows": national_index_rows,
        "daily_route_rows": daily_route_rows,
        "daily_national_rows": daily_national_rows,
        "periodic_rows": periodic_rows,
    }


# ======================================================================
# MAIN
# ======================================================================

def main():

    parser = argparse.ArgumentParser(
        description="Build the complete APIx index layer."
    )

    parser.add_argument(
        "--backtest",
        action="store_true",
        help="Run the 30-day backtest framework.",
    )

    args = parser.parse_args()

    print()
    print("=" * 70)
    print("APIx COMPLETE INDEX BUILDER")
    print("=" * 70)

    with get_connection() as conn:

        with conn.cursor() as cur:

            # ==========================================================
            # 1. SCHEMA
            # ==========================================================

            print()
            print("1. Checking database schema...")

            required_tables = [
                "route_weights",
                "airfare_observations",
                "route_index_values",
                "national_index_values",
            ]

            missing_tables = [
                table
                for table in required_tables
                if not table_exists(
                    cur,
                    table,
                )
            ]

            if missing_tables:

                raise RuntimeError(
                    "Required database tables missing: "
                    + ", ".join(
                        missing_tables
                    )
                )

            ensure_schema(cur)

            print("   STATUS: PASS")

            # ==========================================================
            # 2. DGCA WEIGHTS
            # ==========================================================

            print()
            print("2. Loading DGCA route weights...")

            route_weights = load_route_weights(cur)

            total_weight = sum(
                item["weight"]
                for item in route_weights.values()
            )

            print(
                f"   Routes with weights : "
                f"{len(route_weights)}"
            )

            print(
                f"   Weight total        : "
                f"{total_weight:.6f}"
            )

            if not route_weights:

                raise RuntimeError(
                    "No DGCA route weights found."
                )

            if abs(
                total_weight - 1.0
            ) > 0.001:

                raise RuntimeError(
                    "DGCA route weights do not sum "
                    "to approximately 1.0."
                )

            print("   STATUS: PASS")

            # ==========================================================
            # 3. AIRFARE OBSERVATIONS
            # ==========================================================

            print()
            print(
                "3. Loading valid airfare observations..."
            )

            observations = load_observations(cur)

            print(
                f"   Eligible observations: "
                f"{len(observations)}"
            )

            if not observations:

                raise RuntimeError(
                    "No eligible airfare observations found."
                )

            print("   STATUS: PASS")

            # ==========================================================
            # 4. ROUTE APIx
            # ==========================================================

            print()
            print(
                "4. Calculating route APIx..."
            )

            route_indexes = calculate_route_indexes(
                observations
            )

            print(
                f"   Routes calculated: "
                f"{len(route_indexes)}"
            )

            for route, result in sorted(
                route_indexes.items()
            ):

                print(
                    f"   {route[0]} → {route[1]} : "
                    f"{result['index_value']:.6f} "
                    f"| windows="
                    f"{result['lead_time_windows']}/"
                    f"{len(LEAD_TIME_WINDOWS)} "
                    f"| obs="
                    f"{result['observations_used']} "
                    f"| coverage="
                    f"{result['coverage_ratio']:.2%}"
                )

            if not route_indexes:

                raise RuntimeError(
                    "No route indexes could be calculated."
                )

            print("   STATUS: PASS")

            # ==========================================================
            # 5. SAVE ROUTE APIx
            # ==========================================================

            print()
            print(
                "5. Saving route APIx..."
            )

            save_route_results(
                cur,
                route_indexes,
                route_weights,
            )

            print("   STATUS: PASS")

            # ==========================================================
            # 6. NATIONAL APIx
            # ==========================================================

            print()
            print(
                "6. Calculating National APIx..."
            )

            national = calculate_national_index(
                route_indexes,
                route_weights,
            )

            if national is None:

                print(
                    "   National APIx       : "
                    "NOT PUBLISHED"
                )

                print(
                    "   Reason: no covered "
                    "weighted routes."
                )

            else:

                print(
                    f"   National APIx       : "
                    f"{national['index_value']:.6f}"
                )

                print(
                    f"   Routes used         : "
                    f"{national['routes_used']}"
                )

                print(
                    f"   Routes expected     : "
                    f"{national['routes_expected']}"
                )

                print(
                    f"   Observations used   : "
                    f"{national['observations_used']}"
                )

                print(
                    f"   Route coverage      : "
                    f"{national['route_coverage_ratio']:.2%}"
                )

                if (
                    national[
                        "route_coverage_ratio"
                    ]
                    < MIN_ROUTE_COVERAGE
                ):

                    print(
                        "   PUBLICATION GATE: HOLD"
                    )

                    print(
                        f"   Required coverage: "
                        f"{MIN_ROUTE_COVERAGE:.0%}"
                    )

                else:

                    print(
                        "   PUBLICATION GATE: PASS"
                    )

                    save_national_result(
                        cur,
                        national,
                        route_weights,
                    )

            # ==========================================================
            # 7. DAILY ROUTE APIx
            # ==========================================================

            print()
            print(
                "7. Building historical daily "
                "route indexes..."
            )

            daily_routes = (
                calculate_route_daily_indexes(
                    observations
                )
            )

            print(
                f"   Daily route values: "
                f"{len(daily_routes)}"
            )

            save_daily_route_values(
                cur,
                daily_routes,
            )

            print("   STATUS: PASS")

            # ==========================================================
            # 8. DAILY NATIONAL APIx
            # ==========================================================

            print()
            print(
                "8. Building daily National APIx..."
            )

            save_daily_national_values(
                cur,
                daily_routes,
                route_weights,
            )

            print("   STATUS: PASS")

            # ==========================================================
            # 9. PERIODIC INDEXES
            # ==========================================================

            print()
            print(
                "9. Building periodic indexes..."
            )

            periodic_count = (
                save_periodic_indexes(cur)
            )

            print(
                f"   Periodic values generated: "
                f"{periodic_count}"
            )

            print("   STATUS: PASS")

            # ==========================================================
            # 10. BACKTEST
            # ==========================================================

            print()
            print(
                "10. 30-day backtest..."
            )

            backtest = run_backtest(cur)

            print(
                f"   Status: "
                f"{backtest['status']}"
            )

            if (
                backtest["status"]
                == "insufficient_history"
            ):

                print(
                    f"   Available daily periods: "
                    f"{backtest['available_days']}"
                )

                print(
                    "   Real history must accumulate "
                    "before a 30-day backtest "
                    "can be reported."
                )

            else:

                print(
                    f"   Window: "
                    f"{backtest['window_days']} days"
                )

                print(
                    f"   Start: "
                    f"{backtest['start_date']}"
                )

                print(
                    f"   End: "
                    f"{backtest['end_date']}"
                )

                print(
                    f"   Start index: "
                    f"{backtest['start_index']:.6f}"
                )

                print(
                    f"   End index: "
                    f"{backtest['end_index']:.6f}"
                )

                if (
                    backtest["change_percent"]
                    is not None
                ):

                    print(
                        f"   Change: "
                        f"{backtest['change_percent']:.6f}%"
                    )

                print(
                    "   STATUS: PASS"
                )

            # ==========================================================
            # FINAL VERIFICATION
            # ==========================================================

            print()
            print(
                "11. Final database verification..."
            )

            verification = (
                verify_final_database(cur)
            )

            print(
                f"   Total observations : "
                f"{verification['total_observations']}"
            )

            print(
                f"   Database routes    : "
                f"{verification['database_routes']}"
            )

            print(
                f"   Route index rows   : "
                f"{verification['route_index_rows']}"
            )

            print(
                f"   National index rows: "
                f"{verification['national_index_rows']}"
            )

            print(
                f"   Daily route rows   : "
                f"{verification['daily_route_rows']}"
            )

            print(
                f"   Daily national rows: "
                f"{verification['daily_national_rows']}"
            )

            print(
                f"   Periodic rows      : "
                f"{verification['periodic_rows']}"
            )

            print(
                "   STATUS: PASS"
            )

            # ==========================================================
            # COMMIT
            # ==========================================================

            conn.commit()

    print()
    print("=" * 70)
    print("APIx INDEX BUILD COMPLETE")
    print("=" * 70)
    print()
    print(
        "No synthetic airfare observations were generated."
    )
    print(
        "Missing routes remain uncovered."
    )
    print(
        "Flagged outliers remain retained in the database."
    )
    print(
        "DGCA passenger-volume weights are used for "
        "National APIx aggregation."
    )
    print()
    print("STATUS: SUCCESS")
    print()


if __name__ == "__main__":
    main()