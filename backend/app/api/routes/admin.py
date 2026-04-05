"""Admin API — curation management, brain triggers, creator management."""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from app.core.supabase import get_supabase
from app.core.auth import require_user
from app.core.config import get_settings
from app.services.curation import run_curation_cycle, process_video, fetch_channel_uploads
from app.services.intelligence import run_brain_cycle, generate_radar
from app.services.newsletter import generate_daily_newsletter
from app.services.ingestion import ingest_all_pending, ingest_content
from app.services.repurposing import repurpose_content, repurpose_all_pending, extract_clips, render_clip, post_clip
from app.services.live_clipper import clip_content, find_clip_segments, render_live_clip
from app.services.ticker_analysis import run_daily_analysis, analyze_ticker
from app.services.discovery import seed_creators, discover_channels, add_creator

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


@router.post("/ingest/run")
async def trigger_ingestion(user: dict = Depends(_require_admin)):
    """Ingest all pending curated content into vault + KB."""
    results = await ingest_all_pending()
    return {"ingested": len(results), "details": results}


@router.post("/ingest/{content_id}")
async def trigger_single_ingest(content_id: str, user: dict = Depends(_require_admin)):
    """Ingest a single content item."""
    result = await ingest_content(content_id)
    return result or {"error": "Not found or already ingested"}


# ── Repurposing ──────────────────────────────────────────────────────────────

@router.post("/repurpose/run")
async def trigger_repurpose_all(auto_render: bool = False, user: dict = Depends(_require_admin)):
    """Extract clips from all un-clipped content."""
    result = await repurpose_all_pending(auto_render=auto_render)
    return result


@router.post("/repurpose/{content_id}")
async def trigger_repurpose(content_id: str, auto_render: bool = False, user: dict = Depends(_require_admin)):
    """Repurpose a single content item into clips."""
    result = await repurpose_content(content_id, auto_render=auto_render)
    return result


@router.post("/repurpose/clip/{clip_id}/render")
async def trigger_render(clip_id: str, user: dict = Depends(_require_admin)):
    """Render a specific clip."""
    path = await render_clip(clip_id)
    return {"render_path": path} if path else {"error": "Render failed"}


@router.post("/repurpose/clip/{clip_id}/post")
async def trigger_post(clip_id: str, platforms: str = "instagram,tiktok,youtube,twitter", user: dict = Depends(_require_admin)):
    """Post a rendered clip to social platforms."""
    result = await post_clip(clip_id, platforms.split(","))
    return result


@router.get("/repurpose/clips")
async def list_clips(status: str = None, user: dict = Depends(_require_admin)):
    """List all repurposed clips."""
    db = get_supabase()
    q = db.table("repurposed_clips").select("*, content(title, creator_id)").order("created_at", desc=True)
    if status:
        q = q.eq("status", status)
    result = q.limit(100).execute()
    return result.data or []


# ── Live Clips (cut from YouTube) ────────────────────────────���───────────────

@router.post("/liveclip/{content_id}")
async def trigger_live_clip(content_id: str, auto_render: bool = True, user: dict = Depends(_require_admin)):
    """Find best segments and clip directly from YouTube video."""
    result = await clip_content(content_id, auto_render=auto_render)
    return result


@router.post("/liveclip/render/{clip_id}")
async def trigger_live_render(clip_id: str, user: dict = Depends(_require_admin)):
    """Render a specific live clip."""
    path = await render_live_clip(clip_id)
    return {"render_path": path} if path else {"error": "Render failed"}


# ── Ticker Analysis ──────────────────────────────────────────────────────────

@router.post("/analysis/run")
async def trigger_daily_analysis(user: dict = Depends(_require_admin)):
    """Run daily analysis for all tracked tickers."""
    results = await run_daily_analysis()
    return {"analyzed": len(results), "results": results}


@router.post("/analysis/{symbol}")
async def trigger_single_analysis(symbol: str, user: dict = Depends(_require_admin)):
    """Generate analysis for a single ticker."""
    result = await analyze_ticker(symbol.upper())
    return result or {"error": "Analysis failed"}


@router.post("/newsletter/generate")
async def trigger_newsletter(user: dict = Depends(_require_admin)):
    """Manually generate daily newsletter."""
    result = await generate_daily_newsletter()
    return result


