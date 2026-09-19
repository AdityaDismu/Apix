CREATE TABLE IF NOT EXISTS pipeline_runs (
    pipeline_run_id UUID PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running','success','partial_success','failed')),
    routes_requested INTEGER NOT NULL DEFAULT 0,
    routes_succeeded INTEGER NOT NULL DEFAULT 0,
    routes_failed INTEGER NOT NULL DEFAULT 0,
    observations_collected INTEGER NOT NULL DEFAULT 0,
    error_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS collection_runs (
    id BIGSERIAL PRIMARY KEY,
    pipeline_run_id UUID REFERENCES pipeline_runs(pipeline_run_id) ON DELETE SET NULL,
    source TEXT NOT NULL,
    origin CHAR(3) NOT NULL,
    destination CHAR(3) NOT NULL,
    travel_date DATE NOT NULL,
    advance_days INTEGER NOT NULL CHECK(advance_days >= 0),
    collection_timestamp TIMESTAMPTZ NOT NULL,
    collection_status TEXT NOT NULL,
    source_file TEXT,
    clean_file TEXT,
    schema_version TEXT,
    cleaning_version TEXT,
    raw_records INTEGER NOT NULL DEFAULT 0,
    valid_records INTEGER NOT NULL DEFAULT 0,
    rejected_records INTEGER NOT NULL DEFAULT 0,
    duplicate_records INTEGER NOT NULL DEFAULT 0,
    outliers_flagged INTEGER NOT NULL DEFAULT 0,
    source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    run_fingerprint TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS airfare_observations (
    id BIGSERIAL PRIMARY KEY,
    observation_id UUID NOT NULL UNIQUE,
    collection_run_id BIGINT REFERENCES collection_runs(id) ON DELETE SET NULL,
    pipeline_run_id UUID REFERENCES pipeline_runs(pipeline_run_id) ON DELETE SET NULL,
    source TEXT NOT NULL,
    collection_timestamp TIMESTAMPTZ NOT NULL,
    origin CHAR(3) NOT NULL,
    destination CHAR(3) NOT NULL,
    travel_date DATE NOT NULL,
    advance_days INTEGER NOT NULL CHECK(advance_days >= 0),
    airline TEXT NOT NULL,
    flight_number TEXT,
    departure_time TIME,
    arrival_time TIME,
    duration_minutes INTEGER CHECK(duration_minutes IS NULL OR duration_minutes > 0),
    stops INTEGER NOT NULL DEFAULT 0 CHECK(stops >= 0),
    total_fare NUMERIC(12,2) NOT NULL CHECK(total_fare > 0),
    base_fare NUMERIC(12,2),
    tax_amount NUMERIC(12,2),
    airport_fee NUMERIC(12,2),
    udf NUMERIC(12,2),
    convenience_fee NUMERIC(12,2),
    other_mandatory_fee NUMERIC(12,2),
    fare_components_complete BOOLEAN NOT NULL DEFAULT FALSE,
    currency CHAR(3) NOT NULL DEFAULT 'INR' CHECK(currency='INR'),
    fare_class TEXT NOT NULL DEFAULT 'economy' CHECK(fare_class='economy'),
    trip_type TEXT NOT NULL DEFAULT 'one-way' CHECK(trip_type='one-way'),
    availability TEXT NOT NULL DEFAULT 'available',
    flight_instance_id TEXT,
    fare_match_key TEXT,
    quality_status TEXT NOT NULL DEFAULT 'valid' CHECK(quality_status IN ('valid','flagged')),
    quality_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routes (
    route_id BIGSERIAL PRIMARY KEY,
    origin CHAR(3) NOT NULL,
    destination CHAR(3) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    route_name TEXT,
    source TEXT,
    passenger_volume NUMERIC(18,2),
    volume_period TEXT,
    weight NUMERIC(18,10),
    effective_from DATE,
    effective_to DATE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE(origin,destination),
    CHECK(origin<>destination),
    CHECK(weight IS NULL OR (weight>=0 AND weight<=1)),
    CHECK(passenger_volume IS NULL OR passenger_volume>=0)
);

CREATE TABLE IF NOT EXISTS route_weights (
    weight_id BIGSERIAL PRIMARY KEY,
    origin CHAR(3) NOT NULL,
    destination CHAR(3) NOT NULL,
    weight NUMERIC(18,10) NOT NULL CHECK(weight>=0 AND weight<=1),
    source TEXT NOT NULL,
    reference_period TEXT NOT NULL,
    passenger_volume NUMERIC(18,2),
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(origin,destination,reference_period)
);

CREATE TABLE IF NOT EXISTS index_snapshots (
    snapshot_id BIGSERIAL PRIMARY KEY,
    pipeline_run_id UUID REFERENCES pipeline_runs(pipeline_run_id) ON DELETE SET NULL,
    origin CHAR(3) NOT NULL,
    destination CHAR(3) NOT NULL,
    advance_days INTEGER NOT NULL,
    travel_date DATE NOT NULL,
    collection_timestamp TIMESTAMPTZ NOT NULL,
    index_value NUMERIC(18,6) NOT NULL,
    base_index NUMERIC(18,6) NOT NULL DEFAULT 100,
    observations_used INTEGER NOT NULL,
    matched_observations INTEGER NOT NULL,
    coverage_ratio NUMERIC(10,6),
    calculation_method TEXT NOT NULL DEFAULT 'matched_jevons',
    base_snapshot_timestamp TIMESTAMPTZ,
    methodology_version TEXT NOT NULL DEFAULT '4.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(origin,destination,advance_days,travel_date,collection_timestamp)
);

CREATE TABLE IF NOT EXISTS index_components (
    component_id BIGSERIAL PRIMARY KEY,
    snapshot_id BIGINT NOT NULL REFERENCES index_snapshots(snapshot_id) ON DELETE CASCADE,
    flight_instance_id TEXT NOT NULL,
    base_fare NUMERIC(12,2) NOT NULL,
    current_fare NUMERIC(12,2) NOT NULL,
    price_relative NUMERIC(18,10) NOT NULL,
    airline TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(snapshot_id,flight_instance_id)
);

CREATE TABLE IF NOT EXISTS route_index_values (
    route_index_id BIGSERIAL PRIMARY KEY,
    pipeline_run_id UUID REFERENCES pipeline_runs(pipeline_run_id) ON DELETE SET NULL,
    origin CHAR(3) NOT NULL,
    destination CHAR(3) NOT NULL,
    collection_timestamp TIMESTAMPTZ NOT NULL,
    observation_date DATE NOT NULL,
    index_value NUMERIC(18,6) NOT NULL,
    lead_time_windows INTEGER NOT NULL,
    observations_used INTEGER NOT NULL,
    coverage_ratio NUMERIC(10,6),
    methodology_version TEXT NOT NULL DEFAULT '4.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(origin,destination,collection_timestamp)
);

CREATE TABLE IF NOT EXISTS national_index_values (
    national_index_id BIGSERIAL PRIMARY KEY,
    pipeline_run_id UUID REFERENCES pipeline_runs(pipeline_run_id) ON DELETE SET NULL,
    collection_timestamp TIMESTAMPTZ NOT NULL,
    observation_date DATE NOT NULL,
    index_value NUMERIC(18,6) NOT NULL,
    routes_used INTEGER NOT NULL,
    routes_expected INTEGER NOT NULL DEFAULT 0,
    route_coverage_ratio NUMERIC(10,6),
    observations_used INTEGER NOT NULL,
    weight_reference_period TEXT,
    methodology_version TEXT NOT NULL DEFAULT '4.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(collection_timestamp)
);

CREATE TABLE IF NOT EXISTS periodic_index_values (
    periodic_index_id BIGSERIAL PRIMARY KEY,
    frequency TEXT NOT NULL CHECK(frequency IN ('daily','weekly','monthly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    index_value NUMERIC(18,6) NOT NULL,
    source_observations INTEGER NOT NULL,
    source_days INTEGER NOT NULL,
    route_coverage_ratio NUMERIC(10,6),
    methodology_version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(frequency,period_start)
);

CREATE TABLE IF NOT EXISTS data_quality_events (
    quality_event_id BIGSERIAL PRIMARY KEY,
    pipeline_run_id UUID REFERENCES pipeline_runs(pipeline_run_id) ON DELETE SET NULL,
    collection_run_id BIGINT REFERENCES collection_runs(id) ON DELETE SET NULL,
    origin CHAR(3), destination CHAR(3),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'warning',
    count INTEGER NOT NULL DEFAULT 1,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backtest_runs (
    backtest_run_id UUID PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    reference_source TEXT NOT NULL,
    reference_period TEXT,
    status TEXT NOT NULL CHECK(status IN ('running','success','partial_success','failed')),
    observations_compared INTEGER NOT NULL DEFAULT 0,
    routes_compared INTEGER NOT NULL DEFAULT 0,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    errors JSONB NOT NULL DEFAULT '[]'::jsonb,
    methodology_version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS backtest_observations (
    id BIGSERIAL PRIMARY KEY,
    backtest_run_id UUID NOT NULL REFERENCES backtest_runs(backtest_run_id) ON DELETE CASCADE,
    route_origin CHAR(3) NOT NULL,
    route_destination CHAR(3) NOT NULL,
    period_start DATE NOT NULL,
    api_index NUMERIC(18,8) NOT NULL,
    reference_value NUMERIC(18,8) NOT NULL,
    api_change_pct NUMERIC(18,8),
    reference_change_pct NUMERIC(18,8),
    absolute_error NUMERIC(18,8),
    squared_error NUMERIC(18,8)
);

CREATE TABLE IF NOT EXISTS methodology_versions (
    methodology_version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    base_index NUMERIC(18,6) NOT NULL,
    lead_time_windows JSONB NOT NULL,
    source_policy JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safe upgrades for databases created by the previous MVP.
ALTER TABLE collection_runs ADD COLUMN IF NOT EXISTS source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE airfare_observations ADD COLUMN IF NOT EXISTS base_fare NUMERIC(12,2);
ALTER TABLE airfare_observations ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2);
ALTER TABLE airfare_observations ADD COLUMN IF NOT EXISTS airport_fee NUMERIC(12,2);
ALTER TABLE airfare_observations ADD COLUMN IF NOT EXISTS udf NUMERIC(12,2);
ALTER TABLE airfare_observations ADD COLUMN IF NOT EXISTS convenience_fee NUMERIC(12,2);
ALTER TABLE airfare_observations ADD COLUMN IF NOT EXISTS other_mandatory_fee NUMERIC(12,2);
ALTER TABLE airfare_observations ADD COLUMN IF NOT EXISTS fare_components_complete BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE airfare_observations ADD COLUMN IF NOT EXISTS source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE airfare_observations ADD COLUMN IF NOT EXISTS fare_match_key TEXT;
ALTER TABLE route_index_values ADD COLUMN IF NOT EXISTS coverage_ratio NUMERIC(10,6);
ALTER TABLE national_index_values ADD COLUMN IF NOT EXISTS routes_expected INTEGER NOT NULL DEFAULT 0;
ALTER TABLE national_index_values ADD COLUMN IF NOT EXISTS route_coverage_ratio NUMERIC(10,6);

CREATE UNIQUE INDEX IF NOT EXISTS idx_collection_run_fingerprint ON collection_runs(run_fingerprint);
CREATE INDEX IF NOT EXISTS idx_collection_pipeline ON collection_runs(pipeline_run_id);
CREATE INDEX IF NOT EXISTS idx_airfare_route_time ON airfare_observations(origin,destination,collection_timestamp);
CREATE INDEX IF NOT EXISTS idx_airfare_route_travel_lead ON airfare_observations(origin,destination,travel_date,advance_days);
CREATE INDEX IF NOT EXISTS idx_airfare_quality ON airfare_observations(quality_status);
CREATE INDEX IF NOT EXISTS idx_airfare_flight_instance ON airfare_observations(flight_instance_id);
CREATE INDEX IF NOT EXISTS idx_airfare_match_key ON airfare_observations(origin,destination,advance_days,fare_match_key,collection_timestamp);
CREATE INDEX IF NOT EXISTS idx_snapshot_route_time ON index_snapshots(origin,destination,collection_timestamp);
CREATE INDEX IF NOT EXISTS idx_route_index_time ON route_index_values(origin,destination,collection_timestamp);
CREATE INDEX IF NOT EXISTS idx_national_index_time ON national_index_values(collection_timestamp);
CREATE INDEX IF NOT EXISTS idx_periodic_frequency_period ON periodic_index_values(frequency,period_start);
CREATE INDEX IF NOT EXISTS idx_quality_pipeline ON data_quality_events(pipeline_run_id);
CREATE INDEX IF NOT EXISTS idx_backtest_route_period ON backtest_observations(route_origin,route_destination,period_start);

INSERT INTO methodology_versions(methodology_version,name,description,base_index,lead_time_windows,source_policy)
VALUES('4.0','APIx Real-Time Prototype v4','Live airfare collection with route-weighted aggregation, explicit source capabilities, coverage controls and reproducible versioning.',100,'[1,7,15,21,30,45]'::jsonb,'{"no_fabricated_values":true,"outlier_policy":"flag_not_delete","protected_source_policy":"stop_on_block_or_captcha"}'::jsonb)
ON CONFLICT(methodology_version) DO NOTHING;
