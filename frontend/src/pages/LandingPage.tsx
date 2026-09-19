import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Database,
  Globe2,
  Plane,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

// Video background import from src/assets/
import heroVideo from "../assets/hero-video.mp4";

interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  text: string;
}

function InfoCard({ icon, title, text }: InfoCardProps) {
  return (
    <div className="rounded-xl border border-[#E4E7EC] bg-[#F5F7F8] p-4 text-left">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#155EEF] shadow-sm">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-[#172033]">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-[#667085]">{text}</p>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  const enterApplication = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#F5F7F8] text-[#172033]">
      {/* =========================
          HERO WITH VIDEO BACKGROUND
      ========================== */}
      <section className="relative flex min-h-screen flex-col overflow-hidden bg-slate-950">
        {/* Background Video */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover object-right"
          >
            <source src={heroVideo} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Left-focused gradient overlay for crisp text contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/30" />
        </div>

        {/* =========================
            NAVBAR
        ========================== */}
        <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
          <button
            onClick={() => navigate("/")}
            className="group flex items-center gap-3 text-left focus:outline-none"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#155EEF] text-white shadow-lg shadow-blue-500/20 transition group-hover:scale-105">
              <Plane className="h-5 w-5 -rotate-6" />
            </div>

            <div>
              <div className="text-lg font-bold tracking-tight text-white drop-shadow-sm">
                APIx
              </div>
              <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">
                Airfare Price Index
              </div>
            </div>
          </button>

          <div className="hidden items-center gap-8 text-sm font-medium text-slate-200 md:flex">
            <a href="#about" className="transition hover:text-white">
              About
            </a>
            <a href="#methodology" className="transition hover:text-white">
              Methodology
            </a>
            <a href="#data" className="transition hover:text-white">
              Data
            </a>

            <button
              onClick={enterApplication}
              className="rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-white backdrop-blur-md shadow-sm transition hover:border-white hover:bg-white/20"
            >
              Open Application
            </button>
          </div>
        </header>

        {/* =========================
            HERO CONTENT
        ========================== */}
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-6 pb-20 pt-8 lg:px-8">
          <div className="grid w-full items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Left side text container */}
            <div className="max-w-xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-400 backdrop-blur-md shadow-lg">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Statistical Monitoring Prototype
              </div>

              <h1 className="text-5xl font-semibold leading-[1.04] tracking-[-0.04em] text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] sm:text-6xl lg:text-[70px]">
                Real-time
                <br />
                <span className="text-sky-400 drop-shadow-[0_0_25px_rgba(56,189,248,0.4)]">
                  Airfare Price
                </span>
                <br />
                Index for India
              </h1>

              <p className="mt-7 max-w-lg text-base leading-7 text-slate-200 drop-shadow-md sm:text-lg">
                A high-frequency airfare price indicator designed to monitor
                domestic airfare movements through automated data collection,
                validation and index calculation.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={enterApplication}
                  className="group inline-flex items-center gap-3 rounded-xl bg-[#155EEF] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(21,94,239,0.35)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#104AC2]"
                >
                  Enter Application
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </button>

                <a
                  href="#methodology"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:border-white/50 hover:bg-white/20"
                >
                  Explore Methodology
                </a>
              </div>

              {/* Feature Pills */}
              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-slate-200">
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-1.5 backdrop-blur-md shadow-sm">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Validated observations
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-1.5 backdrop-blur-md shadow-sm">
                  <Database className="h-4 w-4 text-sky-400" />
                  Real collected data
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-1.5 backdrop-blur-md shadow-sm">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  High-frequency indicator
                </div>
              </div>
            </div>

            {/* Right side is left completely empty so the airplane in the video is fully visible */}
            <div className="hidden lg:block min-h-[480px]" />
          </div>
        </div>

        {/* Scroll hint */}
        <div className="relative z-10 flex justify-center pb-7">
          <a
            href="#about"
            className="flex flex-col items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300 transition hover:text-white"
          >
            <span>Scroll to explore</span>
            <span className="h-8 w-px bg-slate-400/50" />
          </a>
        </div>
      </section>

      {/* =========================
          ABOUT
      ========================== */}
      <section
        id="about"
        className="border-t border-[#E4E7EC] bg-white py-24"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#155EEF]">
                The Prototype
              </div>

              <h2 className="mt-4 max-w-md text-4xl font-semibold tracking-[-0.03em] text-[#172033]">
                Turning airfare observations into an economic signal.
              </h2>
            </div>

            <div className="max-w-2xl">
              <p className="text-lg leading-8 text-[#667085]">
                APIx is designed as a real-time statistical monitoring system
                for domestic airfare. It collects observable airfare data,
                validates and standardizes the observations, and converts
                them into comparable price movements.
              </p>

              <p className="mt-5 text-base leading-7 text-[#667085]">
                The resulting indicator is intended to provide a more
                frequent view of airfare movements and support analysis
                related to consumer price measurement.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <InfoCard
                  icon={<Database className="h-5 w-5" />}
                  title="Collect"
                  text="Automated airfare observations"
                />

                <InfoCard
                  icon={<ShieldCheck className="h-5 w-5" />}
                  title="Validate"
                  text="Quality checks and standardization"
                />

                <InfoCard
                  icon={<BarChart3 className="h-5 w-5" />}
                  title="Measure"
                  text="Comparable airfare movements"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================
          METHODOLOGY
      ========================== */}
      <section
        id="methodology"
        className="border-t border-[#E4E7EC] bg-[#F5F7F8] py-24"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0E9F9A]">
              Methodology
            </div>

            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">
              From observed fares to an index.
            </h2>

            <p className="mt-5 leading-7 text-[#667085]">
              The prototype follows a structured pipeline so that collected
              airfare observations can be transformed into a consistent
              statistical indicator.
            </p>
          </div>

          {/* Methodology flow */}
          <div className="mt-14 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {[
              ["01", "Collect", "Airfare observations from authorized sources"],
              ["02", "Validate", "Route, date, fare and data-quality checks"],
              ["03", "Standardize", "Comparable adult economy one-way fares"],
              ["04", "Calculate", "Price relatives and Jevons aggregation"],
              ["05", "Index", "Route-level and national aggregation"],
            ].map(([number, title, text]) => (
              <div
                key={number}
                className="relative rounded-2xl border border-[#E4E7EC] bg-white p-6"
              >
                <div className="text-xs font-bold text-[#155EEF]">
                  {number}
                </div>

                <h3 className="mt-5 font-semibold">{title}</h3>

                <p className="mt-2 text-sm leading-6 text-[#667085]">
                  {text}
                </p>
              </div>
            ))}
          </div>

          {/* Formula */}
          <div className="mt-8 rounded-2xl border border-[#D0D5DD] bg-white p-7">
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-[#667085]">
              Core index concept
            </div>

            <div className="mt-5 overflow-x-auto">
              <div className="min-w-max font-mono text-lg text-[#172033]">
                Price Relative = (Current Fare / Base Fare) × 100
              </div>
            </div>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-[#667085]">
              Route-level observations are combined using a geometric-mean
              (Jevons) approach. Higher-level aggregation uses available
              verified route weights rather than fabricated weights.
            </p>
          </div>
        </div>
      </section>

      {/* =========================
          DATA / TRUST
      ========================== */}
      <section
        id="data"
        className="border-t border-[#E4E7EC] bg-white py-24"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#155EEF]">
                Data & Trust
              </div>

              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">
                Built around observable data, not fabricated numbers.
              </h2>

              <p className="mt-5 max-w-xl leading-7 text-[#667085]">
                Every observation passes through collection, validation,
                cleaning and quality-control stages before it can contribute
                to the index.
              </p>

              <button
                onClick={enterApplication}
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#172033] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#27334A]"
              >
                View live data
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-3xl border border-[#E4E7EC] bg-[#F5F7F8] p-7">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">
                    Data Processing Pipeline
                  </div>
                  <div className="mt-1 text-xs text-[#667085]">
                    End-to-end prototype workflow
                  </div>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
                  <Database className="h-4 w-4 text-[#155EEF]" />
                </div>
              </div>

              <div className="space-y-3">
                {[
                  ["01", "Source Collection", "Airfare observations"],
                  ["02", "Validation", "Schema & constraints"],
                  ["03", "Cleaning", "Deduplication & outliers"],
                  ["04", "Index Engine", "Jevons calculation"],
                  ["05", "APIx", "Statistical indicator"],
                ].map(([num, title, text]) => (
                  <div
                    key={num}
                    className="flex items-center gap-4 rounded-xl border border-[#E4E7EC] bg-white px-4 py-4"
                  >
                    <span className="text-xs font-bold text-[#155EEF]">
                      {num}
                    </span>

                    <div className="flex-1">
                      <div className="text-sm font-semibold">{title}</div>
                      <div className="text-xs text-[#667085]">{text}</div>
                    </div>

                    <div className="h-2 w-2 rounded-full bg-[#0E9F9A]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================
          CPI CONTEXT
      ========================== */}
      <section className="border-t border-[#E4E7EC] bg-[#172033] py-24 text-white">
        <div className="mx-auto max-w-5xl px-6 text-center lg:px-8">
          <Globe2 className="mx-auto h-7 w-7 text-[#38BDF8]" />

          <div className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#98A2B3]">
            Economic Measurement
          </div>

          <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            A high-frequency airfare signal for deeper price monitoring.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl leading-7 text-[#B8C0CF]">
            APIx is designed to augment airfare price measurement by providing
            more frequent observations of market airfare movements. It is a
            prototype indicator and does not replace the official Consumer
            Price Index.
          </p>

          <button
            onClick={enterApplication}
            className="mt-9 inline-flex items-center gap-3 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-[#172033] transition hover:-translate-y-0.5 hover:bg-[#F5F7F8]"
          >
            Enter APIx
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* =========================
          FOOTER
      ========================== */}
      <footer className="border-t border-[#E4E7EC] bg-white py-12 text-[#667085]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 sm:flex-row lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#172033] text-white">
              <Plane className="h-4 w-4 -rotate-6" />
            </div>
            <span className="text-sm font-semibold text-[#172033]">
              APIx — Airfare Price Index
            </span>
          </div>

          <p className="text-xs">
            © {new Date().getFullYear()} APIx Prototype. Designed for statistical analysis.
          </p>
        </div>
      </footer>
    </div>
  );
}