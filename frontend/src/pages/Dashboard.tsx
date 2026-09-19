import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Database,
  Info,
  RefreshCw,
  Route as RouteIcon,
  ShieldCheck,
  ServerCrash
} from 'lucide-react';

import {
  getAirfares,
  getNationalHistory,
  getPeriodicIndex,
  getPipelineRuns,
  getQuality,
  getRouteHistory,
  getRoutes,
} from '../api/api';

import type {
  AirfareObservation,
  BackendRoute,
  NationalIndexRow,
  PeriodicIndexRow,
  PipelineRun,
  QualitySummary,
  RouteIndexRow,
} from '../api/types';

import TrendChart from '../components/charts/TrendChart';

const REFERENCE_ROUTE = {
  origin: 'DEL',
  destination: 'BOM',
};

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function formatCurrency(value: number) {
  return `₹${formatNumber(value, 0)}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function statusClass(status?: string | null) {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'success') return 'bg-emerald-500/10 text-emerald-600';
  if (normalized.includes('partial') || normalized.includes('warning') || normalized.includes('insufficient'))
    return 'bg-amber-500/10 text-amber-600';
  if (normalized.includes('failed') || normalized.includes('error'))
    return 'bg-rose-500/10 text-rose-600';
  return 'bg-slate-500/10 text-slate-600';
}

export default function Dashboard() {
  const [routes, setRoutes] = useState<BackendRoute[]>([]);
  const [routeHistory, setRouteHistory] = useState<RouteIndexRow[]>([]);
  const [nationalHistory, setNationalHistory] = useState<NationalIndexRow[]>([]);
  const [daily, setDaily] = useState<PeriodicIndexRow[]>([]);
  const [weekly, setWeekly] = useState<PeriodicIndexRow[]>([]);
  const [monthly, setMonthly] = useState<PeriodicIndexRow[]>([]);
  const [fares, setFares] = useState<AirfareObservation[]>([]);
  const [quality, setQuality] = useState<QualitySummary | null>(null);
  const [pipelines, setPipelines] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(showRefreshState = false) {
    if (showRefreshState) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      // Use reasonable limit defaults (50-100 instead of 5000) so endpoints respond well within timeout
      const results = await Promise.allSettled([
        getRoutes(),
        getRouteHistory(REFERENCE_ROUTE.origin, REFERENCE_ROUTE.destination, 100),
        getNationalHistory(100),
        getPeriodicIndex('daily', 100),
        getPeriodicIndex('weekly', 100),
        getPeriodicIndex('monthly', 100),
        getAirfares({ 
  origin: REFERENCE_ROUTE.origin, 
  destination: REFERENCE_ROUTE.destination, 
  limit: 500 
}),
        getQuality(),
        getPipelineRuns(100),
      ]);

      const [
        routesRes, routeHistoryRes, nationalHistoryRes,
        dailyRes, weeklyRes, monthlyRes,
        faresRes, qualityRes, pipelinesRes
      ] = results;

      if (routesRes.status === 'fulfilled') setRoutes(routesRes.value || []);
      if (routeHistoryRes.status === 'fulfilled') setRouteHistory(routeHistoryRes.value || []);
      if (nationalHistoryRes.status === 'fulfilled') setNationalHistory(nationalHistoryRes.value || []);
      if (dailyRes.status === 'fulfilled') setDaily(dailyRes.value || []);
      if (weeklyRes.status === 'fulfilled') setWeekly(weeklyRes.value || []);
      if (monthlyRes.status === 'fulfilled') setMonthly(monthlyRes.value || []);
      if (faresRes.status === 'fulfilled') setFares(faresRes.value || []);
      if (qualityRes.status === 'fulfilled') setQuality(qualityRes.value || null);
      if (pipelinesRes.status === 'fulfilled') setPipelines(pipelinesRes.value || []);

      // Only set error if critical initial calls (like getRoutes or getNationalHistory) fail
      if (routesRes.status === 'rejected' && nationalHistoryRes.status === 'rejected') {
        const primaryError = routesRes.reason instanceof Error ? routesRes.reason.message : 'Unable to load dashboard data.';
        setError(primaryError);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const latestNational = nationalHistory[0];
  const previousNational = nationalHistory[1];
  const latestRoute = routeHistory[0];
  const previousRoute = routeHistory[1];

  const nationalChange = latestNational && previousNational ? latestNational.index - previousNational.index : null;
  const routeChange = latestRoute && previousRoute ? latestRoute.index - previousRoute.index : null;
  const nationalCoverage = latestNational?.route_coverage_ratio ?? 0;
  const latestPipeline = pipelines[0];

  const validRate = quality?.valid_rate ?? (quality && quality.observations_total > 0 ? quality.observations_valid / quality.observations_total : 0);
  const flaggedCount = quality?.observations_flagged ?? Math.max(0, (quality?.observations_total || 0) - (quality?.observations_valid || 0));

  const referenceRouteFares = useMemo(() => {
    return fares.filter((fare) => fare.origin === REFERENCE_ROUTE.origin && fare.destination === REFERENCE_ROUTE.destination);
  }, [fares]);

  const advancePurchaseSummary = useMemo(() => {
    const windows = [1, 7, 15, 21, 30, 45];
    return windows.map((window) => {
      const observations = referenceRouteFares.filter((fare) => fare.advance_days === window && fare.quality_status === 'valid');
      const average = observations.length > 0 ? observations.reduce((sum, fare) => sum + fare.total_fare, 0) / observations.length : null;
      return { advanceDays: window, average, observations: observations.length };
    });
  }, [referenceRouteFares]);

  const maxAdvanceAvg = Math.max(...advancePurchaseSummary.map(a => a.average || 0));

  const routeTrend = useMemo(() => routeHistory.slice().reverse().map((row) => ({ timestamp: row.collection_timestamp, value: row.index, observations: row.observations_used })), [routeHistory]);
  const nationalTrend = useMemo(() => nationalHistory.slice().reverse().map((row) => ({ timestamp: row.collection_timestamp, value: row.index, observations: row.observations_used })), [nationalHistory]);

  const activeRoutesCount = routes.filter(r => r.active).length || 40;
  const representedRoutes = Math.round(activeRoutesCount * nationalCoverage);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-sm font-semibold uppercase tracking-widest">Initializing APIx Core…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-[#F8FAFC] min-h-screen pb-12 text-[#172033]">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] uppercase text-blue-600">
            <Activity className="h-4 w-4" />
            Statistical Airfare Monitor
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Airfare Price Index (APIx)
          </h1>
        </div>

        <button
          onClick={() => void load(true)}
          disabled={refreshing}
          className="group flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm border border-slate-200 transition-all hover:border-slate-300 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 text-blue-600 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          {refreshing ? 'Syncing...' : 'Sync Live Data'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-200 px-5 py-4 text-rose-700 shadow-sm">
          <ServerCrash className="h-6 w-6 shrink-0" />
          <div>
            <div className="font-bold text-sm">System Interruption</div>
            <div className="text-sm opacity-90">{error}</div>
          </div>
        </div>
      )}

      {/* HERO METRICS - Explicit Context Bento */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* National Index Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-7 text-white shadow-xl lg:col-span-7 flex flex-col justify-between">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl" />
          
          <div>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  <GlobeIcon /> National APIx
                </div>
                <div className="mt-1 text-xs text-slate-400">Base index = 100.00 • {formatDate(latestNational?.observation_date)}</div>
              </div>
              
              {nationalChange !== null && (
                <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${nationalChange >= 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {nationalChange >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {nationalChange >= 0 ? '+' : ''}{nationalChange.toFixed(2)} pts
                </div>
              )}
            </div>

            <div className="mt-6 flex items-baseline gap-4">
              <span className="text-[72px] font-bold leading-none tracking-tighter text-white">
                {latestNational ? latestNational.index.toFixed(2) : '100.00'}
              </span>
              <span className="text-sm font-semibold text-slate-400">pts</span>
            </div>

            {/* Concept Explanation Box */}
            <div className="mt-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 p-3.5 text-xs text-slate-300 leading-relaxed">
              <div className="font-bold text-white mb-0.5 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                What is APIx?
              </div>
              APIx measures how domestic airfare prices are moving relative to the prototype base period of 100. A value above 100 indicates higher observed fare levels relative to the base.
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-800 pt-5">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Weighted Route Coverage</span>
                <span className="text-white font-bold">{formatNumber(nationalCoverage * 100, 1)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800 mb-2">
                <div className="h-full rounded-full bg-blue-500 transition-all duration-1000" style={{ width: `${Math.min(100, nationalCoverage * 100)}%` }} />
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                {representedRoutes} of {activeRoutesCount} representative routes currently have sufficient valid data for national aggregation. Routes without adequate observations are excluded rather than estimated.
              </p>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-300 mb-1">Observations Used</div>
              <div className="text-xl font-bold text-white mb-1">{formatNumber(latestNational?.observations_used || 0)}</div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Valid airfare observations currently eligible for index calculation after validation and quality checks.
              </p>
            </div>
          </div>
        </div>

        {/* Reference Route Signal Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/90 p-7 shadow-sm lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Reference Route Signal
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-bold text-slate-800 border border-slate-200">DEL</span>
                  <span className="text-slate-400 font-bold">→</span>
                  <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-bold text-slate-800 border border-slate-200">BOM</span>
                </div>
              </div>
              
              {routeChange !== null && (
                <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${routeChange >= 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                  {routeChange >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {routeChange >= 0 ? '+' : ''}{routeChange.toFixed(2)} pts
                </div>
              )}
            </div>

            <div className="mt-6 flex items-baseline gap-3">
              <span className="text-[60px] font-bold leading-none tracking-tighter text-slate-900">
                {latestRoute ? latestRoute.index.toFixed(2) : '100.00'}
              </span>
              <span className="text-xs font-semibold text-slate-500">{formatNumber(latestRoute?.observations_used || 0)} valid observations</span>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-100 p-4 text-xs text-slate-600 leading-relaxed">
              <div className="font-bold text-slate-900 mb-1">Route Signal Mechanism</div>
              The route index tracks airfare movement for this individual route. Its DGCA passenger volume determines its contribution to the national index.
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-slate-500 border-t border-slate-100 pt-4">
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-slate-700 font-semibold">Non-stop Directs</span>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-slate-700 font-semibold">Advance: T+1 to T+45</span>
          </div>
        </div>
      </div>

      {/* SYSTEM HEALTH STRIP */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
        <HealthCard title="Total Observations" value={formatNumber(quality?.observations_total || fares.length)} icon={<Database className="h-4 w-4 text-slate-400" />} />
        <HealthCard title="Valid Data Rate" value={`${formatNumber(validRate * 100, 1)}%`} icon={<ShieldCheck className="h-4 w-4 text-emerald-500" />} />
        <HealthCard title="Flagged Outliers" value={formatNumber(flaggedCount)} icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} />
        <HealthCard title="Active Network Routes" value={activeRoutesCount.toString()} icon={<RouteIcon className="h-4 w-4 text-blue-500" />} />
        <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-sm col-span-2 md:col-span-4 lg:col-span-1 flex flex-col justify-center">
           <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Pipeline Status</div>
           <div className={`inline-flex w-max items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${statusClass(latestPipeline?.status)}`}>
              {latestPipeline?.status ? latestPipeline.status.toUpperCase() : 'ACTIVE'}
           </div>
           <div className="mt-1.5 text-[11px] text-slate-400">{formatDateTime(latestPipeline?.started_at)}</div>
        </div>
      </div>

      {/* TREND CHARTS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-sm">
          <TrendChart 
            data={nationalTrend} 
            title="National APIx Trend" 
            label="MACRO MOVEMENT" 
            emptyExplanation="National trend requires accumulated daily observations. The system currently has a limited history; a longer real-time history is required before a full 30-day trend is reported."
          />
        </div>
        <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-sm">
          <TrendChart 
            data={routeTrend} 
            title="Route Trend (DEL → BOM)" 
            label="MICRO MOVEMENT" 
            emptyExplanation="Route trends reflect pricing shifts for key high-density corridors across observation windows."
          />
        </div>
      </div>

      {/* INSIGHTS ROW */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Advance Purchase Visualizer */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-7 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">
              <Calendar className="h-4 w-4 text-blue-600" /> Pricing Behavior
            </div>
            <h2 className="text-xl font-bold text-slate-900">Average Fare by Advance Purchase (DEL → BOM)</h2>
            
            <div className="mt-2 rounded-xl bg-blue-50/60 border border-blue-100 p-3 text-xs text-blue-900 leading-relaxed mb-6">
              <span className="font-bold">How does booking time affect observed fares?</span> APIx monitors the same route at multiple advance-purchase windows to capture how airfare changes as the travel date approaches.
            </div>

            <div className="space-y-4">
              {advancePurchaseSummary.map((item) => (
                <div key={item.advanceDays} className="flex items-center gap-4">
                  <div className="w-12 text-xs font-bold text-slate-700">T+{item.advanceDays}</div>
                  <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden relative">
                    <div 
                      className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000" 
                      style={{ width: item.average && maxAdvanceAvg ? `${(item.average / maxAdvanceAvg) * 100}%` : '0%' }} 
                    />
                  </div>
                  <div className="w-28 text-right">
                    {item.average !== null ? (
                      <div className="text-sm font-bold text-slate-900">{formatCurrency(item.average)}</div>
                    ) : (
                      <div className="text-xs font-medium text-slate-400">Awaiting data</div>
                    )}
                    <div className="text-[10px] font-medium text-slate-400">{item.observations} valid obs</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Periodic APIx List */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-7 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">
              <BarChart3 className="h-4 w-4 text-blue-600" /> Time Horizons
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Periodic APIx</h2>
            
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Periodic APIx summarizes observed airfare movement over different time horizons, allowing daily, weekly and monthly monitoring as real history accumulates.
            </p>

            <div className="space-y-3">
              {[
                { label: 'Daily Index', row: daily[0] },
                { label: 'Weekly Index', row: weekly[0] },
                { label: 'Monthly Index', row: monthly[0] },
              ].map(({ label, row }) => (
                <div key={label} className="rounded-2xl bg-slate-50 border border-slate-100 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</div>
                    <div className="text-[10px] font-medium text-slate-400 mt-0.5">{row ? formatDate(row.period_start) : 'Base sequence'}</div>
                  </div>
                  <div className="text-right">
                    {row ? (
                      <div className="text-xl font-bold text-slate-900">{row.index.toFixed(2)}</div>
                    ) : (
                      <div className="text-xs font-semibold text-slate-400">100.00 (Base)</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function HealthCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</div>
        {icon}
      </div>
      <div className="text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
    </svg>
  );
}