# CheatCode OS Backend — Architecture

_Last updated: 2026-04-08 (post-rebuild)_

## TL;DR

```
┌──────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  React client    │     │  Supabase        │     │  Your Mac           │
│  (Vite, Vercel)  │────►│  Postgres + Auth │◄────│  Obsidian vault via │
│                  │     │  Realtime + RLS  │     │  vault_sync agent   │
└────────┬─────────┘     └──────────┬───────┘     └─────────────────────┘
         │                          ▲
         │                          │
         │                          │ writes
         ▼                          │
┌──────────────────┐                │
│  Railway /       │────────────────┘
│  Python backend  │   cron jobs only:
│  (FastAPI +      │   - curation (YouTube → Claude → score → Supabase)
│  APScheduler)    │   - ingest (→ vault_store rows + kb_chunks)
│                  │   - rescore (re-run scoring against today's intel)
│                  │   - radar + analysis + price sync
└──────────────────┘
```

**Two services. Supabase is the source of truth. Railway is cron-only.**

---

## Services

### Supabase (`ryprohqthwflinadqotj`)

**Everything lives here.** Auth, database, row-level security, realtime
subscriptions, storage, vector search via `pgvector`.

Tables (17 with RLS enabled):

| Table | RLS policy | Purpose |
|---|---|---|
| `profiles` | owner read/write | User profile + tier + Kai message counter |
| `content` | public read where is_published | Curated videos + quick takes + embeddings |
| `content_tickers` | public read, service write | Ticker mentions per video |
| `creators` | public read, service write | YouTube channel metadata |
| `tickers` | public read, service write | Ticker radar + convergence scores |
| `themes` | public read, service write | Market themes with escalation status |
| `predictions` | public read, service write | Ticker prediction cards |
| `radar_snapshots` | public read, service write | Daily radar output |
| `kb_chunks` | public read, service write | Embedded transcript chunks for Kai RAG |
| `vault_store` | service write | Obsidian vault notes (path → markdown content) |
| `kai_conversations` | owner only | Kai chat history |
| `kai_messages` | owner only | Individual chat turns |
| `kai_usage` | owner read, service write | Spend cap tracking (new in rebuild) |
| `scheduler_runs` | service only | Cron job telemetry (new in rebuild) |
| `user_views` | owner only | Watch history |
| `user_bookmarks` | owner only | Bookmarks |
| `curation_queue` | service only | Internal curation workflow |

### Railway (`cheatcode-os-api`)

**One Python process. 8 cron jobs. No other purpose.**

Background jobs (via APScheduler in `main.py::lifespan`):

| Time (UTC) | Job | What it does |
|---|---|---|
| 06:00 | `curation` | Scan YouTube creators, extract transcripts, Claude context, score, upsert to `content` |
| 06:30 | `radar_morning` | Generate ticker radar |
| 07:15 | `daily_ingest` | Process `ingestion_status=pending` rows → vault_store + kb_chunks |
| 07:20 | `daily_rescore` | Re-score last 14 days against today's intelligence |
| 07:30 | `daily_analysis` | Kai's daily ticker analysis |
| 14:00 | `radar_midday` | Second radar refresh |
| every 60m | `brain` | Intelligence brain cycle |
| every 60m | `price_sync` | EODHD bulk quote sync |

**Critical: Railway is pinned to `numReplicas = 1`** in `railway.toml`.
Running multiple replicas would duplicate every scheduler run, double
Anthropic costs, and race-condition the ticker convergence scores.

The service also serves user-facing `/api/v1/*` HTTP routes (home,
content, kai, payments, etc.) — these are legacy and should eventually
migrate to direct Supabase calls from the client. They're kept for
backward compatibility with the current frontend.

### Mac sync agent (scripts/vault_sync.py)

Runs on Kway's local machine as a LaunchAgent. Polls Supabase
`vault_store` every 5 minutes, pulls any rows newer than the last sync
timestamp, and writes them as markdown files under
`~/.openclaw/vault/06 - Knowledge Base/CheatCode OS/...`. This is the
"Obsidian integration" — Railway writes rows, the Mac reads them and
writes files, Obsidian opens the files.

---

## Required environment variables

All must be set in Railway → `cheatcode-os-api` → Variables.

### Required (backend will refuse to start without these)

| Var | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (server-only) |
| `ANTHROPIC_API_KEY` | Claude API key for Kai + curation + ingestion |
| `OPENAI_API_KEY` | Embeddings for semantic search (`text-embedding-3-small`) |
| `YOUTUBE_API_KEY` | YouTube Data API v3 for channel uploads |
| `EODHD_API_KEY` | EODHD market data for ticker prices + radar |
| `STRIPE_SECRET_KEY` | Stripe live mode secret |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |
| `STRIPE_PRO_PRICE_ID` | Stripe Pro tier price_xxx ID |

### Optional (recommended)

| Var | Default | Purpose |
|---|---|---|
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Comma-separated allowed origins for the frontend |
| `STRIPE_ELITE_PRICE_ID` | _(empty)_ | Stripe Elite tier — missing returns 503 "Elite coming soon" gracefully |
| `KAI_FREE_MESSAGES_PER_DAY` | `5` | Free-tier daily cap |
| `KAI_PRO_MONTHLY_BUDGET_USD` | `15` | Pro monthly spend cap |
| `KAI_ELITE_MONTHLY_BUDGET_USD` | `60` | Elite monthly spend cap |
| `KAI_DAILY_GLOBAL_BUDGET_USD` | `200` | Global daily circuit breaker |
| `SUPABASE_ANON_KEY` | _(empty)_ | Only used if service key is unavailable |
| `RELEVANCE_THRESHOLD` | `0.6` | Publish gate for curated content |
| `REDIS_URL` | _(empty)_ | Currently unused; future distributed locks |
| `PERPLEXITY_API_KEY` | _(empty)_ | Currently unused; future deep research feature |