# ── Creator Discovery ────────────────────────────────────────────────────────

@router.post("/discovery/seed")
async def trigger_seed(user: dict = Depends(_require_admin)):
    """Seed all channels from the curated list."""
    results = await seed_creators()
    return {"added": len(results), "creators": [r["name"] for r in results]}


@router.post("/discovery/search")
async def trigger_discover(query: str = "trading education", max_results: int = 10, user: dict = Depends(_require_admin)):
    """Search YouTube for new finance channels."""
    results = await discover_channels(query, max_results)
    return {"discovered": len(results), "creators": [r["name"] for r in results]}


@router.post("/discovery/add")
async def add_single_creator(name: str = "", handle: str = "", tags: str = "trading,finance", user: dict = Depends(_require_admin)):
    """Add a single creator by YouTube handle."""
    result = await add_creator(name or handle, handle, tags.split(","))
    return result or {"error": "Failed to add creator"}


# ── Creator Management ──────────────────────────────────────────────────────

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


# ── Member Management ───────────────────────────────────────────────────────


@router.get("/members")
async def list_members(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    tier: str | None = None,
    user: dict = Depends(_require_admin),
):
    """List all user profiles with pagination."""
    db = get_supabase()
    offset = (page - 1) * per_page

    # Get total count
    count_q = db.table("profiles").select("id", count="exact")
    if tier:
        count_q = count_q.eq("tier", tier)
    total = count_q.execute().count or 0

    # Get page of results
    q = db.table("profiles").select("*").order("created_at", desc=True).range(offset, offset + per_page - 1)
    if tier:
        q = q.eq("tier", tier)
    result = q.execute()

    return {
        "members": result.data or [],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


class TierUpdate(BaseModel):
    tier: str


@router.put("/members/{user_id}/tier")
async def update_member_tier(user_id: str, body: TierUpdate, user: dict = Depends(_require_admin)):
    """Update a user's subscription tier."""
    valid_tiers = ("free", "pro", "elite", "admin")
    if body.tier not in valid_tiers:
        raise HTTPException(400, f"Invalid tier. Must be one of: {', '.join(valid_tiers)}")

    db = get_supabase()
    result = db.table("profiles").update({"tier": body.tier}).eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(404, "User not found")
    return result.data[0]


# ── Activity Feed ───────────────────────────────────────────────────────────


@router.get("/activity")
async def get_activity(limit: int = Query(100, ge=1, le=500), user: dict = Depends(_require_admin)):
    """Recent user events (signups, upgrades, logins, etc.)."""
    db = get_supabase()
    result = (
        db.table("events")
        .select("*, profiles(display_name, email:id)")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


# ── Revenue Summary ─────────────────────────────────────────────────────────


@router.get("/revenue")
async def get_revenue(user: dict = Depends(_require_admin)):
    """Stripe revenue summary — subscriber counts by tier."""
    db = get_supabase()
    s = get_settings()

    # Count subscribers by tier
    free_count = db.table("profiles").select("id", count="exact").eq("tier", "free").execute()
    pro_count = db.table("profiles").select("id", count="exact").eq("tier", "pro").execute()
    elite_count = db.table("profiles").select("id", count="exact").eq("tier", "elite").execute()

    tiers = {
        "free": {"count": free_count.count or 0, "mrr": 0},
        "pro": {"count": pro_count.count or 0},
        "elite": {"count": elite_count.count or 0},
    }

    # Try fetching Stripe data if key is available
    stripe_key = getattr(s, "stripe_secret_key", None)
    if stripe_key:
        try:
            import stripe
            stripe.api_key = stripe_key

            # Fetch active subscriptions
            subs = stripe.Subscription.list(status="active", limit=100)
            total_mrr = 0
            for sub in subs.auto_paging_iter():
                for item in sub["items"]["data"]:
                    amount = item["price"]["unit_amount"] or 0
                    interval = item["price"].get("recurring", {}).get("interval", "month")
                    if interval == "year":
                        total_mrr += amount / 12
                    else:
                        total_mrr += amount
            tiers["stripe_mrr"] = round(total_mrr / 100, 2)  # cents to dollars
        except Exception:
            tiers["stripe_mrr"] = None
            tiers["stripe_error"] = "Could not fetch Stripe data"
    else:
        tiers["stripe_mrr"] = None

    return tiers
