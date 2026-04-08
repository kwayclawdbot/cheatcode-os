# CheatCode OS — Full Handoff (2026-04-08)

This is a complete-state dump after a full-stack rebuild session. Next session can resume work with zero re-discovery.

## Live URLs
- **Frontend:** https://cheatcode-os-app.vercel.app (aliased to current latest deploy)
- **Backend:** https://cheatcode-os-api-production.up.railway.app
- **Supabase:** `ryprohqthwflinadqotj` — https://ryprohqthwflinadqotj.supabase.co

## Architecture — two services, not three

```
┌──────────────┐       ┌──────────────┐       ┌─────────────────┐
│ React client │──────►│  Supabase    │◄──────│  Mac (Obsidian) │
│ (Vite,Vercel)│ auth  │  Postgres    │ pull  │  vault_sync.py  │
│              │       │  RLS realtime│       │  LaunchAgent    │
└──────┬───────┘       └──────────────┘       └─────────────────┘
       │                       ▲
       │                       │ writes
       ▼                       │
┌──────────────┐               │
│ Railway/Python│──────────────┘
│ FastAPI cron │   jobs: curation, ingest, rescore,
│ single replica│   analysis, radar, trending_score,
│              │   bulk_eod (~50 EODHD calls/day)
└──────────────┘
```

**Dead code still in repo:** `server/` (Node tRPC) and `drizzle/` (MySQL ORM) — never deployed, no MySQL exists, the tRPC URL `cheatcode-os-trpc-production.up.railway.app` does not resolve. Manus built them but they were never connected. Plan: delete both when client tRPC calls are migrated to `/api/v1/*`.

## Deploy workflow

**Neither Vercel nor Railway auto-deploy from git push.** Every change is manual CLI:

```bash
# Backend
cd ~/projects/cheatcode-os/backend && railway up --ci

# Frontend
cd ~/projects/cheatcode-os && vercel --prod --yes --force --archive=tgz
```

Both CLIs are authenticated locally. Railway project: `cheatcode-os-api` (id `91725e9a-3803-4546-b5a2-4148ffdac9de`). Vercel project: `cheatcode-os-app` (id `prj_IfIawdDfDMqYLBiIqvFDTGqUrI0Y`).

**TODO:** connect GitHub auto-deploy in both dashboards.

## Required env vars

### Railway `cheatcode-os-api`
All set as of 2026-04-08 except where noted:
```
SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY
ANTHROPIC_API_KEY, OPENAI_API_KEY, YOUTUBE_API_KEY, EODHD_API_KEY, PERPLEXITY_API_KEY
STRIPE_SECRET_KEY (LIVE MODE), STRIPE_WEBHOOK_SECRET, STRIPE_PRO_PRICE_ID
CORS_ALLOWED_ORIGINS=https://cheatcode-os-app.vercel.app,http://localhost:3000,http://localhost:5173
PORT=8000
```
**Missing:** `STRIPE_ELITE_PRICE_ID` — Elite tier not created in Stripe yet. Backend returns 503 gracefully on elite checkout attempts.

### Vercel `cheatcode-os-app`
Set on 2026-04-08 (this was the root cause of the white-screen — see below):
```
VITE_SUPABASE_URL=https://ryprohqthwflinadqotj.supabase.co
VITE_SUPABASE_ANON_KEY=<218-char JWT from Supabase anon key>
```

## The white-screen bug (solved 2026-04-08)

Four sequential fixes were needed, committed separately in case any need to be backed out:

1. **`db42e40` — backend radar fallback**: `intelligence.py::generate_radar` was returning empty radar because it only looked for tickers with `convergence_score >= 40`, which didn't exist in the new 33K universe. Added rank-based fallback from the trending system (top 5 = critical, next 10 = high_conviction, next 15 = watch).

2. **`ef92935` — mid-cap filter**: The radar was surfacing penny stocks (EGRX +70% at $0.34). Added `market_cap_tier` column + filter to `mid/large/mega` for stocks/ETFs. Crypto/forex/index unfiltered.

