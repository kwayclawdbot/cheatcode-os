"""Gamification engine — XP, levels, badges."""

from app.core.supabase import get_supabase

XP_ACTIONS = {
    "video_view": 5,
    "video_complete": 15,
    "ticker_lookup": 2,
    "kai_message": 3,
    "post_create": 20,
    "post_like_received": 2,
    "comment_create": 10,
    "journal_entry": 25,
    "bookmark": 1,
    "follow": 2,
    "onboarding_complete": 100,
    "streak_day": 10,
    "first_trade_logged": 50,
}

BADGE_DEFS = {
    "verified_pl": {"label": "Verified P&L", "desc": "Brokerage connected", "check": lambda p: p.get("broker_connected")},
    "first_post": {"label": "First Post", "desc": "Published first post", "check": lambda p: p.get("post_count", 0) >= 1},
    "educator": {"label": "Educator", "desc": "10+ posts", "check": lambda p: p.get("post_count", 0) >= 10},
    "journal_starter": {"label": "Journal Starter", "desc": "5+ journal entries", "check": lambda p: p.get("total_trades", 0) >= 5},
    "consistent_trader": {"label": "Consistent", "desc": "30+ trades logged", "check": lambda p: p.get("total_trades", 0) >= 30},
    "community_pillar": {"label": "Community Pillar", "desc": "50+ followers", "check": lambda p: p.get("follower_count", 0) >= 50},
    "top_caller": {"label": "Top Caller", "desc": "Win rate above 60%", "check": lambda p: (p.get("win_rate") or 0) >= 60},
}


def award_xp(user_id: str, action: str, metadata: dict = None) -> int:
    """Award XP for an action. Returns XP earned."""
    xp = XP_ACTIONS.get(action, 0)
    if xp <= 0:
        return 0

    db = get_supabase()
    db.table("user_xp_log").insert({
        "user_id": user_id,
        "action": action,
        "xp_earned": xp,
        "metadata": metadata or {},
    }).execute()

    # Update total XP on profile
    profile = db.table("profiles").select("xp").eq("id", user_id).single().execute()
    new_xp = (profile.data.get("xp", 0) if profile.data else 0) + xp
    db.table("profiles").update({"xp": new_xp}).eq("id", user_id).execute()

    # Check for new badges
    check_badges(user_id)

    return xp


def check_badges(user_id: str):
    """Check and award any newly earned badges."""
    db = get_supabase()
    profile = db.table("profiles").select("*").eq("id", user_id).single().execute()
    if not profile.data:
        return

    existing = db.table("user_badges").select("badge_id").eq("user_id", user_id).execute()
    earned_ids = {b["badge_id"] for b in (existing.data or [])}

    for badge_id, badge_def in BADGE_DEFS.items():
        if badge_id not in earned_ids and badge_def["check"](profile.data):
            db.table("user_badges").insert({
                "user_id": user_id,
                "badge_id": badge_id,
            }).execute()
