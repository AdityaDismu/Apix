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
    <div className="relative flex flex-col rounded-2xl border border-[#E4E7EC] bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      <div className="mb-5 flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F0F6FF] text-[#155EEF] shadow-sm">
          <Icon size={24} strokeWidth={2} />
        </div>
        <div className="font-mono text-3xl font-black text-[#F2F4F7] select-none">
          {n}
        </div>
      </div>

      <h3 className="text-base font-bold text-[#172033]">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-[#475467] flex-1">
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
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[#E4E7EC] bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="border-b border-[#E4E7EC] bg-[#F9FAFB] px-5 py-3.5 flex items-center justify-between">
        <h4 className="text-sm font-bold text-[#172033]">{title}</h4>
        <Calculator size={14} className="text-[#98A2B3]" />
      </div>
      
      <div className="flex-1 bg-[#0C111D] p-6 flex items-center justify-center relative overflow-hidden">
        {/* Subtle background grid effect */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1F2937_1px,transparent_1px),linear-gradient(to_bottom,#1F2937_1px,transparent_1px)] bg-[size:1rem_1rem] opacity-20"></div>
        <div className="relative z-10 w-full overflow-x-auto text-center font-mono text-[15px] sm:text-base tracking-wide text-[#32D583] py-2 whitespace-nowrap">
          {formula}
        </div>
      </div>

      <div className="border-t border-[#E4E7EC] bg-white px-5 py-4">
        <p className="text-xs leading-5 text-[#667085]">
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
        <div className="inline-flex items-center gap-2 rounded-full border border-[#E4E7EC] bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#667085] shadow-sm mb-3">
          <BookOpen size={12} className="text-[#155EEF]" />
          TECHNICAL DOCUMENTATION
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#172033] sm:text-4xl">
          APIx Methodology
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#667085]">
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
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#155EEF] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status"></div>
          <div className="mt-4 text-sm font-medium text-[#667085]">Loading backend methodology…</div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Methodology summary banner */}
          <div className="overflow-hidden rounded-2xl border border-[#E4E7EC] bg-white shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E4E7EC]">
              <div className="p-5 flex flex-col justify-center bg-[#F9FAFB]">
                <div className="text-[10px] font-bold uppercase tracking-wide text-[#667085] mb-1">Version</div>
                <div className="text-xl font-bold text-[#172033]">{m.version}</div>
              </div>
              <div className="p-5 flex flex-col justify-center bg-[#F9FAFB]">
                <div className="text-[10px] font-bold uppercase tracking-wide text-[#667085] mb-1">Base Index</div>
                <div className="text-xl font-bold text-[#172033]">{m.base_index}</div>
              </div>
              <div className="p-5 flex flex-col justify-center bg-[#F9FAFB]">
                <div className="text-[10px] font-bold uppercase tracking-wide text-[#667085] mb-1">Lead-time Windows</div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {m.lead_time_windows.map((x) => (
                    <span key={x} className="inline-flex items-center rounded-md bg-[#EEF4FF] px-2 py-1 text-[11px] font-semibold text-[#155EEF]">
                      T+{x}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-[#E4E7EC] p-5">
              <div className="flex gap-3 items-start">
                <Info size={18} className="text-[#155EEF] shrink-0 mt-0.5" />
                <p className="text-sm leading-6 text-[#475467]">
                  {m.cpi_relationship}
                </p>
              </div>
            </div>
          </div>

          {/* Methodology flow */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Layers size={18} className="text-[#155EEF]" />
              <h2 className="text-lg font-bold text-[#172033]">Data Processing Pipeline</h2>
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
              <FileText size={18} className="text-[#155EEF]" />
              <h2 className="text-lg font-bold text-[#172033]">Core Statistical Formulas</h2>
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
          <Card className="border-[#E4E7EC] shadow-sm">
            <div className="mb-6 flex items-center gap-2">
              <Settings2 size={18} className="text-[#155EEF]" />
              <div>
                <h2 className="text-base font-bold text-[#172033]">Fare Standardization Pipeline</h2>
                <p className="text-xs text-[#667085] mt-1">Transforming raw inputs into comparable elementary prices</p>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-[#F9FAFB] p-6 rounded-xl border border-[#EAECF0]">
              {[
                'Observed source fare',
                'Adult',
                'Economy',
                'One-way',
                'Non-stop',
                'Mandatory charges',
              ].map((x, i) => (
                <React.Fragment key={x}>
                  <div className="w-full lg:w-auto flex-1 rounded-lg border border-[#E4E7EC] bg-white p-3 text-center text-xs font-semibold text-[#344054] shadow-sm">
                    {x}
                  </div>
                  <div className="hidden lg:flex shrink-0 items-center justify-center text-[#D0D5DD]">
                    <ArrowRight size={16} />
                  </div>
                  <div className="flex lg:hidden shrink-0 items-center justify-center text-[#D0D5DD] py-1">
                    <ArrowDown size={16} />
                  </div>
                </React.Fragment>
              ))}
              <div className="w-full lg:w-auto flex-1 rounded-lg border border-[#155EEF] bg-[#EEF4FF] p-3 text-center text-xs font-bold text-[#155EEF] shadow-sm ring-2 ring-[#EEF4FF]">
                Standardized fare
              </div>
            </div>

            <div className="mt-5 flex gap-3 rounded-lg bg-[#FFFAEB] p-4 text-[#B54708] border border-[#FEDF89]">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p className="text-xs leading-5">
                <strong>Excluded from standardization:</strong> Optional baggage, seat selection, meals, insurance, flexible upgrades and member/coupon discounts are strictly excluded and not silently added to the standardized price.
              </p>
            </div>
          </Card>

          {/* National APIx explanation */}
          <Card className="border-[#E4E7EC] shadow-sm">
            <div className="mb-6 flex items-center gap-2">
              <Weight size={18} className="text-[#155EEF]" />
              <div>
                <h2 className="text-base font-bold text-[#172033]">National Aggregation</h2>
                <p className="text-xs text-[#667085] mt-1">Passenger-volume-weighted route basket approach</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-[#E4E7EC] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-[#155EEF]"></div>
                  <div className="text-sm font-bold text-[#172033]">Reference basket</div>
                </div>
                <p className="text-xs leading-5 text-[#475467]">
                  The prototype uses the verified DGCA passenger-volume reference dataset to construct the route basket and assign accurate baseline route weights.
                </p>
              </div>

              <div className="rounded-xl border border-[#E4E7EC] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-[#12B76A]"></div>
                  <div className="text-sm font-bold text-[#172033]">Covered routes</div>
                </div>
                <p className="text-xs leading-5 text-[#475467]">
                  Only routes with sufficient valid, standardizable airfare observations are permitted to contribute to the published national calculation.
                </p>
              </div>

              <div className="rounded-xl border border-[#E4E7EC] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-[#F79009]"></div>
                  <div className="text-sm font-bold text-[#172033]">Missing routes</div>
                </div>
                <p className="text-xs leading-5 text-[#475467]">
                  Missing routes are never assigned artificial or imputed prices. Instead, the weights of the successfully covered routes are renormalized.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-5 shadow-inner">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1D4ED8] mb-2">
                <Activity size={16} />
                Current prototype state
              </div>
              <p className="text-sm leading-6 text-[#1E3A8A]">
                The current National APIx is calculated from the configured <strong>40-directional-route basket</strong>. The latest verified build uses <strong>38 covered routes</strong>, representing <strong>95.0% route coverage</strong>, weighted strictly against DGCA 2024–25 passenger-volume data.
              </p>
            </div>
          </Card>

          {/* 3-Column Policy Grid */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Data source policy */}
            <Card className="flex flex-col border-[#E4E7EC] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck size={18} className="text-[#0E9F9A]" />
                <h3 className="text-sm font-bold text-[#172033]">Data Source Policy</h3>
              </div>
              <div className="space-y-4 flex-1">
                <div>
                  <h4 className="text-xs font-bold text-[#344054]">Live measurement layer</h4>
                  <p className="mt-1 text-xs leading-5 text-[#667085]">
                    Airfare observations are collected during scheduled runs and stored with precise timestamps, route, travel date, lead time, source and quality metadata.
                  </p>
                </div>
                <div className="h-px w-full bg-[#EAECF0]"></div>
                <div>
                  <h4 className="text-xs font-bold text-[#344054]">Reference layer</h4>
                  <p className="mt-1 text-xs leading-5 text-[#667085]">
                    DGCA traffic data strictly supplies route-selection and passenger-volume weights. It is never used as a substitute for live airfare measurements.
                  </p>
                </div>
              </div>
            </Card>

            {/* CPI relationship */}
            <Card className="flex flex-col border-[#E4E7EC] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Database size={18} className="text-[#155EEF]" />
                <h3 className="text-sm font-bold text-[#172033]">Relationship to CPI</h3>
              </div>
              <div className="flex-1">
                <div className="rounded-lg bg-[#F9FAFB] p-4 border border-[#EAECF0] h-full">
                  <h4 className="text-xs font-bold text-[#344054] mb-2">High-frequency augmentation indicator</h4>
                  <p className="text-xs leading-5 text-[#667085]">
                    APIx is explicitly designed as a high-frequency airfare price indicator meant to augment airfare price measurement for real-time economic monitoring. It should not be interpreted as a replacement for the official CPI produced by NSO/MoSPI.
                  </p>
                </div>
              </div>
            </Card>

            {/* Periodic indices */}
            <Card className="flex flex-col border-[#E4E7EC] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={18} className="text-[#7A5AF8]" />
                <h3 className="text-sm font-bold text-[#172033]">Periodic Indices</h3>
              </div>
              <div className="flex-1 space-y-3 text-xs">
                <p className="leading-5 text-[#667085] mb-3">
                  Historical gaps are preserved; the frontend does not fill missing periods with fabricated values.
                </p>
                <div className="flex items-center justify-between border-b border-[#EAECF0] pb-2">
                  <span className="font-semibold text-[#344054]">Daily</span>
                  <span className="text-[#667085]">Short-term movement</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#EAECF0] pb-2">
                  <span className="font-semibold text-[#344054]">Weekly</span>
                  <span className="text-[#667085]">Smoothed movement</span>
                </div>
                <div className="flex items-center justify-between pb-1">
                  <span className="font-semibold text-[#344054]">Monthly</span>
                  <span className="text-[#667085]">Long-period aggregation</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Auditability */}
          <Card className="border-[#E4E7EC] bg-gradient-to-br from-white to-[#F9FAFB] shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <CheckCircle size={18} className="text-[#12B76A]" />
              <div>
                <h2 className="text-base font-bold text-[#172033]">Reproducibility & Auditability</h2>
                <p className="text-xs text-[#667085] mt-1">Every published value has traceable inputs</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 text-sm">
              <div className="rounded-xl border border-[#EAECF0] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="font-bold text-[#172033]">Timestamped observations</div>
                <p className="mt-2 text-xs leading-5 text-[#667085]">
                  Immutable collection timestamps precisely identify when live airfare observations entered the system pipeline.
                </p>
              </div>

              <div className="rounded-xl border border-[#EAECF0] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="font-bold text-[#172033]">Versioned methodology</div>
                <p className="mt-2 text-xs leading-5 text-[#667085]">
                  The backend clearly exposes the methodology version used by the index calculation for absolute version control.
                </p>
              </div>

              <div className="rounded-xl border border-[#EAECF0] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="font-bold text-[#172033]">Quality traceability</div>
                <p className="mt-2 text-xs leading-5 text-[#667085]">
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