3. **`c59a12f` — disable Manus Vite plugins in prod**: `vite.config.ts` unconditionally loaded `jsxLocPlugin()` + `vitePluginManusRuntime()` which inject sandbox-only runtime scripts. Manus's builds on his sandbox worked because they pre-rendered static HTML + defined sandbox globals. Vercel builds shipped the broken runtime. Added `isProd` guard.

4. **`a9886eb` — replace _core/useAuth tRPC with Supabase**: `client/src/_core/hooks/useAuth.ts` was calling `trpc.auth.me.useQuery()` → dead tRPC server → synchronous throw during first render → white screen. Replaced with a thin wrapper over `useSupabaseAuth`.

5. **`11eed36` + `56ebbfa` — defensive error handler in index.html**: Added inline `<script>` BEFORE module load that catches `window.error` and `unhandledrejection` and renders them as a visible red error box into `#root`. Also added a loading spinner fallback. This diagnostic caught the REAL bug.

6. **FINAL FIX (no commit, just Vercel env vars):** `client/src/lib/supabase.ts` creates the Supabase client at module load: `createClient(import.meta.env.VITE_SUPABASE_URL, ...)`. Vercel had NO `VITE_SUPABASE_*` env vars set. Vite baked `undefined` into the bundle. `createClient(undefined, undefined)` threw at module evaluation (before any React code could run). Set the env vars on Vercel, rebuilt, fixed.

**Lesson learned:** Manus's builds worked because Manus's sandbox had `VITE_SUPABASE_*` set AND `vitePluginManusRuntime` pre-rendered static HTML that masked hydration crashes. When we build outside that sandbox, env vars must be set before the build, and any hydration error becomes fully visible.

## Known remaining tRPC holes (not crashes, just empty data)

`grep -rln 'trpc\.' client/src/`:
- `App.tsx:71` — `trpc.watchlist.get.useQuery` → NewUserRedirect assumes empty watchlist
- `pages/Home.tsx` — `trpc.marketData.quotes/forexQuotes/cryptoQuotes/indicesQuotes.useQuery` → ticker rail sections empty
- `pages/TickerPage.tsx`, `VideoPage.tsx`, `TerminalPage.tsx`, `TraderProfilePage.tsx`, `AdminIngestPage.tsx`, `ComponentShowcase.tsx`
- `components/AIChatBox.tsx`
- `hooks/useVideoComments.ts`, `hooks/useChatChannel.ts`

**Fix pattern:** replace each with `useApi(fetchXxx)` from `client/src/lib/api.ts`. The `apiFetch` helper goes through the Vercel rewrite `/api/v1/:path*` → Railway backend. Most equivalent endpoints already exist on `/api/v1/*`:
- `trpc.marketData.quotes` → `/api/v1/market/quotes?symbols=...`
- `trpc.marketData.forexQuotes` → `/api/v1/market/quotes?symbols=EURUSD,GBPUSD,...`
- `trpc.marketData.cryptoQuotes` → `/api/v1/market/quotes?symbols=BTC,ETH,SOL,...`
- `trpc.marketData.indicesQuotes` → `/api/v1/market/quotes?symbols=SPY,QQQ,...`
- `trpc.watchlist.get` → add a new `/api/v1/watchlist` endpoint OR read from Supabase directly via `@supabase/supabase-js`

## Supabase schema (17 tables with RLS)

