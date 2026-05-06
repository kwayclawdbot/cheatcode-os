"""CheatCode OS — Backend API"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.core.config import get_settings
from app.core.supabase import get_supabase
from app.core.telemetry import with_telemetry
from app.api.routes import home, content, intelligence, kai, payments, admin, events, social, journal, profile, market, coach, chart, auth_magic
from app.services.curation import run_curation_cycle, rescore_recent_content
from app.services.intelligence import run_brain_cycle, generate_radar
from app.services.market_data import sync_eod_prices, sync_eod_prices_24_7
from app.services.ticker_analysis import run_daily_analysis
from app.services.ingestion import ingest_all_pending
from app.services.trending import compute_trending_scores
# AI agent post + hot-take generation runs on a LOCAL worker (LaunchAgent)
# because it shells out to `claude -p` — Railway has no Claude Code binary.
# Only the DB-only reaction batcher stays on Railway.
from app.services.ai_agent_reactor import batch_add_reactions_async

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background jobs — every job is wrapped in with_telemetry so each
    # run lands in the scheduler_runs table with start/end/status/duration.
    # Admin endpoint GET /api/v1/admin/runs surfaces recent executions.
    # ── PRE-LAUNCH SCHEDULE: all jobs run ONCE DAILY to conserve API credits.
    # When ready for live users, restore brain/trending to hourly/15-min and
    # re-enable eod_hourly + radar_midday. See git history for original cadence.
    scheduler.add_job(with_telemetry(run_curation_cycle, "curation"),           "cron", hour=6, minute=0,  id="curation")
    scheduler.add_job(with_telemetry(run_brain_cycle, "brain"),                 "cron", hour=6, minute=15, id="brain")           # was: every 60 min
    scheduler.add_job(with_telemetry(generate_radar, "radar_morning"),          "cron", hour=6, minute=30, id="radar_morning")
    # radar_midday disabled pre-launch (Claude cost). Re-enable: "cron", hour=14, minute=0
    scheduler.add_job(with_telemetry(sync_eod_prices,      "eod_daily"),       "cron", hour=21, minute=0, id="eod_daily")
    # eod_hourly disabled pre-launch (EODHD API calls). Re-enable: "interval", minutes=60
    scheduler.add_job(with_telemetry(ingest_all_pending, "daily_ingest"),       "cron", hour=7, minute=15, id="daily_ingest")
    scheduler.add_job(with_telemetry(rescore_recent_content, "daily_rescore"),  "cron", hour=7, minute=20, id="daily_rescore")
    scheduler.add_job(with_telemetry(run_daily_analysis, "daily_analysis"),     "cron", hour=7, minute=30, id="daily_analysis")
    scheduler.add_job(with_telemetry(compute_trending_scores, "trending_score"),"cron", hour=7, minute=45, id="trending_score")  # was: every 15 min

    # AI persona agents seed the community feed. Generation (text via
    # `claude -p`) lives on a LOCAL worker — see scripts/run_agent_poster.py
    # and com.openclaw.community-seeder.plist. The only agent job that runs
    # here on Railway is the DB-only reactions batch (zero Anthropic cost).
    scheduler.add_job(
        with_telemetry(batch_add_reactions_async, "agent_reactions"),
        "interval", minutes=60, id="agent_reactions",
    )
    scheduler.start()
    yield
    scheduler.shutdown()


s = get_settings()  # loaded once; validates required env vars on startup

app = FastAPI(
    title="CheatCode OS",
    description="Curated finance media platform with AI intelligence layer",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — locked to allow-listed origins only. FRONTEND_URL is always included
# so Stripe redirects and the Vercel frontend work without extra config.
_cors_origins = list({
    o.strip() for o in s.cors_allowed_origins.split(",") if o.strip()
} | {s.frontend_url})
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    max_age=600,
)

# Routes
app.include_router(home.router, prefix=s.api_prefix)
app.include_router(content.router, prefix=s.api_prefix)
app.include_router(intelligence.router, prefix=s.api_prefix)
app.include_router(kai.router, prefix=s.api_prefix)
app.include_router(payments.router, prefix=s.api_prefix)
app.include_router(admin.router, prefix=s.api_prefix)
app.include_router(events.router, prefix=s.api_prefix)
app.include_router(social.router, prefix=s.api_prefix)
app.include_router(journal.router, prefix=s.api_prefix)
app.include_router(profile.router, prefix=s.api_prefix)
app.include_router(market.router, prefix=s.api_prefix)
app.include_router(coach.router, prefix=s.api_prefix)
app.include_router(chart.router, prefix=s.api_prefix)
app.include_router(auth_magic.router, prefix=s.api_prefix)


@app.get("/health")
async def health():
    """Liveness + DB reachability check.

    Returns 200 only if we can reach the Supabase Postgres via PostgREST.
    Railway uses this for its restart policy — a dead DB gets the container
    restarted instead of serving broken requests.
    """
    db = get_supabase()
    try:
        # Trivial existence query — doesn't depend on any specific table shape.
        db.table("profiles").select("id").limit(1).execute()
    except Exception as e:
        return (
            {"status": "degraded", "service": "cheatcode-os", "db": "unreachable", "error": str(e)[:200]},
            503,
        )
    return {"status": "ok", "service": "cheatcode-os", "db": "reachable"}


@app.get(f"{s.api_prefix}/status")
async def api_status():
    """System status including scheduler jobs."""
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "next_run": str(job.next_run_time) if job.next_run_time else None,
        })
    return {"status": "ok", "scheduler_jobs": jobs}
