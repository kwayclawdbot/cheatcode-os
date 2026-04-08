# CheatCode OS — Deployment Guide

## Architecture

```
Vercel (static frontend)
  ├── /api/v1/*        → Railway Python service  (cheatcode-os-api-production)
  ├── /api/trpc/*      → Railway Node service     (cheatcode-os-trpc-production)  ← NEW
  ├── /api/oauth/*     → Railway Node service     (cheatcode-os-trpc-production)
  ├── /api/upload      → Railway Node service     (cheatcode-os-trpc-production)
  └── /*               → index.html (SPA)
```

---

## Railway Node Service (`server/`)

This is the tRPC + Express layer that bridges the React frontend to Supabase and the Python backend.

### Deploy steps

1. In Railway, create a new service inside the `cheatcode-os` project
2. Connect it to the `cheatcode-os` GitHub repo (same repo as the frontend)
3. Set the **root directory** to `/` (the Dockerfile is at the repo root)
4. Railway will auto-detect the `Dockerfile` and `railway.json`
5. Add the environment variables listed below
6. The service will be available at a Railway-generated URL — copy it and update `vercel.json`

### Build & start

```
Build:  docker build -f Dockerfile .
Start:  node dist/index.js
Health: GET /health → { "status": "ok", "service": "cheatcode-os-trpc" }
```

### Required environment variables

| Variable | Purpose | Where to get it |
|---|---|---|
| `NODE_ENV` | Set to `production` | Hardcode: `production` |
| `PORT` | HTTP port (Railway injects this automatically) | Leave unset — Railway sets it |
| `DATABASE_URL` | MySQL/TiDB connection string for Drizzle ORM | Manus project → Secrets |
| `JWT_SECRET` | Session cookie signing secret | Manus project → Secrets |
| `VITE_SUPABASE_URL` | Supabase project URL | Supabase dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | Supabase dashboard → Settings → API |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key for video search | Google Cloud Console |
| `EODHD_API_KEY` | EODHD market data API key | eodhd.com |
| `RAILWAY_API_URL` | Python backend base URL | `https://cheatcode-os-api-production.up.railway.app/api/v1` |
| `RAILWAY_ADMIN_KEY` | Supabase service role key (admin bypass for Railway Python backend) | Supabase dashboard → Settings → API → `service_role` |
| `BUILT_IN_FORGE_API_URL` | Manus LLM/storage API URL | Manus project → Secrets (only needed during Manus build phase) |
| `BUILT_IN_FORGE_API_KEY` | Manus API key | Manus project → Secrets (only needed during Manus build phase) |

> **Note:** `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` are used by the LLM quality filter in the scheduler. Once Manus build phase is complete, replace these with a direct OpenAI/Anthropic key and update `server/_core/llm.ts` accordingly.

### Optional variables (auth, not needed post-Manus)

| Variable | Purpose |
|---|---|
| `VITE_APP_ID` | Manus OAuth app ID (only needed if using Manus OAuth) |
| `OAUTH_SERVER_URL` | Manus OAuth server URL |
| `OWNER_OPEN_ID` | Manus owner ID |

---

## Vercel Frontend Service

The `vercel.json` at the repo root handles all rewrites. After deploying the Railway Node service, update the two placeholder URLs:

```json
"destination": "https://cheatcode-os-trpc-production.up.railway.app/api/trpc/:path*"
```

Replace `cheatcode-os-trpc-production.up.railway.app` with the actual Railway-generated domain for the Node service.

---

## Python Backend Service (`backend/`)

Already deployed at `https://cheatcode-os-api-production.up.railway.app`. No changes needed.

### Daily pipeline (all times UTC)

| Time | Job | Description |
|---|---|---|
| 06:00 | `curation` | Find + score new videos from tracked creators |
| 06:30 | `radar_morning` | Generate Kai's radar snapshot |
| 07:15 | `daily_ingest` | Ingest all approved queue items into vault |
| 07:30 | `daily_analysis` | Kai analyzes ingested content per ticker |
| 14:00 | `radar_midday` | Refresh radar with afternoon data |
| Hourly | `brain` + `price_sync` | Brain cycle + EODHD price sync |

---

## Cutting Manus Dependency

When the build phase is complete:

1. Deploy the Railway Node service (steps above)
2. Update `vercel.json` with the real Railway Node URL
3. Replace `BUILT_IN_FORGE_API_*` with a direct LLM provider key in `server/_core/llm.ts`
4. The Manus-hosted version at `cheatcodeos-qgiapnmx.manus.space` can be retired
5. Vercel + Railway Python + Railway Node is the full production stack — zero Manus dependency
