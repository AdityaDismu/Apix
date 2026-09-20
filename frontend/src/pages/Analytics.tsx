import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Gauge,
  Info,
  Network,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import Card from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';
import TrendChart from '../components/charts/TrendChart';

import {
  getAirfares,
  getHeatmap,
  getNationalHistory,
  getQuality,
  getRoutes,
} from '../api/api';

import type {
  AirfareObservation,
  BackendRoute,
  NationalIndexRow,
  QualitySummary,
} from '../api/types';

type HeatmapRow = Record<string, unknown>;

interface RouteSignal {
  origin: string;
  destination: string;
  index: number | null;
  change: number | null;
  coverage: number | null;
  weight: number | null;
  observations: number | null;
}

interface LeadTimeSummary {
  advanceDays: number;
  label: string;
  averageFare: number;
  observations: number;
}

function formatNumber(
  value: number | null | undefined,
  digits = 0,
) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value)
  ) {
    return '—';
  }

  return value.toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatCurrency(
  value: number | null | undefined,
  digits = 0,
) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value)
  ) {
    return '—';
  }

  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function numberFrom(
  object: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const value = object[key];

    if (
      typeof value === 'number' &&
      Number.isFinite(value)
    ) {
      return value;
    }

    if (
      typeof value === 'string' &&
      value.trim() !== ''
    ) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function textFrom(
  object: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    const value = object[key];

    if (
      typeof value === 'string' &&
      value.trim().length > 0
    ) {
      return value.trim();
    }
  }

  return '—';
}

function movementClass(value: number | null) {
  if (value === null) {
    return 'text-[#74727A]';
  }

  if (value > 0.01) {
    return 'text-[#A85C57]';
  }

  if (value < -0.01) {
    return 'text-[#4E8066]';
  }

  return 'text-[#74727A]';
}

function movementLabel(value: number | null) {
  if (value === null) return 'No comparison';

  if (value > 0.01) return 'Increase';

  if (value < -0.01) return 'Decrease';

  return 'Stable';
}

function normalizeCoverage(value: number | null) {
  if (value === null) return null;

  return value <= 1 ? value * 100 : value;
}

function routeKey(origin: string, destination: string) {
  return `${origin.trim().toUpperCase()}-${destination
    .trim()
    .toUpperCase()}`;
}

const LEAD_TIME_WINDOWS = [1, 7, 15, 21, 30, 45];

const LEAD_TIME_LABELS: Record<number, string> = {
  1: 'T+1',
  7: 'T+7',
  15: 'T+15',
  21: 'T+21',
  30: 'T+30',
  45: 'T+45',
};

