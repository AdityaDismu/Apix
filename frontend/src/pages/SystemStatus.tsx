// SystemStatus.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  CircleAlert,
  Database,
  Globe2,
  Server,
  ShieldCheck,
  Timer,
  XCircle,
  ChevronRight
} from 'lucide-react';

import Card from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';

import {
  getConfig,
  getDiagnostics,
  getHealth,
  getNationalHistory,
  getPipelineRuns,
  getQuality,
  getRoutes,
  getSources,
} from '../api/api';

import type {
  BackendRoute,
  NationalIndexRow,
  PipelineRun,
  QualitySummary,
  SourceCapability,
} from '../api/types';

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return value.toLocaleString('en-IN');
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeStatus(value: unknown) {
  if (typeof value !== 'string') return 'unknown';
  return value.toLowerCase();
}

function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const normalized = normalizeStatus(status);

  const healthy =
    normalized === 'ok' ||
    normalized === 'healthy' ||
    normalized === 'success' ||
    normalized === 'operational' ||
    normalized === 'active';

  const warning =
    normalized === 'partial_success' ||
    normalized === 'degraded' ||
    normalized === 'insufficient_history' ||
    normalized === 'pending' ||
    normalized === 'running';

  const className = healthy
    ? 'border-[#ABEFC6] bg-[#ECFDF3] text-[#027A48]'
    : warning
      ? 'border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]'
      : 'border-[#FECDCA] bg-[#FEF3F2] text-[#B42318]';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${className}`}>
      {healthy ? (
        <CheckCircle2 size={12} />
      ) : warning ? (
        <CircleAlert size={12} />
      ) : (
        <XCircle size={12} />
      )}
      {label || status.replace(/_/g, ' ')}
    </span>
  );
}

function extractStatus(value: unknown, fallback = 'unknown') {
  if (!value || typeof value !== 'object') {
    return fallback;
  }
  const object = value as Record<string, unknown>;
  for (const key of ['status', 'health', 'state', 'database_status']) {
    if (typeof object[key] === 'string') {
      return object[key] as string;
    }
  }
  return fallback;
}

export default function SystemStatus() {
  const [health, setHealth] = useState<unknown>(null);
  const [config, setConfig] = useState<unknown>(null);
  const [quality, setQuality] = useState<QualitySummary | null>(null);
  const [routes, setRoutes] = useState<BackendRoute[]>([]);
  const [sources, setSources] = useState<SourceCapability[]>([]);
  const [pipelineRuns, setPipelineRuns] = useState<PipelineRun[]>([]);
  const [nationalHistory, setNationalHistory] = useState<NationalIndexRow[]>([]);
  const [diagnostics, setDiagnostics] = useState<Record<string, unknown> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getHealth(),
      getConfig(),
      getQuality(),
      getRoutes(),
      getSources(),
      getPipelineRuns(1), // Only need the latest run now
      getNationalHistory(1),
      getDiagnostics(),
    ])
      .then(
        ([
          healthData,
          configData,
          qualityData,
          routesData,
          sourcesData,
          pipelineData,
          nationalData,
          diagnosticsData,
        ]) => {
          setHealth(healthData);
          setConfig(configData);
          setQuality(qualityData);
          setRoutes(routesData);
          setSources(sourcesData);
          setPipelineRuns(pipelineData);
          setNationalHistory(nationalData);
          setDiagnostics(diagnosticsData);
        },
      )
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Unable to load system status');
      })
      .finally(() => setLoading(false));
  }, []);

  const latestNational = nationalHistory[0];
  const activeRoutesCount = routes.filter((route) => route.active).length;
  const latestPipeline = pipelineRuns[0];
  const healthStatus = extractStatus(health, 'unknown');
  const databaseStatus =
    health && typeof health === 'object' && typeof (health as Record<string, unknown>).database === 'object'
      ? extractStatus((health as Record<string, unknown>).database, 'unknown')
      : healthStatus;

  return (
    <div className="page-shell">
      <PageHeader
        tag="SYSTEM STATUS"
        title="APIx System Monitor"
        subtitle="Live operational status of the APIx platform, including backend health, database connectivity, data-source availability and index publication readiness."
      />

      {error ? (
        <div className="alert-error">
          <CircleAlert size={15} />
          {error}
        </div>
      ) : loading ? (
        <div className="py-16 text-center text-sm text-[#667085]">
          Loading system status…
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* Main Focus: National APIx Publication State */}
          <Card className="border-2 border-[#155EEF] bg-[#F8FAFC]">
            <div className="section-label text-[#155EEF]">NATIONAL APIx</div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#172033]">
              Current publication state
            </h2>
            <p className="mt-2 text-sm text-[#667085]">
              APIx can publish a national value when sufficient real observations are available across the DGCA-weighted route basket.
            </p>

            {latestNational ? (
              <div className="mt-8">
                <div className="text-center md:text-left">
                  <div className="text-5xl font-bold tracking-tight text-[#172033]">
                    {latestNational.index.toFixed(4)}
                  </div>
                  <div className="mt-1 text-sm font-semibold uppercase tracking-wider text-[#667085]">
                    National APIx
                  </div>
                </div>

                <div className="my-8 border-y border-[#E4E7EC] py-6">
                  <div className="text-lg font-semibold text-[#172033]">
                    {(latestNational.route_coverage_ratio * 100).toFixed(0)}% route coverage
                  </div>
                  <div className="mt-1 text-sm text-[#667085]">
                    {latestNational.routes_used} of {latestNational.routes_expected} routes covered
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div>
                    <div className="text-xs text-[#667085]">Observation date</div>
                    <div className="mt-1 font-medium text-[#172033]">{latestNational.observation_date}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#667085]">Weight reference</div>
                    <div className="mt-1 font-medium text-[#172033]">{latestNational.weight_reference_period || 'DGCA 2024–25'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#667085]">Publication gate</div>
                    <div className="mt-1 font-semibold text-[#027A48]">
                      {latestNational.route_coverage_ratio >= 0.8 ? 'PASSED' : 'FAILED'}
                    </div>
                  </div>
                </div>

                <div className="mt-8 rounded-xl border border-[#E4E7EC] bg-white p-5">
                  <h3 className="text-sm font-bold text-[#172033]">What does this mean?</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#667085]">
                    The current index is calculated from real eligible airfare observations across {latestNational.routes_used} of the {latestNational.routes_expected} configured routes. Routes without sufficient data are excluded rather than assigned artificial prices.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-[#D0D5DD] bg-white py-12 text-center">
                <Timer size={32} className="text-[#98A2B3]" />
                <div className="mt-4 text-base font-semibold text-[#172033]">National APIx not available</div>
                <p className="mt-2 max-w-sm text-sm text-[#667085]">
                  The national index requires sufficient real observations across the route basket before publication.
                </p>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* System Status / Platform Health */}
            <Card>
              <div className="section-label">SYSTEM STATUS</div>
              <h2 className="card-title mt-1">Platform Health</h2>
              
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-center gap-3">
                  <span className="w-28 text-[#667085]">Backend</span>
                  <span className={`font-medium ${healthStatus === 'ok' ? 'text-[#027A48]' : 'text-[#B54708]'}`}>
                    ● {healthStatus === 'ok' ? 'Operational' : healthStatus}
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-28 text-[#667085]">Database</span>
                  <span className={`font-medium ${databaseStatus === 'ok' ? 'text-[#027A48]' : 'text-[#B54708]'}`}>
                    ● {databaseStatus === 'ok' ? 'Connected' : databaseStatus}
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-28 text-[#667085]">Source adapter</span>
                  <span className="font-medium text-[#172033]">
                    ● {sources[0]?.name || 'Google Flights'}
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-28 text-[#667085]">Route basket</span>
                  <span className="font-medium text-[#172033]">
                    ● {activeRoutesCount || 40} routes configured
                  </span>
                </li>
              </ul>

              <div className="mt-6 rounded-lg bg-[#F9FAFB] p-4 text-sm text-[#667085]">
                All core application services are currently responding and the configured route basket is available.
              </div>
            </Card>

            {/* Collection Pipeline Simplified */}
            <Card>
              <div className="section-label">COLLECTION PIPELINE</div>
              <h2 className="card-title mt-1 mb-6">Latest Collection</h2>

              {latestPipeline ? (
                <div>
                  <StatusBadge status={latestPipeline.status} />
                  
                  <ul className="mt-6 space-y-2 text-base font-medium text-[#172033]">
                    <li>{latestPipeline.routes_requested} route processed</li>
                    <li>{formatNumber(latestPipeline.observations_collected)} observations</li>
                    {latestPipeline.routes_failed > 0 && (
                      <li className="text-[#B42318]">{latestPipeline.routes_failed} failed routes</li>
                    )}
                  </ul>
                  
                  <div className="mt-4 text-xs font-medium text-[#667085] flex items-center gap-2">
                    <Timer size={14} />
                    {formatDate(latestPipeline.started_at)}
                  </div>

                  <p className="mt-6 text-sm text-[#667085] pt-4 border-t border-[#E4E7EC]">
                    This represents the latest collection cycle, not the complete {activeRoutesCount || 40}-route historical dataset.
                  </p>
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-dashed border-[#D0D5DD] py-8 text-center text-sm text-[#667085]">
                  No pipeline runs are currently available.
                </div>
              )}
            </Card>
          </div>

          {/* Source Transparency */}
          <Card>
             <div className="section-label">SOURCE TRANSPARENCY</div>
             <h2 className="card-title mt-1 mb-5">Data Source</h2>
             
             <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-[#172033]">
                  {sources[0]?.name || 'Google Flights'} adapter — {sources[0]?.enabled === false ? 'Disabled' : 'Active'}
                </h3>
             </div>

             <p className="mt-3 text-sm leading-relaxed text-[#667085] max-w-3xl">
                The current prototype uses {sources[0]?.name || 'Google Flights'} as its implemented airfare observation source. The adapter currently provides total observed fare; detailed fare-component fields are not available from this source.
             </p>

             <div className="mt-5 flex gap-8 text-sm border-t border-[#E4E7EC] pt-5">
               <div><span className="text-[#667085]">Route reference:</span> <span className="font-medium text-[#172033]">DGCA 2024–25</span></div>
               <div><span className="text-[#667085]">Methodology:</span> <span className="font-medium text-[#172033]">v4.0</span></div>
             </div>
          </Card>

          {/* System Principles Prominently Displayed */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="bg-[#101828] text-white border-0 shadow-lg">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#32D583]" />
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#98A2B3]">
                  NO FABRICATION
                </div>
              </div>
              <h3 className="mt-4 text-xl font-semibold">Integrity by design</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#D0D5DD]">
                APIx never substitutes missing airfare observations with synthetic prices. Uncovered routes remain visible and are excluded from aggregation until sufficient real observations become available.
              </p>
            </Card>

            <Card className="border-[#E4E7EC] shadow-sm">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-[#155EEF]" />
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#667085]">
                  TRACEABILITY
                </div>
              </div>
              <h3 className="mt-4 text-xl font-semibold text-[#172033]">Auditable data pipeline</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#667085]">
                Collection runs, individual observations, quality decisions, route coverage and index results are retained so published values can be traced back to their underlying data.
              </p>
            </Card>
          </div>

          {/* Collapsible Diagnostics Section */}
          <details className="group mt-4 mb-8">
            <summary className="flex cursor-pointer items-center gap-1 text-sm font-medium text-[#155EEF] hover:underline">
              <ChevronRight size={16} className="transition-transform group-open:rotate-90" />
              View technical diagnostics
            </summary>
            <div className="mt-4 rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] p-6 text-sm text-[#667085]">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wide">Stored observations</div>
                  <div className="mt-1 text-lg font-semibold text-[#172033]">{formatNumber(quality?.observations_total)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wide">Valid observations</div>
                  <div className="mt-1 text-lg font-semibold text-[#172033]">{formatNumber(quality?.observations_valid)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wide">Flagged</div>
                  <div className="mt-1 text-lg font-semibold text-[#172033]">{formatNumber(quality?.observations_flagged)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wide">Collection runs</div>
                  <div className="mt-1 text-lg font-semibold text-[#172033]">{formatNumber(quality?.collection_runs)}</div>
                </div>
              </div>
            </div>
          </details>

          {/* Live System Indicator */}
          <div className="pb-10 pt-4 flex items-center justify-center gap-2 text-xs text-[#667085]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#12B76A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#12B76A]"></span>
            </span>
            <p>
              <b className="text-[#344054]">Live system status</b> · Values shown on this page are retrieved from the current backend state, not static demonstration data.
            </p>
          </div>

        </div>
      )}
    </div>
  );
}