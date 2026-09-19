import { useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  Info,
} from 'lucide-react';

import Card from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';
import { getBacktestRuns } from '../api/api';
import type { BacktestRun } from '../api/types';

function statusTone(status: string) {
  const value = status.toLowerCase();

  if (value === 'success' || value === 'passed') {
    return 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]';
  }

  if (
    value === 'insufficient_history' ||
    value === 'pending' ||
    value === 'running'
  ) {
    return 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]';
  }

  return 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]';
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ');
}

function formatDate(value: string | null) {
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

function metricValue(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';

  if (Math.abs(value) >= 1000) {
    return value.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    });
  }

  return value.toFixed(4);
}

export default function Backtesting() {
  const [runs, setRuns] = useState<BacktestRun[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBacktestRuns(20)
      .then(setRuns)
      .catch((e) => {
        setError(
          e instanceof Error
            ? e.message
            : 'Unable to load backtest history',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const latest = runs[0];

  const insufficientHistory =
    latest?.status?.toLowerCase() === 'insufficient_history';

  return (
    <div className="page-shell">
      <PageHeader
        tag="VALIDATION"
        title="Backtesting"
        subtitle="Historical validation of APIx calculations against accumulated real observations and reference data."
      />

      {error ? (
        <div className="alert-error">
          <Info size={15} />
          {error}
        </div>
      ) : loading ? (
        <div className="py-16 text-center text-sm text-[#667085]">
          Loading backtest history…
        </div>
      ) : (
        <>
          {/* Current validation state */}
          <Card className="mb-5">
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  insufficientHistory
                    ? 'bg-[#FFFAEB] text-[#B54708]'
                    : 'bg-[#ECFDF3] text-[#027A48]'
                }`}
              >
                {insufficientHistory ? (
                  <Clock3 size={18} />
                ) : (
                  <CheckCircle2 size={18} />
                )}
              </div>

              <div className="min-w-0">
                <div className="section-label">
                  CURRENT VALIDATION STATE
                </div>

                <h2 className="mt-1 text-base font-semibold text-[#172033]">
                  {latest
                    ? formatStatus(latest.status)
                    : 'No backtest run available'}
                </h2>

                <p className="mt-2 max-w-3xl text-xs leading-6 text-[#667085]">
                  {insufficientHistory
                    ? 'The backtest is waiting for enough real daily National APIx history. The backend does not manufacture historical observations to satisfy the 30-day requirement.'
                    : latest
                      ? 'The latest stored backtest result is shown below using the backend calculation and its recorded reference data.'
                      : 'No completed backtest result is currently stored. A valid reference dataset and sufficient accumulated history are required before a result can be reported.'}
                </p>
              </div>
            </div>
          </Card>

          {latest ? (
            <>
              {/* Latest run */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <div className="section-label">STATUS</div>

                  <div className="mt-4">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${statusTone(
                        latest.status,
                      )}`}
                    >
                      {formatStatus(latest.status)}
                    </span>
                  </div>
                </Card>

                <Card>
                  <div className="section-label">OBSERVATIONS COMPARED</div>

                  <div className="mt-3 text-3xl font-semibold tracking-tight text-[#172033]">
                    {latest.observations_compared.toLocaleString('en-IN')}
                  </div>

                  <div className="mt-1 text-xs text-[#667085]">
                    Historical observations used
                  </div>
                </Card>

                <Card>
                  <div className="section-label">ROUTES COMPARED</div>

                  <div className="mt-3 text-3xl font-semibold tracking-tight text-[#172033]">
                    {latest.routes_compared.toLocaleString('en-IN')}
                  </div>

                  <div className="mt-1 text-xs text-[#667085]">
                    Routes included in validation
                  </div>
                </Card>

                <Card>
                  <div className="section-label">METHODOLOGY</div>

                  <div className="mt-3 text-xl font-semibold tracking-tight text-[#172033]">
                    v{latest.methodology_version}
                  </div>

                  <div className="mt-1 text-xs text-[#667085]">
                    Calculation version
                  </div>
                </Card>
              </div>

              {/* Insufficient history explanation */}
              {insufficientHistory && (
                <Card className="mt-4 border-[#FEDF89] bg-[#FFFCF5]">
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      size={18}
                      className="mt-0.5 shrink-0 text-[#B54708]"
                    />

                    <div>
                      <div className="text-sm font-semibold text-[#7A2E0E]">
                        30-day backtest not yet reportable
                      </div>

                      <p className="mt-2 text-xs leading-6 text-[#667085]">
                        The current system has only a small amount of
                        accumulated daily National APIx history. A
                        30-day backtest requires enough real historical
                        periods to make the comparison meaningful.
                      </p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-[#FEE4B7] bg-white p-4">
                          <div className="text-[10px] font-bold uppercase tracking-wide text-[#667085]">
                            Required
                          </div>

                          <div className="mt-2 text-lg font-semibold text-[#172033]">
                            30 days
                          </div>
                        </div>

                        <div className="rounded-xl border border-[#FEE4B7] bg-white p-4">
                          <div className="text-[10px] font-bold uppercase tracking-wide text-[#667085]">
                            Currently available
                          </div>

                          <div className="mt-2 text-lg font-semibold text-[#172033]">
                            {latest.metrics?.available_daily_periods ??
                              '—'}{' '}
                            days
                          </div>
                        </div>

                        <div className="rounded-xl border border-[#FEE4B7] bg-white p-4">
                          <div className="text-[10px] font-bold uppercase tracking-wide text-[#667085]">
                            Action
                          </div>

                          <div className="mt-2 text-sm font-semibold text-[#172033]">
                            Continue collection
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Metrics */}
              <Card className="mt-4">
                <div className="flex items-center gap-2">
                  <BarChart3
                    size={16}
                    className="text-[#155EEF]"
                  />

                  <div>
                    <div className="section-label">
                      VALIDATION METRICS
                    </div>

                    <h2 className="card-title">
                      Recorded backtest measurements
                    </h2>
                  </div>
                </div>

                {Object.keys(latest.metrics || {}).length > 0 ? (
                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Object.entries(latest.metrics).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] p-4"
                        >
                          <div className="text-[10px] font-bold uppercase tracking-wide text-[#667085]">
                            {key.replace(/_/g, ' ')}
                          </div>

                          <div className="mt-2 text-xl font-semibold text-[#172033]">
                            {metricValue(value)}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-dashed border-[#D0D5DD] p-8 text-center">
                    <div className="text-sm font-medium text-[#172033]">
                      No comparison metrics available
                    </div>

                    <p className="mt-2 text-xs text-[#667085]">
                      Metrics will appear once a reportable backtest
                      has sufficient real historical data.
                    </p>
                  </div>
                )}
              </Card>

              {/* Run metadata */}
              <Card className="mt-4">
                <div className="flex items-center gap-2">
                  <Database
                    size={16}
                    className="text-[#155EEF]"
                  />

                  <div>
                    <div className="section-label">
                      RUN METADATA
                    </div>

                    <h2 className="card-title">
                      Backtest provenance
                    </h2>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-xl bg-[#F9FAFB] p-4">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[#667085]">
                      Reference source
                    </div>

                    <div className="mt-2 text-sm font-semibold text-[#172033]">
                      {latest.reference_source || '—'}
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#F9FAFB] p-4">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[#667085]">
                      Started
                    </div>

                    <div className="mt-2 text-sm font-semibold text-[#172033]">
                      {formatDate(latest.started_at)}
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#F9FAFB] p-4">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[#667085]">
                      Finished
                    </div>

                    <div className="mt-2 text-sm font-semibold text-[#172033]">
                      {formatDate(latest.finished_at)}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Run history */}
              <Card className="mt-4">
                <div className="section-label">
                  BACKTEST RUN HISTORY
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left">
                    <thead>
                      <tr className="border-b border-[#EAECF0]">
                        <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[#667085]">
                          Run
                        </th>

                        <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[#667085]">
                          Status
                        </th>

                        <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[#667085]">
                          Observations
                        </th>

                        <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[#667085]">
                          Routes
                        </th>

                        <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-[#667085]">
                          Started
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {runs.map((run) => (
                        <tr
                          key={run.backtest_run_id}
                          className="border-b border-[#F2F4F7] last:border-0"
                        >
                          <td className="px-3 py-3 font-mono text-[10px] text-[#667085]">
                            {run.backtest_run_id.slice(0, 12)}…
                          </td>

                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold capitalize ${statusTone(
                                run.status,
                              )}`}
                            >
                              {formatStatus(run.status)}
                            </span>
                          </td>

                          <td className="px-3 py-3 text-xs text-[#172033]">
                            {run.observations_compared.toLocaleString(
                              'en-IN',
                            )}
                          </td>

                          <td className="px-3 py-3 text-xs text-[#172033]">
                            {run.routes_compared}
                          </td>

                          <td className="px-3 py-3 text-xs text-[#667085]">
                            {formatDate(run.started_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <Card>
              <div className="flex items-start gap-3">
                <Info
                  size={18}
                  className="mt-0.5 text-[#155EEF]"
                />

                <div>
                  <h2 className="text-sm font-semibold text-[#172033]">
                    No backtest results are stored yet
                  </h2>

                  <p className="mt-2 text-xs leading-6 text-[#667085]">
                    The system will report a backtest only when the
                    required real historical data and reference inputs
                    are available. No synthetic airfare observations
                    are used to fill the gap.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}