---

## Migrations

Applied directly via Supabase MCP during development. Files kept in
`backend/migrations/` as audit trail, not auto-run.

| # | File | Date | What it did |
|---|---|---|---|
| 001 | `001_initial_schema.sql` | initial | Core tables |
| 002 | `002_vector_search_function.sql` | initial | `match_content` RPC |
| 003 | `003_seed_creators.sql` | initial | Seed creator list |
| 004 | `004_value_score.sql` | 2026-04-07 | Added `value_score` column to content |
| 005 | `005_ingestion_tracking.sql` | 2026-04-07 | Added `ingestion_status/error/attempts/at` columns |
| 006 | `006_kai_usage_tracking.sql` | 2026-04-08 | Added `kai_usage` table for spend cap enforcement |
| 007 | `007_content_unique_constraint.sql` | 2026-04-08 | Unique index on `(source_platform, external_id)` + dedupe |
| 008 | `008_rls_telemetry_and_indexes.sql` | 2026-04-08 | RLS on 8 tables, `scheduler_runs` table, hot-path indexes |

**To apply a new migration:** Claude writes it via the Supabase MCP
`apply_migration` tool, commits the SQL file to git for audit, done.
No migration runner needed — Supabase is the source of truth.

---

## Scoring metrics (for reference)

The backend computes three different scores, each answering a different question.

| Metric | Scale | What it answers | Where computed |
|---|---|---|---|
| `convergence_score` | 0-100 | "How strong is the signal on THIS TICKER right now?" | `intelligence.py::compute_convergence_score` |
| `relevance_score` | 0.0-1.0 | "Is this video timely for TODAY's market?" | `curation.py::score_relevance` |
| `value_score` | 0-100 | "Is this video worth watching?" (stable, user-facing) | `curation.py::score_value` |

See `backend/app/services/curation.py` top of file for the full formula
breakdown of `value_score` (creator quality + insight density + transcript
density + skill clarity + engagement quality + recency).

---

## Monitoring

### Scheduler runs

```bash
# Is my pipeline healthy?
curl https://cheatcode-os-api-production.up.railway.app/api/v1/admin/runs/summary \
  -H "Authorization: Bearer $(admin_session_jwt)"
```

Returns per-job 24h summary: last status, last duration, failure count.
Use this instead of tailing Railway logs.

### Detail on a specific job

```bash
# See the last 20 curation runs
curl ".../admin/runs?job_id=curation&limit=20" -H "Authorization: Bearer ..."

# See only failed runs across all jobs
curl ".../admin/runs?status=failed&limit=50" -H "Authorization: Bearer ..."
```

### Health check

`GET /health` returns 200 if the backend can talk to Supabase, 503 if
it can't. Railway uses this for its restart policy — a dead DB gets
the container restarted automatically.

### Kai spend

```sql
-- Monthly spend by user (top 10)
SELECT u.email, SUM(k.cost_usd) AS monthly_spend
FROM kai_usage k
JOIN auth.users u ON u.id = k.user_id
WHERE k.created_at >= date_trunc('month', now())
GROUP BY u.email
ORDER BY monthly_spend DESC
LIMIT 10;

-- Global spend today
SELECT SUM(cost_usd) AS today_spend
FROM kai_usage
WHERE created_at >= date_trunc('day', now());
```

---

## How to add a feature

1. **Need a new column or table?** Ask Claude. He applies it via Supabase MCP, commits the SQL file to `backend/migrations/`.
2. **Need a new scheduled job?** Add a service function, wrap it with `with_telemetry(fn, "job_id")` in `main.py::lifespan`, done.
3. **Need to call Claude from a new code path?** Wrap it through `kai_budget.check_budget()` + `record_usage()` so it respects the spend cap.
4. **Need new env config?** Add a `Field(..., min_length=1)` line to `Settings` in `config.py`. If optional, give it a default.

## How NOT to break production

- Don't add runtime HTTP calls in scheduler jobs without error handling (a flaky API takes down the whole cron).
- Don't call `.single()` — always `.maybe_single()` + guard on `data is None`.
- Don't use `subprocess.run()` in async code — wrap with `asyncio.to_thread(...)`.
- Don't relax CORS. Add origins to `CORS_ALLOWED_ORIGINS`, don't use `*`.
- Don't bypass the Kai spend cap. Every Anthropic call in user-facing code paths must go through `kai_budget.check_budget()` first.
- Don't scale Railway past 1 replica without moving the scheduler to a separate worker service.
- Don't write vault notes to filesystem. Use `_vault_put(path, content)` which writes to Supabase.

---

## Known limitations / future work

- **`/api/v1/*` HTTP routes are legacy.** They exist to serve the current frontend which uses tRPC→Railway→PostgREST. When the client is rewritten to use `@supabase/supabase-js` directly, those routes can be deleted and the backend shrinks to cron + `/health` + Stripe webhook + Kai chat only.
- **Stripe webhook lives in Python.** Should eventually move to a Supabase Edge Function (Deno) so Railway can be 100% cron-only.
- **Kai chat lives in Python.** Same — could be an Edge Function.
- **No CI/CD.** No GitHub Actions running lint/tests/typecheck on PR. Should be added.
- **No Sentry or error tracking.** Errors live in Railway logs only. Should add `sentry-sdk[fastapi]` + DSN env var.
- **Manus's `server/` tRPC layer is dead code.** Never deployed. Can be deleted when the client is rewritten.
