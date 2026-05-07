"""Gamification engine — XP, belts, badges."""

import logging
from datetime import datetime, timezone

from app.core.supabase import get_supabase, maybe_one

log = logging.getLogger("gamification")

XP_ACTIONS = {
    # Learning (passive)
    "video_view": 5,
    "video_complete": 10,
    "quiz_pass_first_try": 75,
    "track_complete": 500,
    "ticker_lookup": 2,
    "kai_message": 3,
    "bookmark": 1,

    # Community (social)
    "post_create": 15,
    "comment_create": 8,
    "post_like_received": 3,
    "follow": 2,

    # Trading (performance — primary XP path)
    "alert_posted": 25,
    "alert_win": 100,        # base, scaled by R in tracker
    "alert_win_r2": 200,
    "alert_win_r3plus": 400,
    "alert_loss": 15,        # correct stop-out behavior rewarded
    "beat_kai_weekly": 500,

    # Onboarding
    "onboarding_complete": 100,
    "journal_entry": 25,
    "first_trade_logged": 50,
    "streak_day": 10,
}

BELT_ORDER = ['white', 'yellow', 'orange', 'green', 'blue', 'purple', 'brown', 'black']

BELT_THRESHOLDS = {
    'yellow':  {'min_alerts': 5,   'min_xp': 500,   'min_wr': 0},
    'orange':  {'min_alerts': 20,  'min_xp': 1500,  'min_wr': 50.0},
    'green':   {'min_alerts': 50,  'min_xp': 4000,  'min_wr': 55.0},
    'blue':    {'min_alerts': 100, 'min_xp': 10000, 'min_wr': 60.0},
    'purple':  {'min_alerts': 200, 'min_xp': 25000, 'min_wr': 63.0},
    'brown':   {'min_alerts': 350, 'min_xp': 50000, 'min_wr': 65.0},
    'black':   {'min_alerts': 500, 'min_xp': 100000,'min_wr': 68.0},
}

BADGE_DEFS = {
    "verified_pl": {"label": "Broker Verified", "desc": "Brokerage connected", "check": lambda p: p.get("broker_connected")},
    "first_post": {"label": "First Post", "desc": "Published first post", "check": lambda p: p.get("post_count", 0) >= 1},
    "first_alert": {"label": "First Alert", "desc": "Posted first trade alert", "check": lambda p: p.get("alert_count", 0) >= 1},
    "educator": {"label": "Educator", "desc": "10+ posts", "check": lambda p: p.get("post_count", 0) >= 10},
    "consistent_trader": {"label": "Consistent", "desc": "30+ tracked alerts", "check": lambda p: p.get("alert_count", 0) >= 30},
    "community_pillar": {"label": "Community Pillar", "desc": "50+ followers", "check": lambda p: p.get("follower_count", 0) >= 50},
    "top_caller": {"label": "Top Caller", "desc": "Win rate above 60%", "check": lambda p: (p.get("alert_win_rate") or 0) >= 60},
    "beat_kai": {"label": "Beat Kai", "desc": "Outperformed Kai in a week", "check": lambda p: p.get("xp", 0) >= 1000},
}


def check_and_advance_belt(user_id: str) -> str | None:
    """Check if user qualifies for belt advancement. Returns new belt name or None."""
    db = get_supabase()
    try:
        profile = maybe_one(db.table("profiles").select(
            "belt,xp,alert_count,alert_win_rate"
        ).eq("id", user_id))
        if not profile.data:
            return None

        p = profile.data
        current_belt = p.get("belt") or "white"
        xp = p.get("xp") or 0
        alert_count = p.get("alert_count") or 0
        win_rate = float(p.get("alert_win_rate") or 0)

        current_idx = BELT_ORDER.index(current_belt) if current_belt in BELT_ORDER else 0
        new_belt = current_belt

        for belt in BELT_ORDER[current_idx + 1:]:
            thresh = BELT_THRESHOLDS.get(belt)
            if not thresh:
                break
            if (alert_count >= thresh['min_alerts'] and
                    xp >= thresh['min_xp'] and
                    win_rate >= thresh['min_wr']):
                new_belt = belt
            else:
                break

        if new_belt != current_belt:
            db.table("profiles").update({
                "belt": new_belt,
                "belt_updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", user_id).execute()
            log.info("Belt advancement: %s → %s for user %s", current_belt, new_belt, user_id)
            return new_belt
    except Exception as e:
        log.error("Belt check failed for %s: %s", user_id, e)
    return None



def award_xp(user_id: str, action: str, metadata: dict | None = None) -> int:
    """Award XP for an action. Returns XP earned.

    Never crashes the calling handler even if the profile is missing or
    DB writes fail — logs a warning and returns 0 so user-facing endpoints
    (post create, journal entry, etc.) aren't taken down by a gamification
    bug.
    """
    xp = XP_ACTIONS.get(action, 0)
    if xp <= 0:
        return 0

    try:
        db = get_supabase()
        db.table("user_xp_log").insert({
            "user_id": user_id,
            "action": action,
            "xp_earned": xp,
            "metadata": metadata or {},
        }).execute()

        # Update total XP on profile — maybe_single so missing profile doesn't crash
        profile = maybe_one(db.table("profiles").select("xp").eq("id", user_id))
        if not profile.data:
            log.warning("award_xp: profile missing for user %s (action=%s)", user_id, action)
            return 0
        current_xp = profile.data.get("xp") or 0
        db.table("profiles").update({"xp": current_xp + xp}).eq("id", user_id).execute()

        # Check for new badges
        check_badges(user_id)

        return xp
    except Exception as e:
        log.error("award_xp failed (user=%s action=%s): %s", user_id, action, e)
        return 0


def check_badges(user_id: str) -> None:
    """Check and award any newly earned badges. Never raises."""
    try:
        db = get_supabase()
        profile = maybe_one(db.table("profiles").select("*").eq("id", user_id))
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
                log.info("badge awarded: user=%s badge=%s", user_id, badge_id)
    except Exception as e:
        log.error("check_badges failed (user=%s): %s", user_id, e)
