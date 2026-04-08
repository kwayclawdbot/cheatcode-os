"""Event-driven reactions for AI agents.

Two jobs live here:

1. `react_to_big_movers()` — called whenever the radar / trending job
   refreshes the `tickers` table. If any ticker in an agent's specialty
   list moves more than HOT_TAKE_THRESHOLD_PCT, fire a single hot take
   from that agent (with a cooldown so we don't spam during a choppy
   session).

2. `batch_add_reactions()` — hourly DB-only job that adds 3-8 bullish /
   bearish reactions (via `post_interactions`) to the 10 most recent
   posts. Pure database, zero Anthropic cost. Makes the feed feel
   "seen" when real engagement is still thin.

Both respect `app_settings.agent_posting_enabled` / `agent_reaction_batch_enabled`.
"""

from __future__ import annotations

import logging
import random
from datetime import datetime, timezone, timedelta

from app.core.supabase import get_supabase
from app.services.ai_agent_poster import (
    _get_active_agents,
    _load_setting,
    is_agent_posting_enabled,
    generate_post_content,
    post_as_agent,
    _global_agent_spend_today_usd,
    AGENT_DAILY_SPEND_CAP_USD,
    AgentRow,
)

log = logging.getLogger("ai_agent_reactor")

HOT_TAKE_THRESHOLD_PCT = 5.0           # abs % move required
HOT_TAKE_COOLDOWN_MINUTES = 45         # per-agent cooldown on hot takes
RECENT_POSTS_FOR_REACTIONS = 10
REACTIONS_PER_POST_RANGE = (3, 8)
REACTION_TYPES = ["like"]              # post_interactions.interaction_type vocabulary


# ============================================================
# Hot takes on big movers
# ============================================================

def _recent_hot_take_for_agent(agent: AgentRow, minutes: int) -> bool:
    """Check if this agent posted within the last `minutes` (anti-spam)."""
    if agent.last_post_at is None:
        return False
    delta = datetime.now(timezone.utc) - agent.last_post_at
    return delta < timedelta(minutes=minutes)


async def react_to_big_movers_async() -> dict:
    import asyncio
    return await asyncio.to_thread(react_to_big_movers)


async def batch_add_reactions_async() -> dict:
    import asyncio
    return await asyncio.to_thread(batch_add_reactions)


def react_to_big_movers() -> dict:
    """Scan `tickers` for abs(price_change_pct) >= threshold and fire
    one hot-take post per qualifying ticker, from the agent whose
    specialty matches.

    Idempotent-ish: relies on the per-agent cooldown to prevent
    posting the same move twice.
    """
    status = {"checked": 0, "hot_takes": 0, "reason": None}

    if not is_agent_posting_enabled():
        status["reason"] = "disabled"
        return status

    spend = _global_agent_spend_today_usd()
    if spend >= AGENT_DAILY_SPEND_CAP_USD:
        status["reason"] = f"spend cap hit ${spend:.2f}"
        return status

    db = get_supabase()
    try:
        res = (
            db.table("tickers")
            .select("symbol, name, last_price, price_change_pct, direction, catalyst, convergence_score")
            .execute()
        )
    except Exception as e:
        log.warning("tickers fetch failed: %s", e)
        return status

    rows = res.data or []
    hot = [
        r for r in rows
        if isinstance(r.get("price_change_pct"), (int, float))
        and abs(r["price_change_pct"]) >= HOT_TAKE_THRESHOLD_PCT
    ]
    status["checked"] = len(rows)

    if not hot:
        return status

    agents = _get_active_agents()
    if not agents:
        status["reason"] = "no agents"
        return status

    # Highest-conviction movers first
    hot.sort(key=lambda r: abs(r.get("price_change_pct") or 0), reverse=True)

    posted_this_run: set[str] = set()   # agent ids

    for ticker in hot[:5]:   # hard cap per cycle — don't flood
        symbol = ticker["symbol"]

        # Find best matching agent — prefer one with this ticker in specialty
        candidates = [
            a for a in agents
            if symbol in (a.specialty_tickers or [])
            and a.id not in posted_this_run
            and not _recent_hot_take_for_agent(a, HOT_TAKE_COOLDOWN_MINUTES)
        ]
        if not candidates:
            # Fallback: style-based match for big index/macro moves
            if symbol in ("SPY", "QQQ", "IWM", "DIA"):
                candidates = [
                    a for a in agents
                    if a.style in ("macro", "recap", "contrarian")
                    and a.id not in posted_this_run
                    and not _recent_hot_take_for_agent(a, HOT_TAKE_COOLDOWN_MINUTES)
                ]
            elif symbol in ("BTC", "ETH", "SOL"):
                candidates = [
                    a for a in agents
                    if a.style == "crypto"
                    and a.id not in posted_this_run
                    and not _recent_hot_take_for_agent(a, HOT_TAKE_COOLDOWN_MINUTES)
                ]

        if not candidates:
            continue

        agent = random.choice(candidates)

        log.info("hot take: %s moved %.2f%% → %s", symbol, ticker["price_change_pct"], agent.handle)

        content = generate_post_content(agent)
        if not content:
            continue

        # Force the ticker onto the content if the model didn't pick it up
        if not content.ticker:
            content.ticker = symbol
        content.tags = list(set(content.tags + ["hot_take"]))

        post_id = post_as_agent(agent, content)
        if post_id:
            status["hot_takes"] += 1
            posted_this_run.add(agent.id)

    return status


