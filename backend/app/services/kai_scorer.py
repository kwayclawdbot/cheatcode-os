"""Kai Alert Scorer — scores user trade alerts 0-100 on post.

Scoring components:
  - Ticker convergence score (0-40 pts): from tickers table
  - Theme alignment (0-20 pts): is ticker in an escalating theme?
  - Setup completeness (0-20 pts): has entry/target/stop properly defined
  - Sector momentum (0-10 pts): from radar_snapshots
  - R-ratio quality (0-10 pts): target/stop spread shows discipline

Emoji tiers:
  90-100 → 🔥  (fire — exceptional conviction)
  75-89  → ⚡  (lightning — high conviction)
  60-74  → 💡  (bulb — solid setup)
  45-59  → 😐  (meh — weak alignment)
  0-44   → 🧊  (ice — cold / against grain)
"""

from __future__ import annotations

import logging
import asyncio
from datetime import datetime, timezone
from typing import Optional

from app.core.supabase import get_supabase

log = logging.getLogger("kai_scorer")


SCORE_EMOJI = {
    (90, 101): "🔥",
    (75, 90):  "⚡",
    (60, 75):  "💡",
    (45, 60):  "😐",
    (0,  45):  "🧊",
}


def score_emoji(score: int) -> str:
    for (lo, hi), emoji in SCORE_EMOJI.items():
        if lo <= score < hi:
            return emoji
    return "😐"


def score_label(score: int) -> str:
    if score >= 90:
        return "Exceptional conviction"
    if score >= 75:
        return "High conviction"
    if score >= 60:
        return "Solid setup"
    if score >= 45:
        return "Weak alignment"
    return "Against the grain"


