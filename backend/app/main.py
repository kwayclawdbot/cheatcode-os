"""CheatCode OS — Backend API"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.core.config import get_settings
from app.core.supabase import get_supabase
from app.core.telemetry import with_telemetry
from app.api.routes import home, content, intelligence, kai, payments, admin, events, social, journal, profile, market, coach, chart
from app.services.curation import run_curation_cycle, rescore_recent_content
from app.services.intelligence import run_brain_cycle, generate_radar
from app.services.market_data import sync_ticker_prices
from app.services.ticker_analysis import run_daily_analysis
from app.services.ingestion import ingest_all_pending

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background jobs — every job is wrapped in with_telemetry so each
    # run lands in the scheduler_runs table with start/end/status/duration.
    # Admin endpoint GET /api/v1/admin/runs surfaces recent executions.
    scheduler.add_job(with_telemetry(run_curation_cycle, "curation"),       "cron", hour=6, minute=0,  id="curation")
    scheduler.add_job(with_telemetry(run_brain_cycle, "brain"),             "interval", minutes=60,    id="brain")
    scheduler.add_job(with_telemetry(generate_radar, "radar_morning"),      "cron", hour=6, minute=30, id="radar_morning")
    scheduler.add_job(with_telemetry(generate_radar, "radar_midday"),       "cron", hour=14, minute=0, id="radar_midday")
    scheduler.add_job(with_telemetry(sync_ticker_prices, "price_sync"),     "interval", minutes=60,    id="price_sync")
    scheduler.add_job(with_telemetry(ingest_all_pending, "daily_ingest"),   "cron", hour=7, minute=15, id="daily_ingest")
    scheduler.add_job(with_telemetry(rescore_recent_content, "daily_rescore"), "cron", hour=7, minute=20, id="daily_rescore")
    scheduler.add_job(with_telemetry(run_daily_analysis, "daily_analysis"), "cron", hour=7, minute=30, id="daily_analysis")
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

# CORS — locked to allow-listed origins only (set via CORS_ALLOWED_ORIGINS env var,
# comma-separated). Wide-open "*" is a CSRF vector for authenticated users.
_cors_origins = [o.strip() for o in s.cors_allowed_origins.split(",") if o.strip()]
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