Key tables:
| Table | Rows | Purpose |
|---|---|---|
| `content` | 305+ | Curated videos, quick_take, embeddings, value_score, ingestion_status |
| `tickers` | 33,437 | Seeded from EODHD exchange-symbol-list. trending_score, market_cap_tier, asset_class |
| `profiles` | 2+ | Auto-created via `on_auth_user_created_profile` trigger on auth signup |
| `cheatcode_vault` | growing | Isolated from `vault_store`. CHECK constraint: path LIKE `06 - Knowledge Base/CheatCode OS/%` |
| `kai_usage` | growing | Per-user token counts + cost for spend cap enforcement |
| `scheduler_runs` | growing | Per-job telemetry with duration/status/error |
| `post_ticker_mentions` | 0 | Cashtag extraction rollup for trending social score |
| `vault_store` | 317 | Personal vault mirror used by ANOTHER process — do not write cheatcode-os data here |
| `radar_snapshots` | daily | Generated by generate_radar cron |
| `kb_chunks` | 2332+ | Transcript chunks with embeddings for Kai RAG |

Migrations 001–011 in `backend/migrations/*.sql` as audit trail. Applied via Supabase MCP `apply_migration`, never via a runner.

## Backend cron schedule (UTC)

```
06:00  curation       — YouTube → Claude → content table
06:30  radar_morning  — with trending fallback
07:15  daily_ingest   — → cheatcode_vault rows + kb_chunks
07:20  daily_rescore  — re-score last 14 days
07:30  daily_analysis — Kai ticker analysis
14:00  radar_midday
21:00  eod_daily      — 4 bulk calls (US, CC, FOREX, INDX)
every 15m  trending_score
every 60m  brain_cycle
every 60m  eod_hourly  — CC + FOREX bulk (24/7 markets)
```

Every job wrapped in `with_telemetry(fn, job_id)`. View via `GET /api/v1/admin/runs` (service role bearer).

## EODHD bulk approach

`fetch_bulk_eod(exchange)` makes TWO calls per exchange:
1. Latest close (no date param)
2. Yesterday's close (date param from today's response date, not wall-clock)

Yesterday cached 12h per exchange in `_prev_close_cache`. Extended-filter response includes `avgvol_14d/50d/200d` (→ `volume_avg_20d`), `ema_50d/200d`, `hi_250d/lo_250d`, `MarketCapitalization` (→ `market_cap` + `market_cap_tier`), but NOT `change_p` or `prev_close` — computed manually.

## Symbol normalization (must match client/src/components/shared/MiniSparkline.tsx)

```python
CRYPTO_SYMBOLS = {BTC,ETH,SOL,BNB,XRP,ADA,AVAX,DOGE,MATIC,DOT,LINK,UNI,AAVE,LTC,BCH,
                  ATOM,FIL,NEAR,APT,ARB,OP,SUI,SEI,TIA,INJ,PEPE,WIF,BONK,JUP,PYTH,
                  LDO,RPL,FXS,CRV,CVX,BAL,SUSHI,COMP,MKR,SNX,YFI,DYDX,GMX,SHIB,
                  FLOKI,ELON,HOGE,VOLT}

normalise_symbol("AAPL")      → ("AAPL.US",      "AAPL")
normalise_symbol("EURUSD")    → ("EURUSD.FOREX", "EURUSD")
normalise_symbol("BTC")       → ("BTC-USD.CC",   "BTC-USD")
normalise_symbol("BTC-USD")   → ("BTC-USD.CC",   "BTC-USD")
normalise_symbol("AAPL.US")   → ("AAPL.US",      "AAPL")   # idempotent
```

## Kai spend caps (backend/app/services/kai_budget.py)

```
Free:    5 messages/day (existing kai_messages_today counter)
Pro:     $15/month/user
Elite:   $60/month/user
Global:  $200/day circuit breaker
```

Every Anthropic call: `check_budget(user_id, tier)` before, `record_usage(...)` after. Pricing constant at top of module — update when Anthropic changes.

## Vault sync (Mac LaunchAgent)

