# APIx — Real-Time Airfare Price Index for India

APIx is a high-frequency airfare price measurement prototype designed to support/augment airfare price measurement for CPI-related analysis. It is **not an official CPI replacement** and it never fabricates missing source data.

## What is implemented

- Live airfare collection through the currently verified `fast-flights`/Google Flights source adapter.
- Source-capability metadata so unavailable fare components remain `NULL` rather than being guessed.
- Six advance-purchase windows: T+1, T+7, T+15, T+21, T+30 and T+45.
- Multi-route configuration from a legitimate DGCA passenger-volume reference file.
- DGCA passenger-volume route weights with validation that weights sum to one.
- Raw evidence files plus PostgreSQL persistence.
- Validation, normalization, de-duplication and IQR outlier flagging.
- Fare-component fields: base fare, taxes, airport fee, UDF, convenience fee and other mandatory fees.
- Route APIx using a Jevons-style price-relative calculation with a stable schedule matching key.
- Passenger-volume-weighted national APIx with minimum route-coverage protection.
- Daily, weekly and monthly national index aggregation in log space.
- Backtesting against an independently supplied DGCA reference fare file.
- MAE, RMSE, MAPE and correlation diagnostics.
- Route movement/heatmap data and lead-time elasticity analysis.
- Explainable API metadata and source transparency endpoints.
- Pipeline run state, quality events and methodology versioning.
- FastAPI API and APScheduler periodic collection.

## Source policy

Only sources for which collection is authorized should be added. The project does not implement CAPTCHA solving, IP rotation for evasion, stealth fingerprinting, unauthorized authenticated requests or reverse engineering of protected APIs. If a source blocks collection, the run records the failure instead of pretending a fare was collected.

## Installation

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and provide the PostgreSQL/Supabase connection string.

## Database

```powershell
python -m database.migrate
```

## Official route basket

Place a legitimately obtained DGCA reference file at `data_sources/reference/dgca_routes.csv`, then:

```powershell
python -m data_sources.import_dgca_routes --input data_sources/reference/dgca_routes.csv
```

Until this step is completed, the system may use the development fallback DEL-BOM configuration, but **no national APIx is published** because there are no verified route weights.

## Run one live pipeline

```powershell
python -m index_engine.realtime_pipeline
```

Pipeline:

`LIVE SOURCE → RAW EVIDENCE → VALIDATION → CLEANING → DATABASE → ROUTE APIx → NATIONAL APIx → PERIODIC INDEX`

## Scheduler

```powershell
python -m index_engine.scheduler
```

## API

```powershell
uvicorn api.main:app --reload
```

Important endpoints:

- `/api/health`
- `/api/routes`
- `/api/sources`
- `/api/airfares`
- `/api/index/route/{origin}/{destination}`
- `/api/index/national`
- `/api/index/periodic/{daily|weekly|monthly}`
- `/api/quality`
- `/api/quality/events`
- `/api/pipeline/runs`
- `/api/analytics/heatmap`
- `/api/analytics/elasticity/{origin}/{destination}`
- `/api/backtest/run`
- `/api/backtest/runs`
- `/api/methodology`

## Backtesting

Provide a legitimate independent DGCA reference file:

```powershell
python -m backtesting.run_backtest --input data_sources/reference/dgca_fares.csv
```

The backtest aligns route/month observations, normalizes both series to 100 at the first common period for each route, and reports MAE, RMSE, MAPE and correlation. The system does not fabricate 30 days of historical scraper data.

## Methodological guardrails

1. Total airfare is used when that is the only consumer price exposed by the source.
2. Missing fare components remain missing.
3. Optional services are not added to the standardized fare.
4. Outliers are flagged and retained in raw/clean evidence, but flagged observations do not contribute to the index.
5. Route weights come from the supplied reference passenger-volume dataset.
6. National APIx is withheld when route coverage is below the configured threshold.
7. APIx is a prototype high-frequency indicator, not the official CPI.
