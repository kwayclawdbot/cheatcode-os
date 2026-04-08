"""CheatCode OS — Backend API"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.core.config import get_settings
from app.api.routes import home, content, intelligence, kai, payments, admin, events, social, journal, profile, market, coach, chart
from app.services.curation import run_curation_cycle, rescore_recent_content
from app.services.intelligence import run_brain_cycle, generate_radar
from app.services.market_data import sync_ticker_prices
from app.services.ticker_analysis import run_daily_analysis
from app.services.ingestion import ingest_all_pending

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background jobs
    scheduler.add_job(run_curation_cycle, "cron", hour=6, minute=0, id="curation")  # Once daily at 6am UTC
    scheduler.add_job(run_brain_cycle, "interval", minutes=60, id="brain")
    scheduler.add_job(generate_radar, "cron", hour=6, minute=30, id="radar_morning")  # After curation
    scheduler.add_job(generate_radar, "cron", hour=14, minute=0, id="radar_midday")
    scheduler.add_job(sync_ticker_prices, "interval", minutes=60, id="price_sync")  # Hourly EODHD
    scheduler.add_job(ingest_all_pending, "cron", hour=7, minute=15, id="daily_ingest")  # After curation + radar, before analysis
    scheduler.add_job(rescore_recent_content, "cron", hour=7, minute=20, id="daily_rescore")  # Rescore last 14 days against today's intel
    scheduler.add_job(run_daily_analysis, "cron", hour=7, minute=30, id="daily_analysis")
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
    return {"status": "ok", "service": "cheatcode-os"}


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
