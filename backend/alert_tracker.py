"""Alert Outcome Tracker — watches open trade alerts and resolves win/loss.

Runs every 30 min during market hours via Railway cron.
Schedule: */30 9-16 * * 1-5 (ET) = */30 13-21 * * 1-5 UTC

For every open trade alert (post_type=trade_alert, outcome=null, has entry+target+stop):
  1. Fetch current price via EODHD
  2. If price >= target → outcome=win, calc R-multiple, award XP
  3. If price <= stop → outcome=loss, award small XP (correct stop behavior)
  4. If > 30 days open → outcome=expired
  5. Update profiles.win_rate, alert_count, alert_win_rate
  6. Post Kai comment on the thread announcing the result
"""
from __future__ import annotations

import logging
import os
import sys
import asyncio
import time
from datetime import datetime, timezone, timedelta
from typing import Optional

from dotenv import load_dotenv
load_dotenv()

from supabase import create_client
import requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
log = logging.getLogger("alert_tracker")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ["SUPABASE_KEY"]
EODHD_KEY = os.environ.get("EODHD_API_KEY", "")

KAI_AGENT_PROFILE_ID = None  # Set dynamically — the Kai system profile


def get_supabase():
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def fetch_current_price(ticker: str) -> Optional[float]:
    """Fetch current price from EODHD. Falls back to Yahoo Finance."""
    # Try EODHD first
    if EODHD_KEY:
        try:
            url = f"https://eodhd.com/api/real-time/{ticker}.US?api_token={EODHD_KEY}&fmt=json"
            r = requests.get(url, timeout=10)
            if r.status_code == 200:
                data = r.json()
                price = data.get("close") or data.get("previousClose")
                if price:
                    return float(price)
        except Exception as e:
            log.warning("EODHD price fetch failed for %s: %s", ticker, e)

    # Fallback: Yahoo Finance
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=1d"
        headers = {"User-Agent": "Mozilla/5.0"}
        r = requests.get(url, timeout=10, headers=headers)
        if r.status_code == 200:
            data = r.json()
            result = data.get("chart", {}).get("result", [{}])[0]
            meta = result.get("meta", {})
            price = meta.get("regularMarketPrice") or meta.get("previousClose")
            if price:
                return float(price)
    except Exception as e:
        log.warning("Yahoo price fetch failed for %s: %s", ticker, e)

    return None


def parse_price(val: Optional[str]) -> Optional[float]:
    """Parse price string like '$891.50' or '891.50' to float."""
    if not val:
        return None
    try:
        return float(str(val).replace("$", "").replace(",", "").strip())
    except Exception:
        return None


def calc_r_multiple(entry: float, exit_price: float, stop: float, direction: str) -> float:
    """Calculate R-multiple: how many R did the trade return."""
    risk = abs(entry - stop)
    if risk == 0:
        return 0.0
    if direction == "short":
        profit = entry - exit_price
    else:
        profit = exit_price - entry
    return round(profit / risk, 2)


def get_kai_profile_id(db) -> Optional[str]:
    """Get Kai's profile ID for posting comments."""
    global KAI_AGENT_PROFILE_ID
    if KAI_AGENT_PROFILE_ID:
        return KAI_AGENT_PROFILE_ID
    try:
        # Find the Kai system agent profile
        result = db.table("profiles").select("id").eq(
            "handle", "kai"
        ).limit(1).execute()
        if result.data:
            KAI_AGENT_PROFILE_ID = result.data[0]["id"]
            return KAI_AGENT_PROFILE_ID
        # Fallback: find any admin profile
        result2 = db.table("profiles").select("id").eq(
            "tier", "admin"
        ).limit(1).execute()
        if result2.data:
            KAI_AGENT_PROFILE_ID = result2.data[0]["id"]
            return KAI_AGENT_PROFILE_ID
    except Exception as e:
        log.warning("Could not find Kai profile: %s", e)
    return None


def post_kai_comment(db, post_id: str, message: str):
    """Post a Kai comment on a trade alert thread."""
    kai_id = get_kai_profile_id(db)
    if not kai_id:
        log.warning("No Kai profile found, skipping comment on post %s", post_id)
        return
    try:
        db.table("post_comments").insert({
            "post_id": post_id,
            "user_id": kai_id,
            "body": message,
            "is_kai_reply": True,
        }).execute()
    except Exception as e:
        log.warning("Failed to post Kai comment on %s: %s", post_id, e)