export default function Analytics() {
  const [nationalHistory, setNationalHistory] = useState<
    NationalIndexRow[]
  >([]);

  const [heatmap, setHeatmap] = useState<HeatmapRow[]>([]);
  const [quality, setQuality] =
    useState<QualitySummary | null>(null);

  const [routes, setRoutes] = useState<BackendRoute[]>([]);
  const [fares, setFares] = useState<AirfareObservation[]>([]);

  const [selectedRoute, setSelectedRoute] =
    useState('DEL-BOM');

  const [routeSearch, setRouteSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getNationalHistory(1000),
      getHeatmap(),
      getQuality(),
      getRoutes(),
      getAirfares({
        limit: 1000,
        offset: 0,
      }),
    ])
      .then(
        ([
          national,
          heatmapData,
          qualityData,
          routeData,
          airfareData,
        ]) => {
          setNationalHistory(national);
          setHeatmap(heatmapData);
          setQuality(qualityData);
          setRoutes(routeData);
          setFares(airfareData);
        },
      )
      .catch((e) => {
        setError(
          e instanceof Error
            ? e.message
            : 'Unable to load analytics',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const latestNational = nationalHistory[0];
  const previousNational = nationalHistory[1];

  const nationalChange =
    latestNational && previousNational
      ? ((latestNational.index -
          previousNational.index) /
          previousNational.index) *
        100
      : null;

  const coverage = latestNational
    ? latestNational.route_coverage_ratio * 100
    : null;

  const nationalTrend = useMemo(() => {
    return nationalHistory
      .slice()
      .reverse()
      .map((row) => ({
        timestamp: row.observation_date,
        value: row.index,
        observations: row.observations_used,
      }));
  }, [nationalHistory]);

  /*
   * Route signals
   *
   * The analytics endpoint may return multiple historical rows
   * for the same route. For the analytical table we keep the
   * latest/highest-information row for each route instead of
   * showing the same route repeatedly.
   */
  const routeSignals = useMemo<RouteSignal[]>(() => {
    const map = new Map<string, RouteSignal>();

    for (const row of heatmap) {
      const origin = textFrom(row, [
        'origin',
        'from',
      ]).toUpperCase();

      const destination = textFrom(row, [
        'destination',
        'to',
      ]).toUpperCase();

      if (
        origin === '—' ||
        destination === '—'
      ) {
        continue;
      }

      const key = routeKey(origin, destination);

      const indexValue = numberFrom(row, [
        'index',
        'index_value',
        'apix',
        'route_index',
      ]);

      const change = numberFrom(row, [
        'change',
        'change_percent',
        'movement',
        'pct_change',
      ]);

      const rowCoverage = normalizeCoverage(
        numberFrom(row, [
          'coverage',
          'coverage_ratio',
          'route_coverage_ratio',
        ]),
      );

      const observations = numberFrom(row, [
        'observations',
        'observations_used',
        'count',
      ]);

      const existing = map.get(key);

      /*
       * Prefer rows with an actual index. If multiple valid
       * rows exist, keep the one with the latest-looking
       * information exposed by the endpoint.
       */
      if (!existing) {
        map.set(key, {
          origin,
          destination,
          index: indexValue,
          change,
          coverage: rowCoverage,
          weight: null,
          observations,
        });
      } else {
        map.set(key, {
          ...existing,
          index:
            indexValue !== null
              ? indexValue
              : existing.index,
          change:
            change !== null
              ? change
              : existing.change,
          coverage:
            rowCoverage !== null
              ? rowCoverage
              : existing.coverage,
          observations:
            observations !== null
              ? observations
              : existing.observations,
        });
      }
    }

    /*
     * Merge route weights and configured route information.
     * This also ensures routes from the official basket can
     * remain visible even if the analytics endpoint has not
     * returned a movement row for them.
     */
    for (const route of routes) {
      const origin = route.origin.toUpperCase();
      const destination =
        route.destination.toUpperCase();

      const key = routeKey(origin, destination);

      const existing = map.get(key);

      if (existing) {
        existing.weight =
          route.weight ?? existing.weight;

        if (
          existing.observations === null &&
          route.passenger_volume !== null &&
          route.passenger_volume !== undefined
        ) {
          existing.observations = null;
        }
      } else {
        map.set(key, {
          origin,
          destination,
          index: null,
          change: null,
          coverage: null,
          weight: route.weight ?? null,
          observations: null,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const aWeight = a.weight ?? 0;
      const bWeight = b.weight ?? 0;

      if (aWeight !== bWeight) {
        return bWeight - aWeight;
      }

      return `${a.origin}${a.destination}`.localeCompare(
        `${b.origin}${b.destination}`,
      );
    });
  }, [heatmap, routes]);

  const filteredRouteSignals = useMemo(() => {
    const search = routeSearch.trim().toLowerCase();

    if (!search) {
      return routeSignals;
    }

    return routeSignals.filter((route) => {
      const fullRoute =
        `${route.origin} ${route.destination}`.toLowerCase();

      return (
        fullRoute.includes(search) ||
        `${route.origin}-${route.destination}`
          .toLowerCase()
          .includes(search)
      );
    });
  }, [routeSignals, routeSearch]);

  const selectedRouteSignal = useMemo(() => {
    return routeSignals.find(
      (route) =>
        routeKey(
          route.origin,
          route.destination,
        ) === selectedRoute,
    );
  }, [routeSignals, selectedRoute]);

  /*
   * Calculate real average fares by advance-purchase
   * window from the airfare observations returned by
   * the backend.
   */
  const leadTimeSummary = useMemo<LeadTimeSummary[]>(() => {
    return LEAD_TIME_WINDOWS.map((advanceDays) => {
      const matching = fares.filter(
        (fare) =>
          fare.advance_days === advanceDays &&
          fare.quality_status === 'valid',
      );

      if (matching.length === 0) {
        return {
          advanceDays,
          label: LEAD_TIME_LABELS[advanceDays],
          averageFare: 0,
          observations: 0,
        };
      }

      const total = matching.reduce(
        (sum, fare) => sum + fare.total_fare,
        0,
      );

      return {
        advanceDays,
        label: LEAD_TIME_LABELS[advanceDays],
        averageFare: total / matching.length,
        observations: matching.length,
      };
    });
  }, [fares]);

  const selectedRouteLeadTimeSummary =
    useMemo<LeadTimeSummary[]>(() => {
      const [origin, destination] =
        selectedRoute.split('-');

      return LEAD_TIME_WINDOWS.map((advanceDays) => {
        const matching = fares.filter(
          (fare) =>
            fare.origin.toUpperCase() ===
              origin.toUpperCase() &&
            fare.destination.toUpperCase() ===
              destination.toUpperCase() &&
            fare.advance_days === advanceDays &&
            fare.quality_status === 'valid',
        );

        if (matching.length === 0) {
          return {
            advanceDays,
            label: LEAD_TIME_LABELS[advanceDays],
            averageFare: 0,
            observations: 0,
          };
        }

        const total = matching.reduce(
          (sum, fare) => sum + fare.total_fare,
          0,
        );

        return {
          advanceDays,
          label: LEAD_TIME_LABELS[advanceDays],
          averageFare: total / matching.length,
          observations: matching.length,
        };
      });
    }, [fares, selectedRoute]);

  const routeAverageFare = useMemo(() => {
    const validFares = fares.filter(
      (fare) =>
        fare.origin.toUpperCase() ===
          selectedRoute.split('-')[0] &&
        fare.destination.toUpperCase() ===
          selectedRoute.split('-')[1] &&
        fare.quality_status === 'valid',
    );

    if (validFares.length === 0) {
      return null;
    }

    return (
      validFares.reduce(
        (sum, fare) => sum + fare.total_fare,
        0,
      ) / validFares.length
    );
  }, [fares, selectedRoute]);

  const leadTimeChart = useMemo(() => {
    return leadTimeSummary
      .filter((item) => item.observations > 0)
      .map((item) => ({
        timestamp: item.label,
        value: item.averageFare,
        observations: item.observations,
      }));
  }, [leadTimeSummary]);

  const routeLeadTimeChart = useMemo(() => {
    return selectedRouteLeadTimeSummary
      .filter((item) => item.observations > 0)
      .map((item) => ({
        timestamp: item.label,
        value: item.averageFare,
        observations: item.observations,
      }));
  }, [selectedRouteLeadTimeSummary]);

  const routeOptions = useMemo(() => {
    return routeSignals.map((route) => ({
      key: routeKey(
        route.origin,
        route.destination,
      ),
      label: `${route.origin} → ${route.destination}`,
    }));
  }, [routeSignals]);

  const totalValidFares = quality?.observations_valid ?? 0;

  const selectedRouteCoverage =
    selectedRouteSignal?.coverage ?? null;

  const selectedRouteWeight =
    selectedRouteSignal?.weight ?? null;

  return (
    <div className="page-shell">
      <PageHeader
        tag="ANALYTICS"
        title="Airfare Intelligence"
        subtitle="Explore how observed airfare behaves across booking horizons and representative routes."
      />

      {error ? (
        <div className="alert-error">
          <Info size={15} />
          {error}
        </div>
      ) : loading ? (
        <div className="py-16 text-center text-sm text-[#74727A]">
          Loading analytics…
        </div>
      ) : (
        <>
          {/* National intelligence */}
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEE8F2] text-[#6B5A78]">
                    <Gauge size={16} />
                  </div>

                  <div className="section-label">
                    NATIONAL PRICE SIGNAL
                  </div>
                </div>

                {latestNational ? (
                  <>
                    <div className="mt-4 flex items-end gap-4">
                      <div className="text-5xl font-semibold tracking-[-0.04em] text-[#30313A] sm:text-6xl">
                        {latestNational.index.toFixed(
                          4,
                        )}
                      </div>

                      <div
                        className={`mb-2 flex items-center gap-1 text-sm font-semibold ${movementClass(
                          nationalChange,
                        )}`}
                      >
                        {nationalChange !== null &&
                        nationalChange > 0.01 ? (
                          <TrendingUp size={15} />
                        ) : nationalChange !== null &&
                          nationalChange < -0.01 ? (
                          <TrendingDown size={15} />
                        ) : (
                          <Activity size={15} />
                        )}

                        {nationalChange === null
                          ? 'History accumulating'
                          : `${
                              nationalChange >= 0
                                ? '+'
                                : ''
                            }${nationalChange.toFixed(
                              4,
                            )}% vs previous snapshot`}
                      </div>
                    </div>

                    <p className="mt-2 max-w-2xl text-xs leading-5 text-[#74727A]">
                      APIx summarizes movement in observed
                      domestic airfare prices relative to the
                      prototype base index of 100. The current
                      national value is built from DGCA-weighted
                      representative routes with sufficient valid
                      observations.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mt-5 text-4xl font-semibold text-[#30313A]">
                      —
                    </div>

                    <p className="mt-2 text-xs text-[#74727A]">
                      National APIx history is not yet available.
                    </p>
                  </>
                )}
              </div>

              {latestNational && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-[#DCD7CE] bg-[#F6F2EC] p-4">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[#74727A]">
                      Coverage
                    </div>

                    <div className="mt-2 text-xl font-semibold text-[#30313A]">
                      {coverage?.toFixed(1)}%
                    </div>

                    <div className="mt-1 text-[10px] text-[#74727A]">
                      weighted route coverage
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#DCD7CE] bg-[#F6F2EC] p-4">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[#74727A]">
                      Routes
                    </div>

                    <div className="mt-2 text-xl font-semibold text-[#30313A]">
                      {latestNational.routes_used}/
                      {latestNational.routes_expected}
                    </div>

                    <div className="mt-1 text-[10px] text-[#74727A]">
                      covered routes
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#DCD7CE] bg-[#F6F2EC] p-4">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[#74727A]">
                      Observation date
                    </div>

                    <div className="mt-2 text-sm font-semibold text-[#30313A]">
                      {latestNational.observation_date}
                    </div>

                    <div className="mt-1 text-[10px] text-[#74727A]">
                      latest national snapshot
                    </div>
                  </div>
                </div>
              )}
            </div>

            {latestNational && (
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-[10px] font-semibold text-[#74727A]">
                  <span>
                    PASSENGER-WEIGHTED NETWORK COVERAGE
                  </span>

                  <span>
                    {coverage?.toFixed(1)}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-[#E1DBD2]">
                  <div
                    className="h-full rounded-full bg-[#6B5A78] transition-all"
                    style={{
                      width: `${Math.min(
                        Math.max(coverage || 0, 0),
                        100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </Card>

          {/* National history */}
          <Card className="mt-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="section-label">
                  NATIONAL MOVEMENT
                </div>

                <h2 className="card-title mt-1">
                  How the national index is evolving
                </h2>

                <p className="mt-1 max-w-2xl text-xs leading-5 text-[#74727A]">
                  Each point represents a real daily national
                  APIx snapshot. The series is intentionally not
                  filled with synthetic history.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-[#DCD7CE] bg-[#F6F2EC] px-3 py-2 text-[10px] text-[#74727A]">
                <Activity size={13} />
                {nationalHistory.length}{' '}
                {nationalHistory.length === 1
                  ? 'snapshot'
                  : 'snapshots'}
              </div>
            </div>

            {nationalTrend.length > 1 ? (
              <div className="mt-5">
                <TrendChart
                  data={nationalTrend}
                  title="National APIx"
                  label="INDEX SCORE"
                />
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-[#CDC5BB] bg-[#F6F2EC] px-6 py-10 text-center">
                <Activity
                  size={24}
                  className="mx-auto text-[#9A9499]"
                />

                <div className="mt-3 text-sm font-semibold text-[#4B4851]">
                  Trend history is still accumulating
                </div>

                <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#74727A]">
                  APIx requires additional real daily
                  observations before a meaningful national trend
                  can be displayed. No artificial periods are
                  inserted.
                </p>
              </div>
            )}
          </Card>

          {/* Fare behavior */}
          <Card className="mt-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="section-label">
                  FARE BEHAVIOR
                </div>

                <h2 className="card-title mt-1">
                  Average observed fare by advance purchase
                </h2>

                <p className="mt-1 max-w-2xl text-xs leading-5 text-[#74727A]">
                  APIx collects fares at multiple booking horizons
                  to observe how airfare changes as the travel date
                  approaches. Only valid observations are included.
                </p>
              </div>

              <div className="rounded-lg border border-[#DCD7CE] bg-[#F6F2EC] px-3 py-2 text-[10px] text-[#74727A]">
                {formatNumber(totalValidFares)} valid observations
                available
              </div>
            </div>

            {leadTimeChart.length > 0 ? (
              <>
                <div className="mt-5">
                  <TrendChart
                    data={leadTimeChart}
                    title="Average airfare"
                    label="AVERAGE FARE"
                  />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {leadTimeSummary.map((item) => (
                    <div
                      key={item.advanceDays}
                      className={`rounded-xl border p-4 ${
                        item.advanceDays === 21
                          ? 'border-[#D9CDE0] bg-[#F6F2EC]'
                          : 'border-[#DCD7CE] bg-[#F6F2EC]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-[#74727A]">
                          {item.label}
                        </div>

                        {item.advanceDays === 21 && (
                          <span className="rounded-full bg-[#E8F1FF] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#6B5A78]">
                            CPI aligned
                          </span>
                        )}
                      </div>

                      <div className="mt-3 text-lg font-semibold text-[#30313A]">
                        {item.observations > 0
                          ? formatCurrency(
                              item.averageFare,
                            )
                          : '—'}
                      </div>

                      <div className="mt-1 text-[10px] text-[#74727A]">
                        {formatNumber(
                          item.observations,
                        )}{' '}
                        observations
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-[#CDC5BB] bg-[#F6F2EC] px-6 py-10 text-center">
                <BarChart3
                  size={24}
                  className="mx-auto text-[#9A9499]"
                />

                <div className="mt-3 text-sm font-semibold text-[#4B4851]">
                  No lead-time fare observations available
                </div>

                <p className="mx-auto mt-2 max-w-md text-xs text-[#74727A]">
                  Real valid airfare observations will appear here
                  as collection cycles accumulate.
                </p>
              </div>
            )}
          </Card>

          {/* Route signals */}
          <Card className="mt-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="section-label">
                  ROUTE INTELLIGENCE
                </div>

                <h2 className="card-title mt-1">
                  Representative route signals
                </h2>

                <p className="mt-1 max-w-2xl text-xs leading-5 text-[#74727A]">
                  Explore the individual routes that make up the
                  national airfare basket. Passenger-volume weights
                  determine each route's contribution to National
                  APIx.
                </p>
              </div>

              <div className="relative w-full lg:w-72">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9A9499]"
                />

                <input
                  value={routeSearch}
                  onChange={(event) =>
                    setRouteSearch(event.target.value)
                  }
                  placeholder="Search route, e.g. DEL BOM"
                  className="h-10 w-full rounded-lg border border-[#CDC5BB] bg-white pl-9 pr-3 text-xs text-[#30313A] outline-none transition focus:border-[#6B5A78] focus:ring-2 focus:ring-[#6B5A78]/10"
                />
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-[#E1DBD2]">
                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[#74727A]">
                      Route
                    </th>

                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[#74727A]">
                      Route APIx
                    </th>

                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[#74727A]">
                      Movement
                    </th>

                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[#74727A]">
                      Weight
                    </th>

                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[#74727A]">
                      Coverage
                    </th>

                    <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[#74727A]">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRouteSignals.map(
                    (route) => {
                      const key = routeKey(
                        route.origin,
                        route.destination,
                      );

                      return (
                        <tr
                          key={key}
                          className="border-b border-[#ECE8E1] last:border-0"
                        >
                          <td className="px-3 py-4">
                            <div className="font-mono text-xs font-semibold text-[#30313A]">
                              {route.origin} →{' '}
                              {route.destination}
                            </div>
                          </td>

                          <td className="px-3 py-4">
                            <span className="text-xs font-semibold text-[#30313A]">
                              {route.index === null
                                ? '—'
                                : route.index.toFixed(
                                    4,
                                  )}
                            </span>
                          </td>

                          <td className="px-3 py-4">
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-semibold ${movementClass(
                                route.change,
                              )}`}
                            >
                              {route.change !==
                                null &&
                              route.change > 0.01 ? (
                                <ArrowUpRight
                                  size={13}
                                />
                              ) : route.change !==
                                  null &&
                                route.change <
                                  -0.01 ? (
                                <ArrowDownRight
                                  size={13}
                                />
                              ) : (
                                <Activity
                                  size={13}
                                />
                              )}

                              {route.change === null
                                ? movementLabel(
                                    route.change,
                                  )
                                : `${
                                    route.change >= 0
                                      ? '+'
                                      : ''
                                  }${route.change.toFixed(
                                    4,
                                  )}%`}
                            </span>
                          </td>

                          <td className="px-3 py-4 text-xs text-[#5F5A63]">
                            {route.weight === null
                              ? '—'
                              : `${(
                                  route.weight *
                                  100
                                ).toFixed(2)}%`}
                          </td>

                          <td className="px-3 py-4">
                            {route.coverage ===
                            null ? (
                              <span className="text-[10px] text-[#9A9499]">
                                —
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#E1DBD2]">
                                  <div
                                    className="h-full rounded-full bg-[#718A78]"
                                    style={{
                                      width: `${Math.min(
                                        Math.max(
                                          route.coverage,
                                          0,
                                        ),
                                        100,
                                      )}%`,
                                    }}
                                  />
                                </div>

                                <span className="text-[10px] text-[#74727A]">
                                  {route.coverage.toFixed(
                                    0,
                                  )}
                                  %
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="px-3 py-4">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedRoute(
                                  key,
                                )
                              }
                              className="rounded-lg border border-[#CDC5BB] px-3 py-1.5 text-[10px] font-semibold text-[#4B4851] transition hover:border-[#6B5A78] hover:text-[#6B5A78]"
                            >
                              Analyze
                            </button>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>

              {filteredRouteSignals.length === 0 && (
                <div className="py-10 text-center text-xs text-[#74727A]">
                  No routes match your search.
                </div>
              )}
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#DCD7CE] bg-[#F6F2EC] p-4">
              <Info
                size={14}
                className="mt-0.5 shrink-0 text-[#6B5A78]"
              />

              <p className="text-[11px] leading-5 text-[#74727A]">
                Route APIx values describe movement for an
                individual route. The national index combines
                covered routes using their DGCA passenger-volume
                weights. Routes without sufficient valid data are
                not assigned artificial values.
              </p>
            </div>
          </Card>

          {/* Selected route analysis */}
          <Card className="mt-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="section-label">
                  ROUTE DEEP DIVE
                </div>

                <h2 className="card-title mt-1">
                  Advance-purchase behavior
                </h2>

                <p className="mt-1 text-xs leading-5 text-[#74727A]">
                  Compare real observed fares for one
                  representative route across the six APIx booking
                  horizons.
                </p>
              </div>

              <select
                value={selectedRoute}
                onChange={(event) =>
                  setSelectedRoute(event.target.value)
                }
                className="h-10 min-w-[220px] rounded-lg border border-[#CDC5BB] bg-white px-3 text-xs font-semibold text-[#30313A] outline-none focus:border-[#6B5A78] focus:ring-2 focus:ring-[#6B5A78]/10"
              >
                {routeOptions.length > 0 ? (
                  routeOptions.map((route) => (
                    <option
                      key={route.key}
                      value={route.key}
                    >
                      {route.label}
                    </option>
                  ))
                ) : (
                  <option value="DEL-BOM">
                    DEL → BOM
                  </option>
                )}
              </select>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-[#DCD7CE] bg-[#F6F2EC] p-4">
                <div className="text-[10px] font-bold uppercase tracking-wide text-[#74727A]">
                  Route APIx
                </div>

                <div className="mt-2 text-xl font-semibold text-[#30313A]">
                  {selectedRouteSignal?.index ===
                  null ||
                  selectedRouteSignal?.index ===
                    undefined
                    ? '—'
                    : selectedRouteSignal.index.toFixed(
                        4,
                      )}
                </div>

                <div className="mt-1 text-[10px] text-[#74727A]">
                  current route signal
                </div>
              </div>

              <div className="rounded-xl border border-[#DCD7CE] bg-[#F6F2EC] p-4">
                <div className="text-[10px] font-bold uppercase tracking-wide text-[#74727A]">
                  Coverage
                </div>

                <div className="mt-2 text-xl font-semibold text-[#30313A]">
                  {selectedRouteCoverage ===
                  null
                    ? '—'
                    : `${selectedRouteCoverage.toFixed(
                        1,
                      )}%`}
                </div>

                <div className="mt-1 text-[10px] text-[#74727A]">
                  eligible route coverage
                </div>
              </div>

              <div className="rounded-xl border border-[#DCD7CE] bg-[#F6F2EC] p-4">
                <div className="text-[10px] font-bold uppercase tracking-wide text-[#74727A]">
                  Basket weight
                </div>

                <div className="mt-2 text-xl font-semibold text-[#30313A]">
                  {selectedRouteWeight ===
                  null
                    ? '—'
                    : `${(
                        selectedRouteWeight *
                        100
                      ).toFixed(2)}%`}
                </div>

                <div className="mt-1 text-[10px] text-[#74727A]">
                  DGCA passenger volume
                </div>
              </div>

              <div className="rounded-xl border border-[#DCD7CE] bg-[#F6F2EC] p-4">
                <div className="text-[10px] font-bold uppercase tracking-wide text-[#74727A]">
                  Average fare
                </div>

                <div className="mt-2 text-xl font-semibold text-[#30313A]">
                  {formatCurrency(
                    routeAverageFare,
                  )}
                </div>

                <div className="mt-1 text-[10px] text-[#74727A]">
                  valid observed fares
                </div>
              </div>
            </div>

            {routeLeadTimeChart.length > 0 ? (
              <div className="mt-5">
                <TrendChart
                  data={routeLeadTimeChart}
                  title="Average fare by booking horizon"
                  label="AVERAGE FARE"
                />
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-[#CDC5BB] bg-[#F6F2EC] px-6 py-10 text-center">
                <BarChart3
                  size={24}
                  className="mx-auto text-[#9A9499]"
                />

                <div className="mt-3 text-sm font-semibold text-[#4B4851]">
                  No route-level fare history available
                </div>

                <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#74727A]">
                  Select a route with real valid observations to
                  inspect its advance-purchase behavior.
                </p>
              </div>
            )}
          </Card>

          {/* Network interpretation */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card>
              <div className="flex items-center gap-2">
                <Gauge
                  size={15}
                  className="text-[#6B5A78]"
                />

                <div className="section-label">
                  READ THE INDEX
                </div>
              </div>

              <p className="mt-3 text-xs leading-6 text-[#74727A]">
                APIx uses 100 as its prototype base index. Values
                above 100 indicate observed airfare levels above the
                reference level, while values below 100 indicate
                lower observed levels.
              </p>
            </Card>

            <Card>
              <div className="flex items-center gap-2">
                <Network
                  size={15}
                  className="text-[#718A78]"
                />

                <div className="section-label">
                  READ COVERAGE
                </div>
              </div>

              <p className="mt-3 text-xs leading-6 text-[#74727A]">
                National coverage represents the passenger-volume
                weight of routes with sufficient eligible data.
                Missing routes remain uncovered instead of receiving
                estimated prices.
              </p>
            </Card>

            <Card>
              <div className="flex items-center gap-2">
                <BarChart3
                  size={15}
                  className="text-[#74727A]"
                />

                <div className="section-label">
                  READ FARE BEHAVIOR
                </div>
              </div>

              <p className="mt-3 text-xs leading-6 text-[#74727A]">
                The lead-time analysis shows how observed fares vary
                across T+1, T+7, T+15, T+21, T+30 and T+45 days
                before travel.
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}