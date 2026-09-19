export interface BackendRoute {
  origin: string;
  destination: string;
  active: boolean;
  route_name?: string | null;
  source?: string | null;
  passenger_volume?: number | null;
  volume_period?: string | null;
  weight?: number | null;
}

export interface RouteIndexRow {
  collection_timestamp: string;
  observation_date: string;
  index: number;
  lead_time_windows: number;
  observations_used: number;
  coverage_ratio: number;
}

export interface NationalIndexRow {
  collection_timestamp: string;
  observation_date: string;
  index: number;
  routes_used: number;
  routes_expected: number;
  route_coverage_ratio: number;
  observations_used: number;
  weight_reference_period: string | null;
}

export interface PeriodicIndexRow {
  period_start: string;
  period_end: string;
  index: number;
  source_observations: number;
  source_days: number;
  route_coverage_ratio: number;
  methodology_version: string;
}

export interface AirfareObservation {
  observation_id: string;
  collection_timestamp: string;
  origin: string;
  destination: string;
  travel_date: string;
  advance_days: number;
  airline: string;
  flight_number: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  duration_minutes: number | null;
  stops: number;
  total_fare: number;
  base_fare: number | null;
  tax_amount: number | null;
  airport_fee: number | null;
  udf: number | null;
  convenience_fee: number | null;
  other_mandatory_fee: number | null;
  fare_components_complete: boolean;
  currency: string;
  quality_status: 'valid' | 'flagged' | string;
  quality_flags: unknown;
  flight_instance_id: string | null;
  fare_match_key: string | null;
  source: string;
  source_metadata: unknown;
}

export interface QualitySummary {
  observations_total: number;
  observations_valid: number;
  observations_flagged: number;
  fare_component_complete: number;
  collection_runs: number;
  collection_runs_success: number;
  collection_runs_non_success: number;
  active_routes: number;
  valid_rate: number;
  outlier_rate: number;
  events?: Record<string, number>;
}

export interface CollectionRun {
  id: string;
  pipeline_run_id: string | null;
  source: string;
  origin: string;
  destination: string;
  travel_date: string;
  advance_days: number;
  collection_timestamp: string;
  status: string;
  raw_records: number;
  valid_records: number;
  rejected_records: number;
  duplicate_records: number;
  outliers_flagged: number;
  source_metadata: unknown;
}

export interface PipelineRun {
  pipeline_run_id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  routes_requested: number;
  routes_succeeded: number;
  routes_failed: number;
  observations_collected: number;
  errors: unknown;
  metadata: unknown;
}

export interface BacktestRun {
  backtest_run_id: string;
  started_at: string;
  finished_at: string | null;
  reference_source: string;
  status: string;
  observations_compared: number;
  routes_compared: number;
  metrics: Record<string, number | null>;
  methodology_version: string;
}

export interface Methodology {
  version: string;
  base_index: number;
  lead_time_windows: number[];
  elementary_formula: string;
  price_relative: string;
  route_aggregation: string;
  national_aggregation: string;
  outlier_policy: string;
  missing_source_policy: string;
  fare_component_policy: string;
  cpi_relationship: string;
}

export interface SourceCapability {
  name: string;
  source_type?: string;
  enabled?: boolean;
  capabilities?: string[];
  [key: string]: unknown;
}

export interface IndexHistory { timestamp: string; value: number; observations: number; }