def update_profile_stats(db, user_id: str):
    """Recalculate and update a user's win_rate and alert stats from their posts."""
    try:
        result = db.table("feed_posts").select(
            "outcome,r_multiple"
        ).eq("user_id", user_id).in_(
            "post_type", ["trade_alert", "trade_idea"]
        ).not_.is_("outcome", "null").execute()

        posts = result.data or []
        total = len(posts)
        wins = sum(1 for p in posts if p.get("outcome") == "win")
        losses = sum(1 for p in posts if p.get("outcome") == "loss")
        win_rate = round((wins / total * 100), 1) if total > 0 else 0

        r_multiples = [p["r_multiple"] for p in posts
                       if p.get("r_multiple") is not None and p.get("outcome") == "win"]
        avg_r = round(sum(r_multiples) / len(r_multiples), 2) if r_multiples else 0

        db.table("profiles").update({
            "alert_count": total,
            "alert_win_rate": win_rate,
            "win_rate": win_rate,
            "total_trades": total,
        }).eq("id", user_id).execute()

        log.info("Updated profile %s: %d total, %d wins, %.1f%% WR", user_id, total, wins, win_rate)
        return {"total": total, "wins": wins, "win_rate": win_rate, "avg_r": avg_r}
    except Exception as e:
        log.error("Failed to update profile stats for %s: %s", user_id, e)
        return {}


def award_xp_for_outcome(db, user_id: str, outcome: str, r_multiple: float):
    """Award XP based on trade outcome."""
    xp = 0
    if outcome == "win":
        if r_multiple >= 3.0:
            xp = 400
        elif r_multiple >= 2.0:
            xp = 200
        elif r_multiple >= 1.0:
            xp = 100
        else:
            xp = 50
    elif outcome == "loss":
        xp = 15  # Reward correct stop-out behavior

    if xp > 0:
        try:
            db.table("user_xp_log").insert({
                "user_id": user_id,
                "action": f"alert_{outcome}",
                "xp_earned": xp,
                "metadata": {"r_multiple": r_multiple, "outcome": outcome},
            }).execute()

            profile = db.table("profiles").select("xp").eq("id", user_id).limit(1).execute()
            current_xp = (profile.data[0].get("xp") or 0) if profile.data else 0
            db.table("profiles").update({"xp": current_xp + xp}).eq("id", user_id).execute()
            log.info("Awarded %d XP to %s for %s (R=%.2f)", xp, user_id, outcome, r_multiple)
        except Exception as e:
            log.error("XP award failed for %s: %s", user_id, e)


def check_and_advance_belt(db, user_id: str):
    """Check if user qualifies for belt advancement and upgrade if so."""
    BELT_ORDER = ['white', 'yellow', 'orange', 'green', 'blue', 'purple', 'brown', 'black']
    BELT_THRESHOLDS = {
        'yellow':  {'min_alerts': 5,   'min_xp': 500,   'min_wr': 0},
        'orange':  {'min_alerts': 20,  'min_xp': 1500,  'min_wr': 50},
        'green':   {'min_alerts': 50,  'min_xp': 4000,  'min_wr': 55},
        'blue':    {'min_alerts': 100, 'min_xp': 10000, 'min_wr': 60},
        'purple':  {'min_alerts': 200, 'min_xp': 25000, 'min_wr': 63},
        'brown':   {'min_alerts': 350, 'min_xp': 50000, 'min_wr': 65},
        'black':   {'min_alerts': 500, 'min_xp': 100000,'min_wr': 68},
    }

    try:
        profile = db.table("profiles").select(
            "belt,xp,alert_count,alert_win_rate"
        ).eq("id", user_id).limit(1).execute()
        if not profile.data:
            return None

        p = profile.data[0]
        current_belt = p.get("belt") or "white"
        xp = p.get("xp") or 0
        alert_count = p.get("alert_count") or 0
        win_rate = float(p.get("alert_win_rate") or 0)

        current_idx = BELT_ORDER.index(current_belt) if current_belt in BELT_ORDER else 0
        new_belt = current_belt

        # Check each belt above current
        for belt in BELT_ORDER[current_idx + 1:]:
            thresh = BELT_THRESHOLDS.get(belt)
            if not thresh:
                break
            if (alert_count >= thresh['min_alerts'] and
                xp >= thresh['min_xp'] and
                win_rate >= thresh['min_wr']):
                new_belt = belt
            else:
                break  # Can't skip belts

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


