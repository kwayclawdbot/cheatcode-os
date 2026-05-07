"""Beat Kai Leaderboard + Kai baseline stats."""

from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
from app.core.supabase import get_supabase
from app.core.auth import get_current_user

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


def _week_start() -> str:
    """Get Monday of current week as ISO date string."""
    today = datetime.now(timezone.utc).date()
    monday = today - timedelta(days=today.weekday())
    return monday.isoformat()


@router.get("/beat-kai")
async def beat_kai_leaderboard(user: dict | None = Depends(get_current_user)):
    """Weekly leaderboard of traders beating Kai's performance."""
    db = get_supabase()
    week_start = _week_start()

    # Get Kai baseline for this week
    kai_baseline = db.table("kai_baseline_stats").select("*").eq(
        "week_start", week_start
    ).limit(1).execute()

    kai_stats = {}
    if kai_baseline.data:
        kai_stats = kai_baseline.data[0]
    else:
        # Calculate Kai baseline from kai_trigger_events for this week
        since = f"{week_start}T00:00:00+00:00"
        triggers = db.table("kai_trigger_events").select(
            "ticker,fired_at,eod_outcome,score_morning"
        ).gte("fired_at", since).execute()

        events = triggers.data or []
        total = len(events)
        wins = sum(1 for e in events if e.get("eod_outcome") in ("win", "tp_hit"))
        losses = sum(1 for e in events if e.get("eod_outcome") in ("loss", "stopped"))
        resolved = wins + losses
        wr = round(wins / resolved * 100, 1) if resolved > 0 else 0

        kai_stats = {
            "week_start": week_start,
            "total_calls": total,
            "wins": wins,
            "losses": losses,
            "win_rate": wr,
            "avg_r": 2.1,  # Kai's historical average R
        }

        # Cache it
        if total > 0:
            db.table("kai_baseline_stats").upsert(kai_stats, on_conflict="week_start").execute()

    # Get trader stats for this week
    since = f"{week_start}T00:00:00+00:00"
    posts = db.table("feed_posts").select(
        "user_id,outcome,r_multiple,created_at"
    ).in_("post_type", ["trade_alert", "trade_idea"]).gte(
        "created_at", since
    ).not_.is_("outcome", "null").execute()

    # Aggregate by user
    user_stats: dict = {}
    for p in (posts.data or []):
        uid = p["user_id"]
        if uid not in user_stats:
            user_stats[uid] = {"calls": 0, "wins": 0, "r_multiples": []}
        user_stats[uid]["calls"] += 1
        if p.get("outcome") == "win":
            user_stats[uid]["wins"] += 1
            if p.get("r_multiple"):
                user_stats[uid]["r_multiples"].append(float(p["r_multiple"]))

    # Get profiles for these users
    if not user_stats:
        return {"kai": kai_stats, "leaders": [], "week_start": week_start}

    profiles_result = db.table("profiles").select(
        "id,display_name,handle,avatar_url,belt,xp,is_agent"
    ).in_("id", list(user_stats.keys())).eq("is_agent", False).execute()

    leaders = []
    for profile in (profiles_result.data or []):
        uid = profile["id"]
        stats = user_stats.get(uid, {})
        calls = stats.get("calls", 0)
        wins = stats.get("wins", 0)
        r_list = stats.get("r_multiples", [])

        if calls < 2:  # Require at least 2 calls to appear on leaderboard
            continue

        wr = round(wins / calls * 100, 1) if calls > 0 else 0
        avg_r = round(sum(r_list) / len(r_list), 2) if r_list else 0
        beating_kai = wr > kai_stats.get("win_rate", 0)

        leaders.append({
            **profile,
            "weekly_calls": calls,
            "weekly_wins": wins,
            "weekly_wr": wr,
            "weekly_avg_r": avg_r,
            "beating_kai": beating_kai,
        })

    # Sort: beating Kai first, then by win rate
    leaders.sort(key=lambda x: (-int(x["beating_kai"]), -x["weekly_wr"], -x["weekly_calls"]))

    return {
        "kai": kai_stats,
        "leaders": leaders[:20],
        "week_start": week_start,
        "total_traders": len(leaders),
        "traders_beating_kai": sum(1 for l in leaders if l["beating_kai"]),
    }


@router.get("/all-time")
async def all_time_leaderboard(
    sort: str = "win_rate",  # win_rate | xp | belt | calls
    belt: str | None = None,
    user: dict | None = Depends(get_current_user),
):
    """All-time leaderboard sorted by performance."""
    db = get_supabase()
    BELT_ORDER = ['white', 'yellow', 'orange', 'green', 'blue', 'purple', 'brown', 'black']

    q = db.table("profiles").select(
        "id,display_name,handle,avatar_url,belt,xp,win_rate,alert_win_rate,"
        "alert_count,total_trades,follower_count,trading_style,is_agent"
    ).eq("is_agent", False).gte("alert_count", 5)  # Min 5 alerts to appear

    if belt:
        q = q.eq("belt", belt)

    if sort == "xp":
        q = q.order("xp", desc=True)
    elif sort == "calls":
        q = q.order("alert_count", desc=True)
    else:  # win_rate default
        q = q.order("alert_win_rate", desc=True)

    result = q.limit(50).execute()
    traders = result.data or []

    # Add belt rank for sorting
    ranked = []
    for i, t in enumerate(traders):
        belt_rank = BELT_ORDER.index(t.get("belt") or "white") if (t.get("belt") or "white") in BELT_ORDER else 0
        ranked.append({**t, "rank": i + 1, "belt_rank": belt_rank})

    return ranked
