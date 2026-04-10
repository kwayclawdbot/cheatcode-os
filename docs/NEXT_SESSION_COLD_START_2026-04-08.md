# Next Session Cold-Start Brief — CheatCode OS
_Generated 2026-04-08. Read this first, then start building._

## TL;DR
Two tasks queued, in order:
1. **On-demand Kai ticker analysis** (~15-line backend patch, 20 min) — quick win, unblocks every ticker page
2. **AI agent community seeding** (~2-3 hour focused build) — full spec in `~/.claude/projects/-Users-kwaysclawd/memory/project_ai_agent_seeding.md`

Do them in that order. The Kai analysis is trivial and the agents benefit from it working (so they can reference real Kai signals in their posts).

---

## Current state (as of 2026-04-08)

### Production
- **Frontend**: `https://cheatcode-os-app.vercel.app` — Vite/React/TS, deployed via `vercel --prod --yes --force --archive=tgz` from project root
- **Backend**: `https://cheatcode-os-api-production.up.railway.app` — FastAPI + APScheduler, deployed via **`cd backend && railway up --ci`** (MUST cd to `backend/` first — railway auto-detects the wrong stack from project root)
- **Supabase**: project `ryprohqthwflinadqotj`, accessed via `mcp__claude_ai_Supabase__*` tools

### Recent work that landed
- Curated trending universe hardcoded (100 stocks / 20 ETFs / 10 indices / 50 crypto / 10 forex / 10 futures) — see `backend/app/services/trending.py` `get_trending_universe_symbols()`
- Trending formula cold-start weights: 55% price, 30% volume, 15% social, 0% content
- Relevance threshold lowered 0.6 → 0.30, content bulk-republished (290/327 now visible)
- `content.asset_class` column + backfill; tagged at curation time
- `ticker_votes` table with RLS + endpoints (`GET`/`POST`/`DELETE /intelligence/ticker/{sym}/vote`)
- `ticker_sentiment.py` unified helper aggregating brain + content + feed + votes
- `company_profile.py` + `GET /intelligence/ticker/{sym}/about` — lazy EODHD fundamentals, persisted forever
- TickerPage: default tab = Signal (chart), About section ABOVE chart, score/key-level placeholders, wired to sentiment + votes + chart + about endpoints
- CheatCodeChart embedded on Signal tab
- Nav: Terminal → War Room, Journal → Connect, Kai Analysis promoted to top-level "Analyze", Courses hidden
- Follow buttons functional (real endpoints, optimistic UI, error rollback)
- @handles displayed instead of legal names in feed + cards + follow lists
- Asset-class toggle now filters content across Watch / YT University / Home
- Global `html,body { overflow-x: clip }` in `index.css` — kills horizontal page scroll
- VideoPage wrapped in `ErrorBoundary`, defensive null coercion in `setVideo`
- `ErrorBoundary` shows error.message + componentStack + JS stack (sourcemaps enabled)
- `getLoginUrl()` falls back to `/auth` instead of throwing when legacy Manus OAuth env vars missing

### Known open items (not bugs, just not-yet-done)
- **~40 tickers have convergence_score, 33K don't** — fix is TASK 1 below
- **Community feed is empty** — fix is TASK 2 (AI agent seeding, locked spec)
- **`daily_analysis` cron only runs for tickers with convergence_score ≥ 50** — will fill in as TASK 1 unblocks it
- **Bundle size warning** (~1.9 MB / 525 KB gzipped) — not a bug, just verbose. Code-split if it becomes a real problem.

---

## TASK 1 — On-demand Kai ticker analysis (do this first)

**Problem**: `/intelligence/ticker/{symbol}` returns a row but `convergence_score`, `direction`, `key_levels`, `daily_analysis`, `catalyst`, `risks` are all null/0 for most tickers. Only the ~40 tickers the brain has scored look complete. The TickerPage Signal tab renders em-dashes everywhere.

**Fix**: When the endpoint is hit and the ticker has no analysis for today, fire `analyze_ticker(sym)` inline (one Claude call), persist to the tickers row, return the enriched data. Analysis function **already exists** — it's `analyze_ticker()` in `backend/app/services/ticker_analysis.py:15`. It writes `daily_analysis`, `analysis_date`, `key_levels`, `catalysts`, `risks`, `catalyst` fields directly.

**Exact patch** in `backend/app/api/routes/intelligence.py`:

```python
# Near the top, add import:
from app.services.ticker_analysis import analyze_ticker

# In ticker_lookup(), after the `if not t.data` stub-fallback block, before
# `data = t.data`, add:

    # On-demand Kai analysis: if this ticker has never been analyzed (or
    # today's analysis is stale), fire one Claude call to generate it.
    # analyze_ticker() persists to the tickers row, so the next hit is free.
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    needs_analysis = (
        not t.data.get("daily_analysis")
        or t.data.get("analysis_date") != today
    )
    if needs_analysis:
        try:
            await analyze_ticker(sym)
            # Re-read the row so the response includes the new fields.
            t = maybe_one(db.table("tickers").select("*").eq("symbol", sym))
        except Exception as e:
            log.warning("on-demand analyze_ticker failed for %s: %s", sym, e)
```