# ============================================================
# Passive reactions batch (DB-only)
# ============================================================

def batch_add_reactions() -> dict:
    """Add a small random number of 'like' reactions to recent posts,
    using AI agent profiles as the reactors. Zero Anthropic cost.

    This makes the feed feel less dead when real users first show up.
    Respects `agent_reaction_batch_enabled`.
    """
    status = {"added": 0, "reason": None}

    if not _load_setting("agent_reaction_batch_enabled", True):
        status["reason"] = "disabled"
        return status

    db = get_supabase()
    # Only react to posts from the last 24h, and skip posts already
    # saturated with likes (don't keep piling on).
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    try:
        res = (
            db.table("feed_posts")
            .select("id, user_id, likes_count")
            .gte("created_at", since)
            .order("created_at", desc=True)
            .limit(RECENT_POSTS_FOR_REACTIONS)
            .execute()
        )
    except Exception as e:
        log.warning("feed_posts fetch failed: %s", e)
        return status

    posts = res.data or []
    if not posts:
        status["reason"] = "no recent posts"
        return status

    agents = _get_active_agents()
    if not agents:
        status["reason"] = "no agents"
        return status

    agent_ids = [a.profile_id for a in agents]
    min_r, max_r = REACTIONS_PER_POST_RANGE

    for post in posts:
        post_id = post["id"]
        author_id = post["user_id"]
        existing_likes = int(post.get("likes_count") or 0)

        # Skip if already saturated — cap at ~15 likes per post from agents
        if existing_likes >= 15:
            continue

        # Which agents have already liked this post?
        try:
            liked = (
                db.table("post_interactions")
                .select("user_id")
                .eq("post_id", post_id)
                .eq("interaction_type", "like")
                .execute()
            )
            liked_ids = {r["user_id"] for r in (liked.data or [])}
        except Exception:
            liked_ids = set()

        eligible = [aid for aid in agent_ids if aid != author_id and aid not in liked_ids]
        if not eligible:
            continue

        n = random.randint(min_r, min(max_r, len(eligible)))
        pick = random.sample(eligible, n)

        rows_to_insert = [
            {"post_id": post_id, "user_id": uid, "interaction_type": "like"}
            for uid in pick
        ]
        try:
            db.table("post_interactions").insert(rows_to_insert).execute()
        except Exception as e:
            log.warning("post_interactions insert failed: %s", e)
            continue

        try:
            db.table("feed_posts").update({
                "likes_count": existing_likes + n,
            }).eq("id", post_id).execute()
        except Exception as e:
            log.warning("likes_count update failed: %s", e)

        status["added"] += n

    log.info("batch_add_reactions: added %d total", status["added"])
    return status
