import type { ComponentType } from 'react';
import React, { useEffect, useState, useMemo } from 'react';
import {
  ArrowDown,
  ArrowRight,
  CheckCircle,
  CheckCircle2,
  Database,
  RefreshCw,
  ShieldCheck,
  XCircle,
  Zap,
  Info,
  Activity,
  Layers,
  Search,
} from 'lucide-react';

import Card from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';

import { getCollectionRuns, getPipelineRuns } from '../api/api';
import type { CollectionRun, PipelineRun } from '../api/types';

const WINDOWS = [1, 7, 15, 21, 30, 45];

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return value.toLocaleString('en-IN');
}

export default function Pipeline() {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [collections, setCollections] = useState<CollectionRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        getPipelineRuns(20),
        getCollectionRuns(5000),
      ]);
      setRuns(p);
      setCollections(c);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Unable to load pipeline data',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const run = runs[0];
  const latestTimestamp = run?.started_at;
  const batch = latestTimestamp
    ? collections.filter((x) => x.pipeline_run_id === run.pipeline_run_id)
    : [];

  const windows = WINDOWS.map((days) => {
    const xs = batch.filter((x) => x.advance_days === days);
    return {
      days,
      rows: xs,
      count: xs.reduce((s, x) => s + x.valid_records, 0),
      status:
        xs.every((x) => x.status === 'success') && xs.length
          ? 'completed'
          : xs.length
            ? 'failed'
            : 'pending',
    };
  });

  const isPartialRun = run ? run.routes_requested < 40 : false;
  const completedWindows = windows.filter(w => w.status === 'completed').length;

  return (
    <div className="page-shell">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#DCD7CE] bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#74727A] shadow-sm">
            <Zap size={12} className="text-[#6B5A78]" />
            COLLECTION ENGINE
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#30313A] sm:text-3xl">
            Collection Pipeline
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#74727A]">
            How APIx collects and prepares real airfare observations for index calculation.
          </p>
        </div>
        <button className="button-secondary shrink-0" onClick={load}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="mb-6 rounded-xl border border-[#DCD7CE] bg-[#F6F2EC] p-5 shadow-sm">
        <p className="text-sm leading-6 text-[#5F5A63]">
          APIx automatically collects airfare observations across predefined routes and advance-purchase windows. Each collection passes through validation, cleaning and database storage before eligible observations reach the index engine.
        </p>
      </div>

      {error && (
        <div className="alert-error mb-6">
          <XCircle size={15} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-[#74727A]">
          Loading collection history…
        </div>
      ) : !run ? (
        <Card>
          <div className="py-10 text-center text-sm text-[#74727A]">
            No persisted pipeline runs are available.
          </div>
        </Card>
      ) : (
        <>
          {/* Latest Collection Run */}
          <Card className="mb-6 border-[#DCD7CE] shadow-sm overflow-hidden">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="lg:w-1/3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEE8F2] text-[#6B5A78]">
                    <Activity size={16} />
                  </div>
                  <div className="section-label">LATEST COLLECTION RUN</div>
                </div>

                <div className="mt-4">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-[#E1CFAB] bg-[#F7F2E7] px-3 py-1 text-xs font-bold text-[#95672D]">
                    {isPartialRun ? 'PARTIAL / SINGLE-ROUTE RUN' : 'FULL BASKET RUN'}
                  </div>
                </div>

                <div className="mt-4 text-xs font-bold uppercase tracking-wide text-[#6B5A78]">
                  APIx route basket: 40 directional routes
                </div>

                <p className="mt-3 max-w-sm text-sm leading-6 text-[#5F5A63]">
                  Latest run processed <strong className="font-semibold text-[#30313A]">{run.routes_requested}</strong> of the configured 40 routes. This run collected <strong className="font-semibold text-[#30313A]">{formatNumber(run.observations_collected)}</strong> observations across six lead-time windows.
                </p>
              </div>

              <div className="lg:w-2/3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-[#DCD7CE] bg-[#F6F2EC] p-4 text-center">
                  <div className="text-2xl font-bold text-[#30313A]">
                    {run.routes_succeeded} <span className="text-sm text-[#9A9499]">/ 40</span>
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-[#74727A]">
                    Routes<br />Processed
                  </div>
                </div>

                <div className="rounded-xl border border-[#C5DDCC] bg-[#EEF5F0] p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-[#4E8066]">
                    {formatNumber(run.observations_collected)}
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-[#4E8066]">
                    Observations<br />Collected
                  </div>
                </div>

                <div className="rounded-xl border border-[#DCD7CE] bg-[#F6F2EC] p-4 text-center">
                  <div className="text-2xl font-bold text-[#30313A]">
                    {completedWindows} <span className="text-sm text-[#9A9499]">/ 6</span>
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-[#74727A]">
                    Lead-Time<br />Windows
                  </div>
                </div>

                <div className="rounded-xl border border-[#DCD7CE] bg-[#F6F2EC] p-4 text-center">
                  <div className={`text-2xl font-bold ${run.routes_failed > 0 ? 'text-[#95672D]' : 'text-[#30313A]'}`}>
                    {run.routes_failed}
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-[#74727A]">
                    Failed<br />Routes
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 border-t border-[#E1DBD2] pt-4 text-xs text-[#74727A] flex gap-4">
               <span>Started: <strong className="text-[#4B4851]">{new Date(run.started_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</strong></span>
               {run.ended_at && <span>Ended: <strong className="text-[#4B4851]">{new Date(run.ended_at).toLocaleString('en-IN', { timeStyle: 'short' })}</strong></span>}
            </div>
          </Card>

          {/* Data Flow Pipeline */}
          <Card className="mb-6 border-[#DCD7CE] shadow-sm">
            <div className="section-label">THE APIx DATA FLOW</div>
            <p className="mt-2 text-xs leading-5 text-[#74727A]">
              Each stage transforms or checks the data before it is allowed to contribute to the final index.
            </p>

            <div className="mt-8 flex flex-col items-center lg:flex-row lg:items-center lg:justify-between gap-3">
              {[
                ['Collection', Zap],
                ['Validation', ShieldCheck],
                ['Cleaning', Search],
                ['Database', Database],
                ['Index Engine', Layers],
                ['APIx', CheckCircle2],
              ].map(([name, Icon], i, arr) => (
                <React.Fragment key={name as string}>
                  <div className={`relative flex-1 w-full lg:w-auto rounded-xl border p-4 text-center shadow-sm transition-shadow hover:shadow-md ${name === 'APIx' ? 'border-[#718A78] bg-[#EEF5F0] text-[#718A78]' : 'border-[#DCD7CE] bg-white text-[#30313A]'}`}>
                    <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full mb-3 ${name === 'APIx' ? 'bg-[#DCEBE0]' : 'bg-[#F6F2EC]'}`}>
                      {React.createElement(Icon as React.ComponentType<{ size: number }>, { size: 18 })}
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-wide">
                      {name as string}
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="hidden lg:flex shrink-0 items-center justify-center px-1 text-[#CDC5BB]">
                      <ArrowRight size={24} />
                    </div>
                  )}
                  {i < arr.length - 1 && (
                    <div className="flex lg:hidden shrink-0 items-center justify-center py-2 text-[#CDC5BB]">
                      <ArrowDown size={24} />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </Card>

          {/* Synchronized Lead-Time Windows */}
          <Card className="mb-6 border-[#DCD7CE] shadow-sm">
            <div className="section-label">SYNCHRONIZED LEAD-TIME WINDOWS</div>
            <p className="mt-2 text-xs leading-5 text-[#74727A]">
              APIx observes the same route at multiple advance-purchase points to capture how airfare changes as the travel date approaches.
            </p>

            <div className="mt-6 grid grid-cols-2 lg:grid-cols-6 gap-4">
              {windows.map((w) => {
                const isCPI = w.days === 21;
                return (
                  <div
                    key={w.days}
                    className={`relative rounded-xl border p-4 text-center shadow-sm transition-transform hover:-translate-y-0.5 ${
                      isCPI
                        ? 'border-[#718A78] bg-[#EEF5F0]'
                        : 'border-[#DCD7CE] bg-white'
                    }`}
                  >
                    {isCPI && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#718A78] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm">
                        CPI-aligned window
                      </div>
                    )}
                    <div className={`font-mono text-sm font-bold ${isCPI ? 'text-[#718A78]' : 'text-[#6B5A78]'}`}>
                      T+{w.days}
                    </div>
                    <div className="mt-3 text-2xl font-bold text-[#30313A]">
                      {formatNumber(w.count)}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[#74727A] mt-1 mb-3">
                      valid
                    </div>
                    <div className="flex justify-center">
                      <StatusBadge
                        status={
                          w.status === 'completed'
                            ? 'completed'
                            : w.status === 'failed'
                              ? 'failed'
                              : w.status === 'running'
                                ? 'running'
                                : 'pending'
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* What does one run mean & Evidence Table */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
            <Card className="lg:col-span-1 border-[#DCD7CE] bg-[#F6F2EC] shadow-sm">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-[#6B5A78]" />
                <div className="section-label">WHAT DOES ONE RUN MEAN?</div>
              </div>
              <p className="mt-4 text-xs leading-6 text-[#5F5A63]">
                One collection cycle queries the configured airfare source for each selected route and advance-purchase window.
                <br /><br />
                The returned fares are validated and cleaned, then stored as individual observations.
                <br /><br />
                The index engine later uses only observations that satisfy the eligibility rules.
              </p>
            </Card>

            <Card className="lg:col-span-3 border-[#DCD7CE] shadow-sm overflow-hidden">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="section-label">COLLECTION RUN EVIDENCE</div>
                  <h2 className="card-title mt-1">Raw collection evidence</h2>
                  <p className="mt-2 text-xs leading-5 text-[#74727A]">
                    These are actual collection-run records returned by the backend. They show the route, travel date, lead-time window and quality outcome before index aggregation.
                  </p>
                </div>
                <div className="rounded-lg border border-[#DCD7CE] bg-[#F6F2EC] px-3 py-2 text-[10px] font-medium text-[#5F5A63]">
                  {batch.length} records shown
                </div>
              </div>

              <div className="mt-6 overflow-x-auto rounded-lg border border-[#E1DBD2]">
                <table className="w-full min-w-[800px] text-left">
                  <thead className="bg-[#F6F2EC]">
                    <tr className="border-b border-[#E1DBD2]">
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#74727A]">Run ID</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#74727A]">Source</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#74727A]">Route</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#74727A]">Window</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#74727A]">Valid</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#74727A]">Rejected</th>
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#74727A]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batch.slice(0, 100).map((x) => (
                      <tr key={x.id} className="border-b border-[#ECE8E1] hover:bg-[#F6F2EC] transition-colors last:border-0">
                        <td className="px-4 py-3 font-mono text-[10px] text-[#74727A]">
                          {x.pipeline_run_id?.slice(0, 8) || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#30313A]">{x.source}</td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-[#30313A]">
                          {x.origin} → {x.destination}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#74727A]">
                          T+{x.advance_days}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-[#4E8066]">
                          {x.valid_records}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#95672D]">
                          {x.rejected_records + x.duplicate_records + x.outliers_flagged}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={x.status === 'success' ? 'completed' : 'failed'}
                          />
                        </td>
                      </tr>
                    ))}
                    {batch.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-xs text-[#74727A]">
                          No collection records found for this run.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Transparency Disclaimer */}
          <Card className="border-[#DCD7CE] shadow-sm bg-[#F6F2EC]">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#718A78]" />
              <div className="text-[11px] font-bold uppercase tracking-wide text-[#30313A]">
                Transparency by design
              </div>
            </div>
            <p className="mt-2 text-xs leading-6 text-[#5F5A63]">
              APIx records the collection run and individual observations separately, allowing every published index value to be traced back to its underlying collection data.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}