import { useEffect, useMemo, useState } from 'react';
import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileCheck2,
  Info,
  ShieldCheck,
  XCircle,
  ArrowRight,
  ArrowDown,
} from 'lucide-react';

import Card from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';

import {
  getAirfares,
  getQuality,
  getQualityEvents,
} from '../api/api';

import type {
  AirfareObservation,
  QualitySummary,
} from '../api/types';

function formatNumber(value: number | null | undefined) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value)
  ) {
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

function statusClass(status: string) {
  switch (status.toLowerCase()) {
    case 'valid':
      return 'border-[#C5DDCC] bg-[#EEF5F0] text-[#4E8066]';

    case 'flagged':
      return 'border-[#E1CFAB] bg-[#F7F2E7] text-[#95672D]';

    default:
      return 'border-[#CDC5BB] bg-[#F6F2EC] text-[#5F5A63]';
  }
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

export default function DataQuality() {
  const [quality, setQuality] =
    useState<QualitySummary | null>(null);

  const [fares, setFares] =
    useState<AirfareObservation[]>([]);

  const [events, setEvents] =
    useState<Record<string, unknown>[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getQuality(),
      getAirfares({ limit: 500 }),
      getQualityEvents(100),
    ])
      .then(([qualityData, fareData, eventData]) => {
        setQuality(qualityData);
        setFares(fareData);
        setEvents(eventData);
      })
      .catch((e) => {
        setError(
          e instanceof Error
            ? e.message
            : 'Unable to load data quality information',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const fareComponentRate = quality
    ? (quality.fare_component_complete /
        Math.max(quality.observations_total, 1)) *
      100
    : null;

  const validCount = quality?.observations_valid ?? 0;
  const flaggedCount = quality?.observations_flagged ?? 0;
  const totalCount = quality?.observations_total ?? 0;
  const completeComponents = quality?.fare_component_complete ?? 0;

  const latestFare = fares[0];

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const fare of fares) {
      const status = fare.quality_status || 'unknown';
      counts[status] = (counts[status] || 0) + 1;
    }

    return counts;
  }, [fares]);

  return (
    <div className="page-shell">
      <PageHeader
        tag="DATA QUALITY"
        title="Data Quality & Validation"
        subtitle="Quality-control evidence for the airfare observations entering the APIx calculation pipeline."
      />

      {error ? (
        <div className="alert-error">
          <Info size={15} />
          {error}
        </div>
      ) : loading ? (
        <div className="py-16 text-center text-sm text-[#74727A]">
          Loading quality data…
        </div>
      ) : (
        <>
          {/* Quality status & Metrics (Combined for visual impact) */}
          <Card className="mb-6 overflow-hidden border-[#DCD7CE] shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
              <div className="lg:w-1/3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF5F0] text-[#4E8066]">
                    <ShieldCheck size={16} />
                  </div>

                  <div className="section-label">
                    QUALITY CONTROL STATUS
                  </div>
                </div>

                <h2 className="mt-5 text-4xl font-bold tracking-tight text-[#30313A]">
                  {quality
                    ? `${(quality.valid_rate * 100).toFixed(1)}%`
                    : '—'}
                </h2>
                <div className="mt-1 text-xs font-bold uppercase tracking-wide text-[#4E8066]">
                  Valid Observation Rate
                </div>

                <p className="mt-4 max-w-sm text-sm leading-6 text-[#5F5A63]">
                  <strong className="font-semibold text-[#30313A]">
                    {quality
                      ? `${(quality.valid_rate * 100).toFixed(1)}%`
                      : '—'}{' '}
                    of collected observations passed quality checks
                  </strong>
                  <br />
                  <span className="mt-2 block">
                    {formatNumber(validCount)} of{' '}
                    {formatNumber(totalCount)} observations are currently
                    eligible for index calculation.
                  </span>
                </p>
              </div>

              <div className="lg:w-2/3">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-xl border border-[#DCD7CE] bg-[#F6F2EC] p-4 text-center">
                    <div className="text-2xl font-bold text-[#30313A]">
                      {formatNumber(totalCount)}
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-[#74727A]">
                      Total collected
                      <br />
                      observations
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#C5DDCC] bg-[#EEF5F0] p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-[#4E8066]">
                      {formatNumber(validCount)}
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-[#4E8066]">
                      Index eligible
                      <br />
                      observations
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#E1CFAB] bg-[#F7F2E7] p-4 text-center">
                    <div className="text-2xl font-bold text-[#95672D]">
                      {formatNumber(flaggedCount)}
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-[#95672D]">
                      Flagged
                      <br />
                      for review
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#DCD7CE] bg-[#F6F2EC] p-4 text-center">
                    <div className="text-2xl font-bold text-[#30313A]">
                      {formatNumber(completeComponents)}
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-[#74727A]">
                      Complete fare
                      <br />
                      components
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-[#DCD7CE] bg-[#F6F2EC] p-4">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#4B4851]">
                    <FileCheck2 size={14} className="text-[#718A78]" />
                    Fare component detail —{' '}
                    {fareComponentRate === null
                      ? '—'
                      : `${fareComponentRate.toFixed(1)}%`}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#74727A]">
                    The current Google Flights source provides total
                    consumer fare, but does not expose a complete breakdown
                    of base fare, taxes and fees. APIx therefore uses the
                    observed total fare rather than reconstructing
                    unavailable components.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* National eligibility */}
          <Card className="mt-4 border-[#DCD7CE] shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEE8F2] text-[#6B5A78]">
                <CheckCircle2 size={17} />
              </div>

              <div>
                <div className="section-label">
                  NATIONAL APIx ELIGIBILITY
                </div>

                <h2 className="mt-1 text-base font-semibold text-[#30313A]">
                  Quality control feeds the index engine
                </h2>

                <p className="mt-2 max-w-3xl text-xs leading-6 text-[#74727A]">
                  Database-wide quality counts describe the complete stored
                  dataset. The National APIx calculation uses only
                  observations that pass the implemented eligibility rules
                  for the covered route basket and lead-time windows.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-[#DCD7CE] bg-[#F6F2EC] p-5">
                <div className="text-[10px] font-bold uppercase tracking-wide text-[#6B5A78]">
                  Quality Gate
                </div>
                <p className="mt-3 text-sm font-semibold leading-tight text-[#30313A]">
                  Only validated observations enter index calculation.
                </p>
              </div>

              <div className="rounded-xl border border-[#DCD7CE] bg-[#F6F2EC] p-5">
                <div className="text-[10px] font-bold uppercase tracking-wide text-[#95672D]">
                  Outlier Policy
                </div>
                <div className="mt-3 text-sm font-semibold text-[#30313A]">
                  Flag, don't delete.
                </div>
                <p className="mt-1 text-xs leading-5 text-[#74727A]">
                  Questionable observations remain available for audit.
                </p>
              </div>

              <div className="rounded-xl border border-[#DCD7CE] bg-[#F6F2EC] p-5">
                <div className="text-[10px] font-bold uppercase tracking-wide text-[#718A78]">
                  Missing Data
                </div>
                <div className="mt-3 text-sm font-semibold text-[#30313A]">
                  Don't invent.
                </div>
                <p className="mt-1 text-xs leading-5 text-[#74727A]">
                  Insufficient route coverage remains uncovered.
                </p>
              </div>
            </div>
          </Card>

          {/* Validation pipeline - Transformed to Horizontal Flow */}
          <Card className="mt-4 border-[#DCD7CE] shadow-sm overflow-visible">
            <div className="section-label text-center sm:text-left">
              VALIDATION PIPELINE
            </div>
            <h2 className="card-title mt-1 text-center sm:text-left">
              Observation quality gates
            </h2>

            <div className="mt-8 flex flex-col items-center lg:flex-row lg:items-start lg:justify-between gap-3">
              {[
                [
                  '01',
                  'Route & date',
                  'Origin, destination, travel date and advance window are checked.',
                ],
                [
                  '02',
                  'Fare validity',
                  'Positive INR fare and required fare fields are validated.',
                ],
                [
                  '03',
                  'Instrument scope',
                  'Economy, adult, one-way and non-stop MVP conditions are enforced.',
                ],
                [
                  '04',
                  'Statistical QC',
                  'Outlier observations are flagged without deleting the source record.',
                ],
              ].map(([number, title, text], idx) => (
                <React.Fragment key={number}>
                  <div className="relative flex-1 w-full lg:w-auto rounded-xl border border-[#DCD7CE] bg-white p-5 text-center shadow-sm hover:shadow-md transition-shadow">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#EEE8F2] text-sm font-bold text-[#6B5A78]">
                      {number}
                    </div>
                    <div className="mt-4 text-sm font-bold uppercase tracking-wide text-[#30313A]">
                      {title}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#74727A]">
                      {text}
                    </p>
                  </div>
                  {idx < 3 && (
                    <div className="hidden lg:flex shrink-0 items-center justify-center px-1 text-[#CDC5BB] mt-10">
                      <ArrowRight size={24} />
                    </div>
                  )}
                  {idx < 3 && (
                    <div className="flex lg:hidden shrink-0 items-center justify-center py-2 text-[#CDC5BB]">
                      <ArrowDown size={24} />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="mt-6 flex flex-col items-center">
              <div className="text-[#CDC5BB] mb-3">
                <ArrowDown size={24} />
              </div>
              <div className="rounded-full border border-[#C5DDCC] bg-[#EEF5F0] px-8 py-3 text-sm font-bold text-[#4E8066] shadow-sm">
                Quality-controlled observations
              </div>
            </div>
          </Card>

          {/* Current source sample */}
          <Card className="mt-4 border-[#DCD7CE] shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="section-label">
                  LATEST OBSERVATION SAMPLE
                </div>

                <h2 className="card-title mt-1">
                  Stored airfare records
                </h2>

                <p className="mt-2 text-xs leading-5 text-[#74727A]">
                  This is live evidence from the stored observation layer.
                  <br />
                  Each row represents an individual airfare collected from
                  the configured source before index aggregation.
                </p>
              </div>

              <div className="rounded-lg border border-[#DCD7CE] bg-[#F6F2EC] px-4 py-2 text-xs font-medium text-[#5F5A63]">
                {fares.length} records loaded
              </div>
            </div>

            {fares.length > 0 ? (
              <div className="mt-6 overflow-x-auto rounded-lg border border-[#E1DBD2]">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="bg-[#F6F2EC]">
                    <tr className="border-b border-[#E1DBD2]">
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#74727A]">
                        Route
                      </th>

                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#74727A]">
                        Travel date
                      </th>

                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#74727A]">
                        Lead time
                      </th>

                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#74727A]">
                        Airline
                      </th>

                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#74727A]">
                        Fare
                      </th>

                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#74727A]">
                        Quality
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {fares.slice(0, 30).map((fare) => (
                      <tr
                        key={fare.observation_id}
                        className="border-b border-[#ECE8E1] hover:bg-[#F6F2EC] transition-colors last:border-0"
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-semibold text-[#30313A]">
                            {fare.origin} → {fare.destination}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-xs text-[#74727A]">
                          {fare.travel_date}
                        </td>

                        <td className="px-4 py-3 text-xs text-[#74727A]">
                          T+{fare.advance_days}
                        </td>

                        <td className="px-4 py-3 text-xs text-[#30313A]">
                          {fare.airline}
                        </td>

                        <td className="px-4 py-3 text-xs font-semibold text-[#30313A]">
                          ₹
                          {fare.total_fare.toLocaleString('en-IN')}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            title={
                              fare.quality_status.toLowerCase() ===
                              'flagged'
                                ? 'Why is this flagged?'
                                : undefined
                            }
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold capitalize shadow-sm ${
                              fare.quality_status.toLowerCase() ===
                              'flagged'
                                ? 'cursor-help'
                                : ''
                            } ${statusClass(fare.quality_status)}`}
                          >
                            {statusLabel(fare.quality_status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-[#CDC5BB] p-10 text-center bg-[#F6F2EC]">
                <Database
                  size={28}
                  className="mx-auto text-[#9A9499]"
                />

                <div className="mt-4 text-sm font-semibold text-[#4B4851]">
                  No observation sample returned
                </div>

                <p className="mt-1 text-xs text-[#74727A]">
                  Check that the backend is running and contains
                  airfare observations.
                </p>
              </div>
            )}

            {latestFare && (
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 rounded-lg bg-[#F6F2EC] px-4 py-3 text-xs text-[#74727A] border border-[#E1DBD2]">
                <span>
                  Latest collection:{' '}
                  <b className="font-semibold text-[#4B4851]">
                    {formatDate(latestFare.collection_timestamp)}
                  </b>
                </span>

                <span>
                  Source:{' '}
                  <b className="font-semibold text-[#4B4851]">
                    {latestFare.source}
                  </b>
                </span>

                <span>
                  Currency:{' '}
                  <b className="font-semibold text-[#4B4851]">
                    {latestFare.currency}
                  </b>
                </span>
              </div>
            )}
          </Card>

          {/* Quality events */}
          <Card className="mt-4 border-[#DCD7CE] shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle
                size={16}
                className="text-[#95672D]"
              />

              <div>
                <div className="section-label">QUALITY EVENTS</div>
                <h2 className="card-title">
                  Recorded validation events
                </h2>
              </div>
            </div>

            {events.length > 0 ? (
              <div className="mt-5 overflow-x-auto rounded-lg border border-[#E1DBD2]">
                <table className="w-full min-w-[720px] text-left">
                  <thead className="bg-[#F6F2EC]">
                    <tr className="border-b border-[#E1DBD2]">
                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#74727A]">
                        Event
                      </th>

                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#74727A]">
                        Count
                      </th>

                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#74727A]">
                        Route
                      </th>

                      <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#74727A]">
                        Recorded
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {events.slice(0, 30).map((event, index) => {
                      const eventName =
                        typeof event.event_type === 'string'
                          ? event.event_type
                          : typeof event.event === 'string'
                            ? event.event
                            : '—';

                      const count =
                        typeof event.count === 'number'
                          ? event.count
                          : null;

                      const route =
                        typeof event.origin === 'string' &&
                        typeof event.destination === 'string'
                          ? `${event.origin} → ${event.destination}`
                          : '—';

                      const timestamp =
                        typeof event.created_at === 'string'
                          ? event.created_at
                          : typeof event.timestamp === 'string'
                            ? event.timestamp
                            : null;

                      return (
                        <tr
                          key={`${eventName}-${index}`}
                          className="border-b border-[#ECE8E1] hover:bg-[#F6F2EC] transition-colors last:border-0"
                        >
                          <td className="px-4 py-3 text-xs font-semibold capitalize text-[#30313A]">
                            {statusLabel(eventName)}
                          </td>

                          <td className="px-4 py-3 text-xs text-[#74727A]">
                            {count === null
                              ? '—'
                              : formatNumber(count)}
                          </td>

                          <td className="px-4 py-3 font-mono text-xs text-[#74727A]">
                            {route}
                          </td>

                          <td className="px-4 py-3 text-xs text-[#74727A]">
                            {formatDate(timestamp)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#C5DDCC] bg-[#EEF5F0] p-5 shadow-sm">
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0 text-[#4E8066]"
                />

                <div>
                  <div className="text-sm font-semibold text-[#30313A]">
                    No additional quality events recorded for the current
                    query.
                  </div>

                  <p className="mt-1 text-xs text-[#74727A]">
                    Individual observations may still carry quality flags,
                    as shown in the sample above.
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Integrity note */}
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="border-[#DCD7CE] shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#4E8066]" />
                <div className="section-label">DATA INTEGRITY</div>
              </div>

              <p className="mt-3 text-xs leading-6 text-[#74727A]">
                Quality controls are applied before observations enter index
                calculations. Records are retained with their quality status
                so the collection history remains auditable.
              </p>
            </Card>

            <Card className="border-[#DCD7CE] shadow-sm">
              <div className="flex items-center gap-2">
                <XCircle size={16} className="text-[#95672D]" />
                <div className="section-label">
                  INTEGRITY PRINCIPLE
                </div>
              </div>

              <p className="mt-3 text-xs leading-6 text-[#74727A]">
                APIx never replaces missing or rejected airfare
                observations with invented prices. Routes without
                sufficient eligible observations remain uncovered,
                preserving the integrity of the index.
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}