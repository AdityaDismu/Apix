# APIx Frontend

React + Vite + TypeScript + Tailwind frontend for the APIx Real-Time Airfare Price Index prototype.

## Backend connection

Create `.env` from `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

The frontend reads live data from FastAPI. Statistical values do not fall back to a fabricated local dataset.

## Run

```powershell
npm install
npm run dev
```

Production verification:

```powershell
npm run typecheck
npm run build
```

## Routes

`/` landing · `/dashboard` dashboard · `/routes` route explorer · `/analytics` analytics · `/quality` data quality · `/pipeline` collection pipeline · `/backtesting` backtesting · `/methodology` methodology · `/system` system status.

## Integrity

National APIx is displayed only when the backend has verified route weights and sufficient route coverage. Source fields that are unavailable remain null/unavailable. Flagged observations remain auditable and are not presented as valid index inputs. Missing historical periods are not fabricated.
