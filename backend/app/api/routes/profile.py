"""Profile API — onboarding, profile management, trader profiles."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.supabase import get_supabase, maybe_one
from app.core.auth import require_user, get_current_user
from app.services.gamification import award_xp, check_badges

router = APIRouter(prefix="/profile", tags=["profile"])


# ── Onboarding ───────────────────────────────────────────────────────────────

class OnboardingData(BaseModel):
    assets: list[str] = []
    style: str | None = None
    experience: str | None = None
    watchlist: list[str] = []
    following_creators: list[str] = []
    handle: str | None = None


@router.post("/onboarding")
async def complete_onboarding(data: OnboardingData, user: dict = Depends(require_user)):
    db = get_supabase()

    updates = {
        "assets_traded": data.assets,
        "trading_style": data.style,
        "experience_level": data.experience,
        "watchlist": data.watchlist,
        "following_creators": data.following_creators,
        "onboarding_complete": True,
    }
    if data.handle:
        updates["handle"] = data.handle

    db.table("profiles").update(updates).eq("id", user["id"]).execute()
    award_xp(user["id"], "onboarding_complete")

    return {"ok": True}


# ── Profile CRUD ─────────────────────────────────────────────────────────────

@router.get("/me")
async def get_my_profile(user: dict = Depends(require_user)):
    db = get_supabase()
    profile = db.table("profiles").select("*").eq("id", user["id"]).single().execute()
    if not profile.data:
        raise HTTPException(404, "Profile not found")

    # Get badges
    badges = db.table("user_badges").select("badge_id, earned_at").eq("user_id", user["id"]).execute()

    # Get XP history (last 10)
    xp_log = db.table("user_xp_log").select("action, xp_earned, created_at").eq(
        "user_id", user["id"]
    ).order("created_at", desc=True).limit(10).execute()

    return {
        **profile.data,
        "badges": badges.data or [],
        "recent_xp": xp_log.data or [],
    }


@router.put("/me")
async def update_my_profile(updates: dict, user: dict = Depends(require_user)):
    db = get_supabase()
    # Whitelist allowed fields
    allowed = {
        "display_name", "avatar_url", "handle", "bio", "trading_style",
        "experience_level", "assets_traded", "watchlist", "following_creators", "preferences",
    }
    safe_updates = {k: v for k, v in updates.items() if k in allowed}
    if not safe_updates:
        return {"ok": False, "error": "No valid fields"}

    db.table("profiles").update(safe_updates).eq("id", user["id"]).execute()
    return {"ok": True}


# ── Public Trader Profiles ───────────────────────────────────────────────────

@router.get("/traders/{handle}")
async def get_trader_profile(handle: str, user: dict | None = Depends(get_current_user)):
    db = get_supabase()
    profile = maybe_one(db.table("profiles").select("*").eq("handle", handle))
    if not profile.data:
        raise HTTPException(404, "Trader not found")

    p = profile.data
    trader_id = p["id"]

    # Get badges
    badges = db.table("user_badges").select("badge_id, earned_at").eq("user_id", trader_id).execute()

    # Get recent posts
    posts = db.table("feed_posts").select("id, post_type, ticker, sentiment, body, likes_count, created_at").eq(
        "user_id", trader_id
    ).order("created_at", desc=True).limit(10).execute()

    # Check if current user follows
    is_following = False
    if user:
        follow = maybe_one(db.table("follows").select("id").eq("follower_id", user["id"]).eq("following_id", trader_id))
        is_following = bool(follow.data)

    return {
        "id": trader_id,
        "display_name": p.get("display_name"),
        "handle": p.get("handle"),
        "avatar_url": p.get("avatar_url"),
        "bio": p.get("bio"),
        "trading_style": p.get("trading_style"),
        "experience_level": p.get("experience_level"),
        "assets_traded": p.get("assets_traded", []),
        "xp": p.get("xp", 0),
        "follower_count": p.get("follower_count", 0),
        "following_count": p.get("following_count", 0),
        "post_count": p.get("post_count", 0),
        "total_trades": p.get("total_trades", 0),
        "win_rate": p.get("win_rate"),
        "tier": p.get("tier", "free"),
        "badges": badges.data or [],
        "recent_posts": posts.data or [],
        "is_following": is_following,
    }


# ── Leaderboard ──────────────────────────────────────────────────────────────

@router.get("/leaderboard")
async def get_leaderboard(
    sort: str = "xp",  # xp, win_rate, followers
    limit: int = 20,
):
    db = get_supabase()
    q = db.table("profiles").select(
        "id, display_name, handle, avatar_url, xp, win_rate, total_trades, "
        "follower_count, post_count, trading_style"
    )

    if sort == "win_rate":
        q = q.gte("total_trades", 10).order("win_rate", desc=True)
    elif sort == "followers":
        q = q.order("follower_count", desc=True)
    else:
        q = q.order("xp", desc=True)

    result = q.limit(limit).execute()
    return result.data or []
