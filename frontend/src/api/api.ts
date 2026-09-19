import request from './client';
import type {
  AirfareObservation, BackendRoute, RouteIndexRow, NationalIndexRow,
  PeriodicIndexRow, QualitySummary, CollectionRun, PipelineRun,
  Methodology, SourceCapability, BacktestRun,
} from './types';

export const getHealth = () => request<any>('/api/health');
export const getConfig = () => request<any>('/api/config');
export const getRoutes = () => request<BackendRoute[]>('/api/routes');

export const getRouteHistory = (origin: string, destination: string, limit = 5000) =>
  request<RouteIndexRow[]>(`/api/index/route/${origin.toUpperCase()}/${destination.toUpperCase()}?limit=${limit}`);

export const getNationalHistory = (limit = 5000) =>
  request<NationalIndexRow[]>(`/api/index/national?limit=${limit}`);

export const getPeriodicIndex = (frequency: 'daily'|'weekly'|'monthly', limit = 5000) =>
  request<PeriodicIndexRow[]>(`/api/index/periodic/${frequency}?limit=${limit}`);

export interface AirfareQuery {
  origin?: string;
  destination?: string;
  travel_date?: string;
  advance_days?: number;
  airline?: string;
  quality_status?: string;
  limit?: number;
  offset?: number;
}
export const getAirfares = (q: AirfareQuery = {}) => {
  const p = new URLSearchParams();
  Object.entries(q).forEach(([k,v]) => v !== undefined && v !== '' && p.set(k, String(v)));
  return request<AirfareObservation[]>(`/api/airfares?${p.toString()}`);
};

export const getQuality = () => request<QualitySummary>('/api/quality');
export const getQualityEvents = (limit=100) => request<any[]>(`/api/quality/events?limit=${limit}`);
export const getCollectionRuns = (limit=5000) => request<CollectionRun[]>(`/api/collection/runs?limit=${limit}`);
export const getPipelineRuns = (limit=100) => request<PipelineRun[]>(`/api/pipeline/runs?limit=${limit}`);
export const getMethodology = () => request<Methodology>('/api/methodology');
export const getSources = () => request<SourceCapability[]>('/api/sources');
export const getHeatmap = () => request<any[]>('/api/analytics/heatmap');
export const getElasticity = (origin:string,destination:string) =>
  request<any>(`/api/analytics/elasticity/${origin.toUpperCase()}/${destination.toUpperCase()}`);
export const getDiagnostics = () => request<any>('/api/analytics/diagnostics');
export const getBacktestRuns = (limit=20) => request<BacktestRun[]>(`/api/backtest/runs?limit=${limit}`);

export { type AirfareObservation, type BackendRoute, type RouteIndexRow, type NationalIndexRow, type PeriodicIndexRow };