def run_tracker():
    """Main tracker loop — processes all open alerts."""
    db = get_supabase()
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=30)

    log.info("Alert tracker starting — %s", now.isoformat())

    # Fetch all open trade alerts with price data
    try:
        result = db.table("feed_posts").select(
            "id,user_id,ticker,entry_price,target_price,stop_price,"
            "direction,post_type,created_at,outcome"
        ).in_("post_type", ["trade_alert", "trade_idea"]).is_("outcome", "null").not_.is_(
            "entry_price", "null"
        ).not_.is_("target_price", "null").not_.is_(
            "stop_price", "null"
        ).execute()

        posts = result.data or []
        log.info("Found %d open alerts to check", len(posts))
    except Exception as e:
        log.error("Failed to fetch open alerts: %s", e)
        return

    processed = 0
    for post in posts:
        post_id = post["id"]
        user_id = post["user_id"]
        ticker = post.get("ticker", "").upper()
        direction = (post.get("direction") or "long").lower()

        if not ticker:
            continue

        entry = parse_price(post.get("entry_price"))
        target = parse_price(post.get("target_price"))
        stop = parse_price(post.get("stop_price"))

        if not all([entry, target, stop]):
            continue

        # Check if expired
        try:
            created = datetime.fromisoformat(post["created_at"].replace("Z", "+00:00"))
        except Exception:
            continue

        if created < cutoff:
            db.table("feed_posts").update({
                "outcome": "expired",
                "outcome_resolved_at": now.isoformat(),
                "tracking_active": False,
            }).eq("id", post_id).execute()
            log.info("Expired alert %s (%s)", post_id, ticker)
            continue

        # Fetch current price
        current = fetch_current_price(ticker)
        if current is None:
            log.warning("Could not fetch price for %s, skipping", ticker)
            continue

        # Update current price on post
        pnl_pct = None
        if entry and entry > 0:
            if direction == "short":
                pnl_pct = round((entry - current) / entry * 100, 2)
            else:
                pnl_pct = round((current - entry) / entry * 100, 2)

        db.table("feed_posts").update({
            "current_price": current,
            "current_pnl_pct": pnl_pct,
            "last_price_update": now.isoformat(),
            "tracking_active": True,
        }).eq("id", post_id).execute()

        # Check outcome
        outcome = None
        if direction == "short":
            if current <= target:
                outcome = "win"
            elif current >= stop:
                outcome = "loss"
        else:
            if current >= target:
                outcome = "win"
            elif current <= stop:
                outcome = "loss"

        if outcome:
            r_multiple = calc_r_multiple(entry, current, stop, direction)

            db.table("feed_posts").update({
                "outcome": outcome,
                "r_multiple": max(0, r_multiple) if outcome == "win" else r_multiple,
                "outcome_resolved_at": now.isoformat(),
                "tracking_active": False,
                "current_price": current,
            }).eq("id", post_id).execute()

            # Award XP
            award_xp_for_outcome(db, user_id, outcome, r_multiple)

            # Update profile stats
            stats = update_profile_stats(db, user_id)

            # Check belt advancement
            new_belt = check_and_advance_belt(db, user_id)

            # Post Kai comment
            if outcome == "win":
                belt_msg = f" Belt advancing to {new_belt.upper()}! 🎯" if new_belt else ""
                msg = (
                    f"✅ Alert closed — target hit. ${ticker} "
                    f"+{pnl_pct:.1f}% · R = {r_multiple:.1f}. "
                    f"XP awarded. Track record updated: {stats.get('wins', 0)}W "
                    f"{stats.get('total', 0) - stats.get('wins', 0)}L "
                    f"({stats.get('win_rate', 0):.1f}% WR).{belt_msg}"
                )
            else:
                msg = (
                    f"🛑 Alert closed — stop hit. ${ticker} "
                    f"{pnl_pct:.1f}% · R = {r_multiple:.1f}. "
                    f"Correct stop behavior rewarded. Track record updated: "
                    f"{stats.get('wins', 0)}W "
                    f"{stats.get('total', 0) - stats.get('wins', 0)}L "
                    f"({stats.get('win_rate', 0):.1f}% WR)."
                )

            post_kai_comment(db, post_id, msg)
            log.info("Resolved %s: %s %s R=%.2f", post_id, ticker, outcome, r_multiple)
            processed += 1

        time.sleep(0.3)  # Rate limit EODHD

    log.info("Tracker done: %d resolved of %d checked", processed, len(posts))


if __name__ == "__main__":
    run_tracker()
