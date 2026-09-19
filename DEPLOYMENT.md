# APIx Deployment Package

This package preserves the existing APIx frontend and backend application code. The deployment-specific changes are limited to Vercel entrypoint/configuration, dependency discovery, environment examples, and removal of local/generated artifacts.

## Vercel project

Deploy from this repository root. Do not set the Vercel Root Directory to `frontend` because the FastAPI function lives in the root `api/` directory.

Vercel runs `npm ci` and `npm run build` inside `frontend/`, serves `frontend/dist`, and exposes the Python function at `/api/*`. The SPA rewrite sends non-API paths to `index.html` so React Router deep links work.

## Required production environment variable

Set `DATABASE_URL` in Vercel Production (and Preview if required) to the existing Supabase/PostgreSQL connection string. Do not commit the real value.

The remaining APIX_* variables may be set from the values used by the existing project if they are not already configured in Vercel.

## Local development

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn api.main:app --reload
```

Frontend:

```powershell
cd frontend
npm ci
npm run dev
```

Copy `frontend/.env.example` to `frontend/.env` for a separate local backend if needed.

## Important

This package intentionally does not include `.env`, `.git`, `node_modules`, virtual environments, Python caches, frontend `dist`, or generated raw/clean airfare evidence. The DGCA processed route basket remains because the deployed API uses it as its authoritative route configuration.