async def score_alert(
    ticker: str,
    entry_price: Optional[str],
    target_price: Optional[str],
    stop_price: Optional[str],
    timeframe: Optional[str],
    thesis: Optional[str],
    direction: Optional[str] = "long",
) -> dict:
    """Score a trade alert. Returns {score, emoji, rationale, components}."""
    db = get_supabase()
    components = {}
    total = 0

    # ── 1. Ticker convergence (0-40 pts) ──────────────────────────────────
    conv_score = 0
    conv_direction = None
    try:
        result = db.table("tickers").select(
            "convergence_score,direction,confidence"
        ).eq("symbol", ticker.upper()).limit(1).execute()

        if result.data:
            t = result.data[0]
            conv_score = t.get("convergence_score", 0) or 0
            conv_direction = t.get("direction")
            # Map 0-100 convergence → 0-40 pts
            conv_pts = int((conv_score / 100) * 40)
            # Direction bonus: if alert direction matches Kai's direction
            if direction and conv_direction:
                alert_dir = direction.lower()
                kai_dir = conv_direction.lower()
                if (alert_dir == "long" and kai_dir == "bullish") or \
                   (alert_dir == "short" and kai_dir == "bearish"):
                    conv_pts = min(40, conv_pts + 5)
                elif (alert_dir == "long" and kai_dir == "bearish") or \
                     (alert_dir == "short" and kai_dir == "bullish"):
                    conv_pts = max(0, conv_pts - 10)
            components["convergence"] = conv_pts
            total += conv_pts
        else:
            components["convergence"] = 0
    except Exception as e:
        log.warning("ticker lookup failed for %s: %s", ticker, e)
        components["convergence"] = 0

    # ── 2. Theme alignment (0-20 pts) ─────────────────────────────────────
    theme_pts = 0
    try:
        themes = db.table("themes").select(
            "name,status,escalation_score,tickers"
        ).in_("status", ["active", "escalating"]).execute()

        for theme in (themes.data or []):
            tickers_in_theme = [t.upper() for t in (theme.get("tickers") or [])]
            if ticker.upper() in tickers_in_theme:
                esc = theme.get("escalation_score", 0) or 0
                if theme["status"] == "escalating":
                    theme_pts = min(20, int((esc / 100) * 20) + 5)
                else:
                    theme_pts = min(15, int((esc / 100) * 15))
                break
    except Exception as e:
        log.warning("theme lookup failed: %s", e)

    components["theme_alignment"] = theme_pts
    total += theme_pts

    # ── 3. Setup completeness (0-20 pts) ──────────────────────────────────
    setup_pts = 0
    try:
        has_entry = entry_price and entry_price.strip() not in ("", "0")
        has_target = target_price and target_price.strip() not in ("", "0")
        has_stop = stop_price and stop_price.strip() not in ("", "0")
        has_thesis = thesis and len(thesis.strip()) > 20

        if has_entry:
            setup_pts += 5
        if has_target:
            setup_pts += 5
        if has_stop:
            setup_pts += 5
        if has_thesis:
            setup_pts += 5
    except Exception:
        pass

    components["setup_completeness"] = setup_pts
    total += setup_pts

    # ── 4. R-ratio quality (0-10 pts) ─────────────────────────────────────
    r_pts = 0
    try:
        if entry_price and target_price and stop_price:
            e = float(str(entry_price).replace("$", "").replace(",", ""))
            t = float(str(target_price).replace("$", "").replace(",", ""))
            s = float(str(stop_price).replace("$", "").replace(",", ""))
            risk = abs(e - s)
            reward = abs(t - e)
            if risk > 0:
                r_ratio = reward / risk
                if r_ratio >= 3.0:
                    r_pts = 10
                elif r_ratio >= 2.0:
                    r_pts = 8
                elif r_ratio >= 1.5:
                    r_pts = 5
                elif r_ratio >= 1.0:
                    r_pts = 2
                # r < 1 = bad risk management = 0 pts
    except Exception:
        pass

    components["r_ratio"] = r_pts
    total += r_pts

    # ── 5. Sector momentum from radar (0-10 pts) ──────────────────────────
    radar_pts = 0
    try:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        radar = db.table("radar_snapshots").select(
            "market_sentiment,critical,high_conviction"
        ).eq("date", today).limit(1).execute()

        if radar.data:
            r_data = radar.data[0]
            # Check if ticker appears in today's critical or high conviction
            critical = r_data.get("critical") or []
            high_conv = r_data.get("high_conviction") or []

            critical_syms = [x.get("symbol", "").upper() for x in critical if isinstance(x, dict)]
            hc_syms = [x.get("symbol", "").upper() for x in high_conv if isinstance(x, dict)]

            if ticker.upper() in critical_syms:
                radar_pts = 10
            elif ticker.upper() in hc_syms:
                radar_pts = 7

            # Bonus if market sentiment aligns with direction
            sentiment = r_data.get("market_sentiment", "neutral")
            if direction:
                if direction.lower() == "long" and sentiment in ("bullish", "risk_on"):
                    radar_pts = min(10, radar_pts + 2)
                elif direction.lower() == "short" and sentiment in ("bearish", "risk_off"):
                    radar_pts = min(10, radar_pts + 2)
    except Exception as e:
        log.warning("radar lookup failed: %s", e)

    components["radar_momentum"] = radar_pts
    total += radar_pts

    # ── Final score ────────────────────────────────────────────────────────
    final_score = min(100, max(0, total))
    emoji = score_emoji(final_score)
    label = score_label(final_score)

    # Build rationale (brief, shown only on Ask Kai)
    rationale_parts = []
    if conv_score > 0:
        rationale_parts.append(f"Convergence: {conv_score}/100 ({conv_direction or 'neutral'})")
    if theme_pts > 0:
        rationale_parts.append(f"Theme aligned (+{theme_pts})")
    if r_pts >= 8:
        rationale_parts.append("Strong R-ratio")
    elif r_pts == 0 and setup_pts >= 15:
        rationale_parts.append("Poor risk/reward ratio")
    if radar_pts >= 7:
        rationale_parts.append("On today's radar")

    rationale = f"{emoji} {label}. " + ". ".join(rationale_parts) if rationale_parts else f"{emoji} {label}."

    return {
        "score": final_score,
        "emoji": emoji,
        "label": label,
        "rationale": rationale,
        "components": components,
    }


async def score_and_save(post_id: str, ticker: str, entry_price=None,
                          target_price=None, stop_price=None,
                          timeframe=None, thesis=None, direction=None) -> dict:
    """Score alert and write result back to feed_posts. Called as background task."""
    db = get_supabase()
    try:
        result = await score_alert(
            ticker=ticker,
            entry_price=entry_price,
            target_price=target_price,
            stop_price=stop_price,
            timeframe=timeframe,
            thesis=thesis,
            direction=direction,
        )
        db.table("feed_posts").update({
            "kai_score": result["score"],
            "kai_score_at": datetime.now(timezone.utc).isoformat(),
            "kai_rationale": result["rationale"],
        }).eq("id", post_id).execute()

        log.info("scored post %s: %d %s", post_id, result["score"], result["emoji"])
        return result
    except Exception as e:
        log.error("score_and_save failed for post %s: %s", post_id, e)
        return {"score": 0, "emoji": "😐", "rationale": "Scoring unavailable."}
