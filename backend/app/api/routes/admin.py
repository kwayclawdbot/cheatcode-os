"""Admin API — curation management, brain triggers, creator management."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.supabase import get_supabase
from app.core.auth import require_user
from app.services.curation import run_curation_cycle, process_video, fetch_channel_uploads
from app.services.intelligence import run_brain_cycle, generate_radar
from app.services.newsletter import generate_daily_newsletter

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(user: dict = Depends(require_user)) -> dict:
    if user.get("tier") != "admin":
        raise HTTPException(403, "Admin access required")
    return user


# ── Pipeline Triggers ────────────────────────────────────────────────────────

@router.post("/curation/run")
async def trigger_curation(user: dict = Depends(_require_admin)):
    """Manually trigger a curation cycle."""
    count = await run_curation_cycle()
    return {"processed": count}


@router.post("/brain/run")
async def trigger_brain(user: dict = Depends(_require_admin)):
    """Manually trigger a brain cycle."""
    result = await run_brain_cycle()
    return result


@router.post("/radar/generate")
async def trigger_radar(user: dict = Depends(_require_admin)):
    """Manually generate radar snapshot."""
    result = await generate_radar()
    return result


@router.post("/newsletter/generate")
async def trigger_newsletter(user: dict = Depends(_require_admin)):
    """Manually generate daily newsletter."""
    result = await generate_daily_newsletter()
    return result


# ── Creator Management ──────��────────────────────────────────────────────────

class CreatorCreate(BaseModel):
    name: str
    slug: str
    platform: str = "youtube"
    youtube_channel_id: str | None = None
    rss_feed_url: str | None = None
    description: str | None = None
    quality_score: float = 0.7
    tags: list[str] = []


@router.post("/creators")
async def add_creator(creator: CreatorCreate, user: dict = Depends(_require_admin)):
    db = get_supabase()
    result = db.table("creators").insert(creator.model_dump()).execute()
    return result.data[0] if result.data else {}


@router.put("/creators/{creator_id}")
async def update_creator(creator_id: str, updates: dict, user: dict = Depends(_require_admin)):
    db = get_supabase()
    result = db.table("creators").update(updates).eq("id", creator_id).execute()
    return result.data[0] if result.data else {}


@router.delete("/creators/{creator_id}")
async def remove_creator(creator_id: str, user: dict = Depends(_require_admin)):
    db = get_supabase()
    db.table("creators").update({"is_active": False}).eq("id", creator_id).execute()
    return {"ok": True}


# ── Curation Queue ──────────���────────────────────────────────────────────────

@router.get("/queue")
async def list_queue(status: str = "pending", user: dict = Depends(_require_admin)):
    db = get_supabase()
    result = db.table("curation_queue").select("*").eq("status", status).order("created_at", desc=True).limit(50).execute()
    return result.data or []


@router.post("/queue/{item_id}/approve")
async def approve_queue_item(item_id: str, user: dict = Depends(_require_admin)):
    db = get_supabase()
    db.table("curation_queue").update({"status": "approved"}).eq("id", item_id).execute()
    return {"ok": True}


@router.post("/queue/{item_id}/reject")
async def reject_queue_item(item_id: str, user: dict = Depends(_require_admin)):
    db = get_supabase()
    db.table("curation_queue").update({"status": "rejected"}).eq("id", item_id).execute()
    return {"ok": True}


# ── Theme Management ─────────────────────────────────────────────────────────

class ThemeCreate(BaseModel):
    name: str
    slug: str
    description: str | None = None
    status: str = "active"
    tickers: list[str] = []


@router.post("/themes")
async def add_theme(theme: ThemeCreate, user: dict = Depends(_require_admin)):
    db = get_supabase()
    result = db.table("themes").insert(theme.model_dump()).execute()
    return result.data[0] if result.data else {}


@router.put("/themes/{theme_id}")
async def update_theme(theme_id: str, updates: dict, user: dict = Depends(_require_admin)):
    db = get_supabase()
    result = db.table("themes").update(updates).eq("id", theme_id).execute()
    return result.data[0] if result.data else {}


# ── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(user: dict = Depends(_require_admin)):
    db = get_supabase()

    content_count = db.table("content").select("id", count="exact").eq("is_published", True).execute()
    creator_count = db.table("creators").select("id", count="exact").eq("is_active", True).execute()
    user_count = db.table("profiles").select("id", count="exact").execute()
    pro_count = db.table("profiles").select("id", count="exact").eq("tier", "pro").execute()
    elite_count = db.table("profiles").select("id", count="exact").eq("tier", "elite").execute()
    ticker_count = db.table("tickers").select("symbol", count="exact").gte("convergence_score", 60).execute()
    prediction_count = db.table("predictions").select("id", count="exact").eq("status", "active").execute()

    return {
        "content": content_count.count or 0,
        "creators": creator_count.count or 0,
        "users": user_count.count or 0,
        "pro_subscribers": pro_count.count or 0,
        "elite_subscribers": elite_count.count or 0,
        "tracked_tickers": ticker_count.count or 0,
        "active_predictions": prediction_count.count or 0,
    }
