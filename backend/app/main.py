"""CheatCode OS — Backend API"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.core.config import get_settings
from app.api.routes import home, content, intelligence, kai, payments, admin, events, social, journal, profile, market
from app.services.curation import run_curation_cycle
from app.services.intelligence import run_brain_cycle, generate_radar
from app.services.market_data import sync_ticker_prices

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background jobs
    scheduler.add_job(run_curation_cycle, "interval", minutes=30, id="curation")
    scheduler.add_job(run_brain_cycle, "interval", minutes=60, id="brain")
    scheduler.add_job(generate_radar, "cron", hour=6, minute=0, id="radar_morning")  # 6am UTC
    scheduler.add_job(generate_radar, "cron", hour=14, minute=0, id="radar_midday")  # 2pm UTC
    scheduler.add_job(sync_ticker_prices, "interval", minutes=5, id="price_sync")  # Live prices every 5 min
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(
    title="CheatCode OS",
    description="Curated finance media platform with AI intelligence layer",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Lock down in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
s = get_settings()
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
