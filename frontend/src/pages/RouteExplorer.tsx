
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Info,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import Card from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';
import TrendChart from '../components/charts/TrendChart';
import LeadTimeChart from '../components/charts/LeadTimeChart';
import StatusBadge from '../components/ui/StatusBadge';
import {
  getAirfares,
  getElasticity,
  getRouteHistory,
  getRoutes,
} from '../api/api';
import type {
  AirfareObservation,
  BackendRoute,
  RouteIndexRow,
} from '../api/types';

const WINDOWS = [1, 7, 15, 21, 30, 45];

const money = (n: number | null) =>
  n == null
    ? '—'
    : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function median(xs: number[]) {
  if (!xs.length) return null;

  const a = [...xs].sort((x, y) => x - y);

  return a.length % 2
    ? a[(a.length - 1) / 2]
    : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
}

function duration(m: number | null) {
  if (m == null) return '—';

  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function date(v: string) {
  return new Date(v).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function fareComponents(o: AirfareObservation) {
  const parts = [
    ['Base', o.base_fare],
    ['Tax', o.tax_amount],
    ['Airport', o.airport_fee],
    ['UDF', o.udf],
    ['Convenience', o.convenience_fee],
    ['Other mandatory', o.other_mandatory_fee],
  ];

  return parts.filter(([, v]) => v != null) as [string, number][];
}

export default function RouteExplorer() {
  const [routes, setRoutes] = useState<BackendRoute[]>([]);

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

  const [history, setHistory] = useState<RouteIndexRow[]>([]);
  const [obs, setObs] = useState<AirfareObservation[]>([]);
  const [elasticity, setElasticity] = useState<any>(null);

  const [airline, setAirline] = useState('');
  const [window, setWindow] = useState('');
  const [quality, setQuality] = useState('');
  const [offset, setOffset] = useState(0);

  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');
  const [selected, setSelected] =
    useState<AirfareObservation | null>(null);

  /*
   * Load the actual backend route basket.
   *
   * The backend returns the 40 directional routes derived from
   * the DGCA passenger-volume basket. We use those exact pairs
   * instead of constructing arbitrary origin/destination combinations
   * from the airport list.
   */
  useEffect(() => {
    let cancelled = false;

    const loadRoutes = async () => {
      setLoadingRoutes(true);

      try {
        const result = await getRoutes();

        if (cancelled) return;

        const activeRoutes = result
          .filter((route) => route.active)
          .sort((a, b) => {
            const aName = `${a.origin}${a.destination}`;
            const bName = `${b.origin}${b.destination}`;

            return aName.localeCompare(bName);
          });

        setRoutes(activeRoutes);

        if (activeRoutes.length > 0) {
          setOrigin((current) => current || activeRoutes[0].origin);
          setDestination(
            (current) => current || activeRoutes[0].destination,
          );
        }
      } catch {
        if (!cancelled) {
          setRoutes([]);
          setError('Unable to load the configured route basket.');
        }
      } finally {
        if (!cancelled) {
          setLoadingRoutes(false);
        }
      }
    };

    loadRoutes();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Actual selectable routes.
   *
   * This is the important fix:
   * every option comes from the backend's configured route basket.
   */
  const selectableRoutes = useMemo(
    () =>
      routes.map((route) => ({
        value: `${route.origin}-${route.destination}`,
        label: `${route.origin} → ${route.destination}`,
        origin: route.origin,
        destination: route.destination,
      })),
    [routes],
  );

  const selectedRouteValue =
    origin && destination ? `${origin}-${destination}` : '';

  /*
   * Change route using the actual route-pair value.
   */
  const handleRouteChange = (value: string) => {
    const route = selectableRoutes.find((item) => item.value === value);

    if (!route) return;

    setOrigin(route.origin);
    setDestination(route.destination);
    setOffset(0);
    setAirline('');
    setWindow('');
    setQuality('');
    setSelected(null);
  };

  const load = async () => {
    if (!origin || !destination) return;

    setLoading(true);
    setError('');

    try {
      const [h, o, e] = await Promise.all([
        getRouteHistory(origin, destination, 5000),
        getAirfares({
          origin,
          destination,
          limit: 100,
          offset,
        }),
        getElasticity(origin, destination),
      ]);

      setHistory(h);
      setObs(o);
      setElasticity(e);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No data available for this route',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loadingRoutes && origin && destination) {
      load();
    }
  }, [origin, destination, offset, loadingRoutes]);

  const allRows = obs;

  const airlines = useMemo(
    () => [...new Set(allRows.map((x) => x.airline))].sort(),
    [allRows],
  );

  const filtered = allRows.filter(
    (x) =>
      (!airline || x.airline === airline) &&
      (!window || `T+${x.advance_days}` === window) &&
      (!quality || x.quality_status === quality),
  );

  const latest = history[0];
  const previous = history[1];

  const change =
    latest && previous
      ? (latest.index / previous.index - 1) * 100
      : null;

  const trend = history
    .slice()
    .reverse()
    .map((x) => ({
      timestamp: x.collection_timestamp,
      value: x.index,
      observations: x.observations_used,
    }));

  const lead = useMemo(
    () =>
      WINDOWS.map((days) => {
        const validFares = obs
          .filter(
            (x) =>
              x.advance_days === days &&
              x.quality_status === 'valid',
          )
          .map((x) => x.total_fare);

        return {
          window: `T+${days}`,
          days,
          median_fare: median(validFares),
          observation_count: obs.filter(
            (x) => x.advance_days === days,
          ).length,
          quality_status:
            validFares.length >= 5
              ? 'good'
              : validFares.length
                ? 'partial'
                : 'insufficient',
        } as any;
      }),
    [obs],
  );

  const routeMeta = routes.find(
    (r) => r.origin === origin && r.destination === destination,
  );

  const coveredRouteCount = routes.length;

  return (
    <div className="page-shell">
      <PageHeader
        tag="ROUTE EXPLORER"
        title="Route Explorer"
        subtitle="Inspect live collected observations, route-level APIx history, lead-time behaviour and calculation inputs for a selected city pair."
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[280px]">
            <label className="field-label">Route</label>

            <div className="relative">
              <select
                value={selectedRouteValue}
                onChange={(e) => handleRouteChange(e.target.value)}
                className="field-select w-full pr-10"
                disabled={loadingRoutes || !selectableRoutes.length}
              >
                {loadingRoutes ? (
                  <option value="">Loading route basket…</option>
                ) : selectableRoutes.length ? (
                  selectableRoutes.map((route) => (
                    <option
                      key={route.value}
                      value={route.value}
                    >
                      {route.label}
                    </option>
                  ))
                ) : (
                  <option value="">
                    No configured routes available
                  </option>
                )}
              </select>

              <ChevronDown className="field-chevron" />
            </div>

            <div className="mt-2 text-[11px] text-[#74727A]">
              {coveredRouteCount} directional routes configured in the
              backend basket
            </div>
          </div>

          <div className="hidden lg:block pb-2 text-[#6B5A78]">
            →
          </div>

          <div className="ml-auto text-right text-xs text-[#74727A]">
            <div>Route source</div>

            <b className="text-[#30313A]">
              {routeMeta?.source || 'DGCA route basket'}
            </b>

            {routeMeta?.weight != null && (
              <div className="mt-1">
                Weight {(routeMeta.weight * 100).toFixed(2)}%
              </div>
            )}

            {routeMeta?.volume_period && (
              <div className="mt-1">
                Traffic period: {routeMeta.volume_period}
              </div>
            )}
          </div>
        </div>
      </Card>

      {error && (
        <div className="alert-error mb-4">
          <Info size={15} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-[#74727A]">
          Loading route data…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <Card>
              <div className="section-label">ROUTE APIx</div>

              <div className="mt-2 text-4xl font-bold font-mono">
                {latest?.index.toFixed(2) ?? '—'}
              </div>

              <div className="mt-1 text-xs text-[#74727A]">
                Latest route snapshot
              </div>

              <div className="mt-5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#74727A]">Change</span>

                  <b>
                    {change == null
                      ? '—'
                      : `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`}
                  </b>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#74727A]">
                    Lead-time windows
                  </span>

                  <b>{latest?.lead_time_windows ?? 0}/6</b>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#74727A]">
                    Observations used
                  </span>

                  <b>{latest?.observations_used ?? 0}</b>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#74727A]">Coverage</span>

                  <b>
                    {latest
                      ? `${(latest.coverage_ratio * 100).toFixed(1)}%`
                      : '—'}
                  </b>
                </div>
              </div>
            </Card>

            <div className="lg:col-span-2">
              <TrendChart
                data={trend}
                title={`${origin} → ${destination} APIx history`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <LeadTimeChart data={lead} />

            <Card>
              <div className="section-label">
                LEAD-TIME ELASTICITY
              </div>

              <h3 className="card-title">
                Observed fare response to booking lead time
              </h3>

              {elasticity?.status === 'success' ? (
                <>
                  <div className="mt-4 text-3xl font-bold font-mono">
                    {Number(elasticity.elasticity).toFixed(3)}
                  </div>

                  <p className="mt-1 text-xs text-[#74727A]">
                    Log-log elasticity coefficient (observational,
                    not causal).
                  </p>

                  <div className="mt-4 space-y-2">
                    {elasticity.points.map((p: any) => (
                      <div
                        key={p.advance_days}
                        className="flex justify-between text-xs"
                      >
                        <span className="font-mono text-[#6B5A78]">
                          T+{p.advance_days}
                        </span>

                        <span>{money(p.median_fare)}</span>

                        <span className="text-[#74727A]">
                          {p.observations} obs
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="mt-6 text-sm text-[#74727A]">
                  Insufficient valid lead-time points to estimate
                  elasticity.
                </div>
              )}
            </Card>
          </div>

          <Card padding="none">
            <div className="px-5 py-4 border-b border-[#ECE8E1]">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div>
                  <div className="section-label">
                    LIVE DATABASE OBSERVATIONS
                  </div>

                  <h3 className="card-title">
                    Collected fare observations
                  </h3>
                </div>

                <div className="lg:ml-auto flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="field-search" />

                    <select
                      value={airline}
                      onChange={(e) =>
                        setAirline(e.target.value)
                      }
                      className="field-select pl-8"
                    >
                      <option value="">All airlines</option>

                      {airlines.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </div>

                  <select
                    value={window}
                    onChange={(e) =>
                      setWindow(e.target.value)
                    }
                    className="field-select"
                  >
                    <option value="">All windows</option>

                    {WINDOWS.map((x) => (
                      <option key={x}>T+{x}</option>
                    ))}
                  </select>

                  <select
                    value={quality}
                    onChange={(e) =>
                      setQuality(e.target.value)
                    }
                    className="field-select"
                  >
                    <option value="">All quality</option>
                    <option value="valid">Valid</option>
                    <option value="flagged">Flagged</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    {[
                      'Airline',
                      'Flight',
                      'Departure',
                      'Duration',
                      'Stops',
                      'Travel date',
                      'Window',
                      'Total fare',
                      'Quality',
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((o) => (
                    <tr
                      key={o.observation_id}
                      onClick={() => setSelected(o)}
                      className="cursor-pointer"
                    >
                      <td className="font-medium">
                        {o.airline}
                      </td>

                      <td className="font-mono text-[#74727A]">
                        {o.flight_number || '—'}
                      </td>

                      <td>{o.departure_time || '—'}</td>

                      <td>
                        {duration(o.duration_minutes)}
                      </td>

                      <td>
                        {o.stops === 0
                          ? 'Non-stop'
                          : `${o.stops} stop${o.stops > 1 ? 's' : ''}`}
                      </td>

                      <td>{date(o.travel_date)}</td>

                      <td className="font-mono text-[#6B5A78]">
                        T+{o.advance_days}
                      </td>

                      <td className="text-right font-mono font-semibold">
                        {money(o.total_fare)}
                      </td>

                      <td>
                        <StatusBadge
                          status={
                            o.quality_status === 'valid'
                              ? 'valid'
                              : 'flagged'
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-[#ECE8E1] flex items-center justify-between text-xs text-[#74727A]">
              <span>
                Backend page: {offset / 100 + 1} ·{' '}
                {filtered.length} returned observations
              </span>

              <div className="flex gap-2">
                <button
                  className="button-secondary"
                  disabled={offset === 0}
                  onClick={() =>
                    setOffset(Math.max(0, offset - 100))
                  }
                >
                  Previous
                </button>

                <button
                  className="button-secondary"
                  disabled={obs.length < 100}
                  onClick={() => setOffset(offset + 100)}
                >
                  Next
                </button>
              </div>
            </div>
          </Card>
        </>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-40 bg-[#30313A]/20 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl border border-[#DCD7CE] shadow-xl max-w-2xl w-full max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-[#DCD7CE] flex items-start justify-between">
              <div>
                <div className="section-label">
                  OBSERVATION DETAIL
                </div>

                <h3 className="mt-1 text-lg font-semibold">
                  {selected.airline} · {selected.origin} →{' '}
                  {selected.destination}
                </h3>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="icon-button"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-2 gap-4 text-xs">
              {[
                ['Travel date', date(selected.travel_date)],
                [
                  'Advance purchase',
                  `T+${selected.advance_days}`,
                ],
                ['Departure', selected.departure_time || '—'],
                ['Arrival', selected.arrival_time || '—'],
                [
                  'Duration',
                  duration(selected.duration_minutes),
                ],
                ['Stops', String(selected.stops)],
                ['Source', selected.source],
                [
                  'Collected',
                  new Date(
                    selected.collection_timestamp,
                  ).toLocaleString('en-IN'),
                ],
                [
                  'Flight instance',
                  selected.flight_instance_id || '—',
                ],
                ['Quality', selected.quality_status],
              ].map(([l, v]) => (
                <div key={l}>
                  <div className="metric-label">{l}</div>
                  <div className="mt-1 font-medium break-words">
                    {v}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 pb-6">
              <div className="section-label">
                FARE COMPOSITION
              </div>

              {selected.fare_components_complete ? (
                <div className="mt-3 space-y-2">
                  {fareComponents(selected).map(([l, v]) => (
                    <div
                      key={l}
                      className="flex justify-between text-sm"
                    >
                      <span>{l}</span>

                      <b className="font-mono">
                        {money(v)}
                      </b>
                    </div>
                  ))}

                  <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                    <span>Total observed fare</span>

                    <span className="font-mono">
                      {money(selected.total_fare)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-xl bg-[#F7F2E7] border border-[#E1CFAB] p-4 text-xs text-[#8E5A33]">
                  <AlertTriangle
                    size={14}
                    className="inline mr-2"
                  />
                  The source did not expose a complete
                  fare-component breakdown. APIx uses the
                  observed total mandatory fare and leaves
                  unavailable components null.
                </div>
              )}

              <div className="mt-4 text-[11px] text-[#74727A]">
                <ShieldCheck
                  size={13}
                  className="inline mr-1"
                />
                Quality flags:{' '}
                {selected.quality_flags
                  ? JSON.stringify(selected.quality_flags)
                  : 'none'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

