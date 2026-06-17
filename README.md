# RV Gems ERP

RV Gems ERP is a full-stack ERP application for diamond trading workflows.

## Stack

- Frontend: Static HTML/CSS/JS (GitHub Pages)
- Backend: ASP.NET Core Web API (`backend`)
- Database: PostgreSQL (Supabase)
- Deployment: Render (backend) + GitHub Pages (frontend)

## Repository Structure

- `frontend/` - UI pages and client-side logic
- `backend/` - .NET API, EF Core models, controllers, migrations
- `Dockerfile` - Backend container build for Render

## Production URLs

- Frontend: `https://jenissavani25.github.io/RVERP/frontend/index.html`
- Backend API base: `https://rv-gems-backend.onrender.com/api/ERP`

## Backend Environment Variables (Render)

Set this variable in Render:

- `ConnectionStrings__DefaultConnection`

Example (session pooler on Supabase):

`Host=aws-1-ap-southeast-2.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.<project-ref>;Password=<password>;SSL Mode=Require;Trust Server Certificate=true`

## Local Development

### Backend

1. Install .NET 8 SDK
2. Run from repo root:
   - `dotnet restore backend/backend.csproj`
   - `dotnet run --project backend/backend.csproj`

Default local API URL:

- `http://localhost:5000/api/ERP`

### Frontend

Open any page in `frontend/` with a local static server or browser.

The frontend resolves API URL as:

- Localhost -> `http://localhost:5000/api/ERP`
- Non-localhost -> `https://rv-gems-backend.onrender.com/api/ERP`

You can override API URL in browser localStorage key:

- `rv_gems_api_url`

## Deployment Notes

- Backend is deployed from this repo via `Dockerfile`.
- Frontend is served by GitHub Pages from this repository.
- Keep secrets only in Render env vars. Do not store credentials in committed files.

## Recent Reliability Fixes

- Frontend save flows now surface API failures instead of silently redirecting.
- Backend write-path dates are normalized to UTC before PostgreSQL writes (`timestamp with time zone` compatibility).

## Troubleshooting

- If save fails, check browser Network tab for endpoint/status/body.
- Check Render logs for API exceptions.
- For Supabase connection stability, use pooler session mode (`Port=5432`).