**Guardrails**:
- **EODHD cost**: `analyze_ticker()` calls `fetch_bulk_quotes([symbol])` which is cached. Real cost is one Haiku-ish Claude call (~$0.002). For 100 unique ticker views/day → $0.20/day. Well under budget.
- **kai_budget check**: Wrap the analyze call so it respects the global circuit breaker. Or skip the check since admin-tier cost isn't user-attributable. User's call.
- **Concurrency**: If 100 people hit AAPL at the same time, we'll fire 100 Claude calls. Add a simple in-memory lock or `.eq("symbol", sym).in_(["pending"])` marker to dedupe. For launch-phase traffic it's fine as-is.

**Verification after deploy**:
```bash
curl 'https://cheatcode-os-api-production.up.railway.app/api/v1/intelligence/ticker/NVDA' | jq '.daily_analysis, .key_levels, .catalyst'
```
Should return populated values after first call. Second call should be instant.

**Then**: open `cheatcode-os-app.vercel.app/tickers/NVDA` → Signal tab → should show real score, direction, Kai's take, catalyst, key levels.

---

## TASK 2 — AI agent community seeding

**Full spec**: `~/.claude/projects/-Users-kwaysclawd/memory/project_ai_agent_seeding.md`

**Summary**: 15 persona agents, ~50 posts/day, community feed only, grounded in the curated trending universe, Haiku-powered, $0.05/day cost, capped by existing kai_budget.

**Build order** (also in the memory file):
1. Migration: `profiles.is_agent bool`, `ai_agents` config table, allow `agent` tier
2. Seed 15 profiles + configs with hand-written voice prompts
3. `backend/app/services/ai_agent_poster.py` — context builder + post generator + scheduler picker + reply generator
4. `backend/app/services/ai_agent_reactor.py` — event-driven big-mover hot takes + hourly reaction batcher
5. Wire APScheduler jobs into `main.py` lifespan (every 20min post cycle, hourly reactions, radar-regen hook)
6. Frontend: small "AI" badge component + `settings.hideAiAgents` toggle
7. Local dry-run: generate 5 sample posts, review voice quality, tune prompts
8. Enable in production

Estimate 2-3 focused hours.

---

## Deploy checklist (EVERY deploy this project)

1. **Backend changes**: `cd /Users/kwaysclawd/projects/cheatcode-os/backend && railway up --ci` — **MUST cd first**, otherwise Railway railpack detects the Vite frontend and deploys that instead (breaks everything with Caddy 404s on every route)
2. **Frontend changes**: `cd /Users/kwaysclawd/projects/cheatcode-os && vercel --prod --yes --force --archive=tgz`
3. **Supabase migrations**: use `mcp__claude_ai_Supabase__apply_migration` — NEVER write a migration runner
4. **Verify backend**: `curl https://cheatcode-os-api-production.up.railway.app/health` — should return `{"status":"ok",...}`
5. **Verify frontend**: `curl -s https://cheatcode-os-app.vercel.app/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js'` — bundle name should change after each deploy

## Gotchas to remember
- **`railway up` from wrong directory** = deploys the frontend to the backend service via railpack autodetection. ALWAYS `cd backend` first.
- **Vercel env vars bake at build time**. Missing `VITE_SUPABASE_*` → white screen. `VITE_OAUTH_PORTAL_URL` / `VITE_APP_ID` are LEGACY and NOT set — code falls back to `/auth` now.
- **Stripe is LIVE MODE**. Any Stripe code changes must be announced and explicit.
- **Supabase is shared** with breakout-alert-system, sales-bot, and discord agents. Don't touch tables outside the cheatcode-os scope (see the `project_cheatcode_os.md` memory for the full table inventory).
- **Don't amend commits** on Railway/Vercel. Create new commits. The deploy log is your audit trail.
- **Scheduler jobs run on a single Railway replica** (`numReplicas = 1` in `backend/railway.toml`) — required for APScheduler idempotency. Don't scale horizontally.

## Useful queries
```sql
-- How many tickers have been analyzed by Kai?
SELECT count(*) FROM tickers WHERE daily_analysis IS NOT NULL;

-- Feed health
SELECT count(*) FILTER (WHERE is_published) AS published, count(*) AS total FROM content;

-- Active creators
SELECT count(distinct creator_id) FROM content WHERE is_published;

-- Recent curation activity
SELECT curated_at, title, creators.name, relevance_score
FROM content JOIN creators ON creators.id = content.creator_id
ORDER BY curated_at DESC LIMIT 10;
```
