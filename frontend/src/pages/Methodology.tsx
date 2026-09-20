import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  BarChart3,
  BookOpen,
  Calculator,
  CheckCircle,
  CopyMinus,
  Database,
  FileText,
  Info,
  Layers,
  Search,
  Settings2,
  ShieldCheck,
  Weight,
} from 'lucide-react';

import Card from '../components/ui/Card';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import { getMethodology } from '../api/api';
import type { Methodology as MethodologyType } from '../api/types';

function Step({
  n,
  title,
  text,
  Icon,
}: {
  n: string;
  title: string;
  text: string;
  Icon: React.ElementType;
}) {
  return (
    <div className="relative flex flex-col rounded-2xl border border-[#DCD7CE] bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      <div className="mb-5 flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5F1EB] text-[#6B5A78] shadow-sm">
          <Icon size={24} strokeWidth={2} />
        </div>
        <div className="font-mono text-3xl font-black text-[#ECE8E1] select-none">
          {n}
        </div>
      </div>

      <h3 className="text-base font-bold text-[#30313A]">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-[#5F5A63] flex-1">
        {text}
      </p>
    </div>
  );
}

function Formula({
  title,
  formula,
  note,
}: {
  title: string;
  formula: React.ReactNode;
  note: string;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[#DCD7CE] bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="border-b border-[#DCD7CE] bg-[#F6F2EC] px-5 py-3.5 flex items-center justify-between">
        <h4 className="text-sm font-bold text-[#30313A]">{title}</h4>
        <Calculator size={14} className="text-[#9A9499]" />
      </div>
      
      <div className="flex-1 bg-[#5C5260] p-6 flex items-center justify-center relative overflow-hidden">
        {/* Subtle background grid effect */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4B4851_1px,transparent_1px),linear-gradient(to_bottom,#4B4851_1px,transparent_1px)] bg-[size:1rem_1rem] opacity-20"></div>
        <div className="relative z-10 w-full overflow-x-auto text-center font-mono text-[15px] sm:text-base tracking-wide text-[#74A385] py-2 whitespace-nowrap">
          {formula}
        </div>
      </div>

      <div className="border-t border-[#DCD7CE] bg-white px-5 py-4">
        <p className="text-xs leading-5 text-[#74727A]">
          {note}
        </p>
      </div>
    </div>
  );
}

export default function Methodology() {
  const [m, setM] = useState<MethodologyType | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getMethodology()
      .then(setM)
      .catch((e) =>
        setError(
          e instanceof Error
            ? e.message
            : 'Unable to load methodology',
        ),
      );
  }, []);

  return (
    <div className="page-shell">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#DCD7CE] bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#74727A] shadow-sm mb-3">
          <BookOpen size={12} className="text-[#6B5A78]" />
          TECHNICAL DOCUMENTATION
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#30313A] sm:text-4xl">
          APIx Methodology
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#74727A]">
          The implemented statistical path from live airfare observations to route, national and periodic indicators.
        </p>
      </div>

      {error ? (
        <div className="alert-error mt-6">
          <Info size={15} />
          {error}
        </div>
      ) : !m ? (
        <div className="py-24 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#6B5A78] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status"></div>
          <div className="mt-4 text-sm font-medium text-[#74727A]">Loading backend methodology…</div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Methodology summary banner */}
          <div className="overflow-hidden rounded-2xl border border-[#DCD7CE] bg-white shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#DCD7CE]">
              <div className="p-5 flex flex-col justify-center bg-[#F6F2EC]">
                <div className="text-[10px] font-bold uppercase tracking-wide text-[#74727A] mb-1">Version</div>
                <div className="text-xl font-bold text-[#30313A]">{m.version}</div>
              </div>
              <div className="p-5 flex flex-col justify-center bg-[#F6F2EC]">
                <div className="text-[10px] font-bold uppercase tracking-wide text-[#74727A] mb-1">Base Index</div>
                <div className="text-xl font-bold text-[#30313A]">{m.base_index}</div>
              </div>
              <div className="p-5 flex flex-col justify-center bg-[#F6F2EC]">
                <div className="text-[10px] font-bold uppercase tracking-wide text-[#74727A] mb-1">Lead-time Windows</div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {m.lead_time_windows.map((x) => (
                    <span key={x} className="inline-flex items-center rounded-md bg-[#EEE8F2] px-2 py-1 text-[11px] font-semibold text-[#6B5A78]">
                      T+{x}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-[#DCD7CE] p-5">
              <div className="flex gap-3 items-start">
                <Info size={18} className="text-[#6B5A78] shrink-0 mt-0.5" />
                <p className="text-sm leading-6 text-[#5F5A63]">
                  {m.cpi_relationship}
                </p>
              </div>
            </div>
          </div>

          {/* Methodology flow */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Layers size={18} className="text-[#6B5A78]" />
              <h2 className="text-lg font-bold text-[#30313A]">Data Processing Pipeline</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Step
                n="01"
                title="Collect"
                Icon={Search}
                text="The collection layer requests current fares from configured live sources for the representative route basket and the configured advance-purchase windows."
              />
              <Step
                n="02"
                title="Validate"
                Icon={ShieldCheck}
                text="Route, travel date, currency, fare, stops, duration and required-field constraints are applied before an observation becomes eligible for index calculation."
              />
              <Step
                n="03"
                title="Standardize"
                Icon={Settings2}
                text="The prototype targets an adult, economy, one-way, non-stop fare and uses the total mandatory consumer fare actually exposed by the source."
              />
              <Step
                n="04"
                title="Deduplicate"
                Icon={CopyMinus}
                text="Stable observation and flight-instance keys are used to prevent the same underlying flight observation from being counted repeatedly within the collection and cleaning process."
              />
              <Step
                n="05"
                title="Flag outliers"
                Icon={AlertTriangle}
                text="Statistical outlier detection flags unusually distant observations. Flagged records remain stored for auditability but are excluded from index calculations."
              />
              <Step
                n="06"
                title="Calculate"
                Icon={Calculator}
                text="Valid price relatives are aggregated using a geometric-mean/Jevons-style calculation at the elementary level, followed by route aggregation and passenger-volume-weighted national aggregation."
              />
            </div>
          </div>

          {/* Core formulas */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <FileText size={18} className="text-[#6B5A78]" />
              <h2 className="text-lg font-bold text-[#30313A]">Core Statistical Formulas</h2>
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Formula
                title="Price Relative"
                note="P is the standardized mandatory consumer fare. The reference fare is the matched base/reference observation for the same route and lead-time window."
                formula={<span>R = (P<sub>current</sub> / P<sub>reference</sub>) × 100</span>}
              />

              <Formula
                title="Jevons Elementary Index"
                note="Positive price relatives are combined using the geometric mean. This provides the elementary airfare movement measure used by the prototype."
                formula={<span>I = (∏ R<sub>i</sub>)<sup>1/n</sup></span>}
              />

              <Formula
                title="Route APIx"
                note="The route index combines the available lead-time-window price relatives using the implemented geometric-mean aggregation. A route is reported only from eligible observed windows."
                formula={<span>I<sub>route,t</sub> = (∏ R<sub>route,t,w</sub>)<sup>1/k</sup></span>}
              />

              <Formula
                title="DGCA Passenger-Volume Route Weight"
                note="Q represents passenger volume for route r in the verified DGCA reference dataset. The weights are derived from reference traffic data, not generated by the airfare scraper."
                formula={<span>w<sub>r</sub> = Q<sub>r</sub> / ΣQ<sub>r</sub></span>}
              />

              <Formula
                title="National APIx"
                note="The national indicator uses a passenger-volume-weighted geometric aggregation of covered route indexes. Weights of covered routes are renormalized when some configured routes are unavailable."
                formula={<span>APIx<sub>t</sub> = exp(Σ w<sub>r</sub> × ln(I<sub>r,t</sub>))</span>}
              />

              <Formula
                title="Publication Coverage"
                note="National publication requires the configured minimum route-coverage condition. The current prototype threshold is 80% of the weighted route basket."
                formula={<span>Coverage<sub>t</sub> = W<sub>covered</sub> / W<sub>total</sub></span>}
              />
            </div>
          </div>

          {/* Fare standardization visually enhanced */}
          <Card className="border-[#DCD7CE] shadow-sm">
            <div className="mb-6 flex items-center gap-2">
              <Settings2 size={18} className="text-[#6B5A78]" />
              <div>
                <h2 className="text-base font-bold text-[#30313A]">Fare Standardization Pipeline</h2>
                <p className="text-xs text-[#74727A] mt-1">Transforming raw inputs into comparable elementary prices</p>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-[#F6F2EC] p-6 rounded-xl border border-[#E1DBD2]">
              {[
                'Observed source fare',
                'Adult',
                'Economy',
                'One-way',
                'Non-stop',
                'Mandatory charges',
              ].map((x, i) => (
                <React.Fragment key={x}>
                  <div className="w-full lg:w-auto flex-1 rounded-lg border border-[#DCD7CE] bg-white p-3 text-center text-xs font-semibold text-[#4B4851] shadow-sm">
                    {x}
                  </div>
                  <div className="hidden lg:flex shrink-0 items-center justify-center text-[#CDC5BB]">
                    <ArrowRight size={16} />
                  </div>
                  <div className="flex lg:hidden shrink-0 items-center justify-center text-[#CDC5BB] py-1">
                    <ArrowDown size={16} />
                  </div>
                </React.Fragment>
              ))}
              <div className="w-full lg:w-auto flex-1 rounded-lg border border-[#6B5A78] bg-[#EEE8F2] p-3 text-center text-xs font-bold text-[#6B5A78] shadow-sm ring-2 ring-[#EEE8F2]">
                Standardized fare
              </div>
            </div>

            <div className="mt-5 flex gap-3 rounded-lg bg-[#F7F2E7] p-4 text-[#95672D] border border-[#E1CFAB]">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p className="text-xs leading-5">
                <strong>Excluded from standardization:</strong> Optional baggage, seat selection, meals, insurance, flexible upgrades and member/coupon discounts are strictly excluded and not silently added to the standardized price.
              </p>
            </div>
          </Card>

          {/* National APIx explanation */}
          <Card className="border-[#DCD7CE] shadow-sm">
            <div className="mb-6 flex items-center gap-2">
              <Weight size={18} className="text-[#6B5A78]" />
              <div>
                <h2 className="text-base font-bold text-[#30313A]">National Aggregation</h2>
                <p className="text-xs text-[#74727A] mt-1">Passenger-volume-weighted route basket approach</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-[#DCD7CE] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-[#6B5A78]"></div>
                  <div className="text-sm font-bold text-[#30313A]">Reference basket</div>
                </div>
                <p className="text-xs leading-5 text-[#5F5A63]">
                  The prototype uses the verified DGCA passenger-volume reference dataset to construct the route basket and assign accurate baseline route weights.
                </p>
              </div>

              <div className="rounded-xl border border-[#DCD7CE] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-[#5D8D70]"></div>
                  <div className="text-sm font-bold text-[#30313A]">Covered routes</div>
                </div>
                <p className="text-xs leading-5 text-[#5F5A63]">
                  Only routes with sufficient valid, standardizable airfare observations are permitted to contribute to the published national calculation.
                </p>
              </div>

              <div className="rounded-xl border border-[#DCD7CE] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-[#F79009]"></div>
                  <div className="text-sm font-bold text-[#30313A]">Missing routes</div>
                </div>
                <p className="text-xs leading-5 text-[#5F5A63]">
                  Missing routes are never assigned artificial or imputed prices. Instead, the weights of the successfully covered routes are renormalized.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-[#C7B8CE] bg-[#F1EDF4] p-5 shadow-inner">
              <div className="flex items-center gap-2 text-sm font-bold text-[#5C4C67] mb-2">
                <Activity size={16} />
                Current prototype state
              </div>
              <p className="text-sm leading-6 text-[#4A3D52]">
                The current National APIx is calculated from the configured <strong>40-directional-route basket</strong>. The latest verified build uses <strong>38 covered routes</strong>, representing <strong>95.0% route coverage</strong>, weighted strictly against DGCA 2024–25 passenger-volume data.
              </p>
            </div>
          </Card>

          {/* 3-Column Policy Grid */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Data source policy */}
            <Card className="flex flex-col border-[#DCD7CE] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck size={18} className="text-[#718A78]" />
                <h3 className="text-sm font-bold text-[#30313A]">Data Source Policy</h3>
              </div>
              <div className="space-y-4 flex-1">
                <div>
                  <h4 className="text-xs font-bold text-[#4B4851]">Live measurement layer</h4>
                  <p className="mt-1 text-xs leading-5 text-[#74727A]">
                    Airfare observations are collected during scheduled runs and stored with precise timestamps, route, travel date, lead time, source and quality metadata.
                  </p>
                </div>
                <div className="h-px w-full bg-[#E1DBD2]"></div>
                <div>
                  <h4 className="text-xs font-bold text-[#4B4851]">Reference layer</h4>
                  <p className="mt-1 text-xs leading-5 text-[#74727A]">
                    DGCA traffic data strictly supplies route-selection and passenger-volume weights. It is never used as a substitute for live airfare measurements.
                  </p>
                </div>
              </div>
            </Card>

            {/* CPI relationship */}
            <Card className="flex flex-col border-[#DCD7CE] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Database size={18} className="text-[#6B5A78]" />
                <h3 className="text-sm font-bold text-[#30313A]">Relationship to CPI</h3>
              </div>
              <div className="flex-1">
                <div className="rounded-lg bg-[#F6F2EC] p-4 border border-[#E1DBD2] h-full">
                  <h4 className="text-xs font-bold text-[#4B4851] mb-2">High-frequency augmentation indicator</h4>
                  <p className="text-xs leading-5 text-[#74727A]">
                    APIx is explicitly designed as a high-frequency airfare price indicator meant to augment airfare price measurement for real-time economic monitoring. It should not be interpreted as a replacement for the official CPI produced by NSO/MoSPI.
                  </p>
                </div>
              </div>
            </Card>

            {/* Periodic indices */}
            <Card className="flex flex-col border-[#DCD7CE] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={18} className="text-[#7B6A88]" />
                <h3 className="text-sm font-bold text-[#30313A]">Periodic Indices</h3>
              </div>
              <div className="flex-1 space-y-3 text-xs">
                <p className="leading-5 text-[#74727A] mb-3">
                  Historical gaps are preserved; the frontend does not fill missing periods with fabricated values.
                </p>
                <div className="flex items-center justify-between border-b border-[#E1DBD2] pb-2">
                  <span className="font-semibold text-[#4B4851]">Daily</span>
                  <span className="text-[#74727A]">Short-term movement</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#E1DBD2] pb-2">
                  <span className="font-semibold text-[#4B4851]">Weekly</span>
                  <span className="text-[#74727A]">Smoothed movement</span>
                </div>
                <div className="flex items-center justify-between pb-1">
                  <span className="font-semibold text-[#4B4851]">Monthly</span>
                  <span className="text-[#74727A]">Long-period aggregation</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Auditability */}
          <Card className="border-[#DCD7CE] bg-gradient-to-br from-white to-[#F6F2EC] shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <CheckCircle size={18} className="text-[#5D8D70]" />
              <div>
                <h2 className="text-base font-bold text-[#30313A]">Reproducibility & Auditability</h2>
                <p className="text-xs text-[#74727A] mt-1">Every published value has traceable inputs</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 text-sm">
              <div className="rounded-xl border border-[#E1DBD2] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="font-bold text-[#30313A]">Timestamped observations</div>
                <p className="mt-2 text-xs leading-5 text-[#74727A]">
                  Immutable collection timestamps precisely identify when live airfare observations entered the system pipeline.
                </p>
              </div>

              <div className="rounded-xl border border-[#E1DBD2] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="font-bold text-[#30313A]">Versioned methodology</div>
                <p className="mt-2 text-xs leading-5 text-[#74727A]">
                  The backend clearly exposes the methodology version used by the index calculation for absolute version control.
                </p>
              </div>

              <div className="rounded-xl border border-[#E1DBD2] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="font-bold text-[#30313A]">Quality traceability</div>
                <p className="mt-2 text-xs leading-5 text-[#74727A]">
                  Flagged observations remain securely stored for deep audits rather than being silently deleted from the dataset.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}