- **Installed:** `~/Library/LaunchAgents/com.cheatcode.vault-sync.plist`
- **Script:** `~/projects/cheatcode-os/scripts/vault_sync.py --loop`
- **Env:** `~/projects/cheatcode-os/scripts/.env` (chmod 600, gitignored). Contains `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `VAULT_ROOT=$HOME/.openclaw/vault`, `VAULT_SYNC_INTERVAL=300`
- **Logs:** `~/Library/Logs/cheatcode-vault-sync.log`
- **Restart:** `launchctl unload ... && launchctl load ...`
- **Safe-path check:** rejects any row path that doesn't start with `06 - Knowledge Base/CheatCode OS/` (defense-in-depth on top of DB CHECK constraint)
- **One-way only:** Supabase → Mac. Never reads disk, never pushes.

## Commits shipped this session (2026-04-08)

Backend:
```
7d85dda  config validation + CORS lockdown + 1-replica pin
4cf61f0  .maybe_single() crash fixes + Stripe webhook hardening
851d202  Kai spend caps + kai_usage table
ddb7e7f  idempotent content upsert + async yt-dlp + admin Pydantic validation
60ab945  RLS on 8 tables + scheduler telemetry + hot-path indexes
9dab5ca  vault rewrite to Supabase rows + Mac LaunchAgent sync agent
cfdb86b  isolate cheatcode_vault from personal vault_store
c0bbc95  live forex/crypto quotes + gamification crash fix
9ab1974  single-quote endpoint display-key fix
acb51ba  preset 33K ticker universe + trending + cashtags
d8e42e7  switch to bulk EOD (~50 API calls/day vs ~2300)
db42e40  radar fallback to trending when intelligence sparse
ef92935  mid-cap+ filter for stocks/ETFs in trending+radar
e6bf99d  backend/ARCHITECTURE.md
```

Frontend:
```
696aa4a  revert my fetchRadar fallback (didn't fix white screen)
c59a12f  disable Manus sandbox Vite plugins in prod builds
a9886eb  replace _core/useAuth tRPC with Supabase
11eed36  main.tsx try/catch + window.error handlers
56ebbfa  inline script error handler in index.html + loading spinner
```

Plus the final env var set on Vercel (no commit) which was the actual fix.

## MCP access (available in Claude Code sessions)

- **Supabase:** `mcp__claude_ai_Supabase__apply_migration`, `execute_sql`, `list_tables`, `get_publishable_keys`, etc. Project id: `ryprohqthwflinadqotj`. Use this for schema changes — do NOT write a migration runner.
- **Railway CLI:** authenticated as kwayclawdbot@gmail.com. `railway variables --kv`, `railway up --ci`, `railway deployment list`
- **Vercel CLI:** authenticated. `vercel --prod --yes --force --archive=tgz`, `vercel env add/rm`, `vercel alias set`, `vercel ls`

## Next session priorities

1. **Migrate remaining client tRPC calls to `/api/v1/*` fetches.** Biggest target: Home.tsx marketData calls. Pattern: use `useApi(fetchQuotes)` with a new `fetchQuotes(symbols)` helper in `client/src/lib/api.ts`.
2. **Delete `server/` and `drizzle/` entirely** once client tRPC migration is done.
3. **Connect GitHub auto-deploy** for both Vercel and Railway.
4. **Add SEO tags + PWA manifest** per the audit from earlier in the session.
5. **Hook up Sentry** for both backend and frontend — currently flying blind on production errors.
6. **CI/CD** — no `.github/workflows/ci.yml` exists. Lint/test/typecheck on PR would have caught the white-screen bug before deploy.

## User feedback to remember

- **Keep it simple.** Don't over-engineer (no migration runners, no extra abstractions).
- **Bulk endpoints always.** ~50 API calls/day is the target, not thousands.
- **Mid-cap+ only for stocks.** User hates penny stock noise.
- **Don't touch frontend unless explicitly told.** Until 2026-04-08 when full-stack scope was handed over.
- **Vault is personal Obsidian on Mac**, not a SaaS feature. Pipeline is one-way cloud→local.
- **Stripe is LIVE MODE.** Any Stripe change must be explicit and announced.
- **Push straight after planning.** User doesn't want per-commit review, just ship and iterate.
