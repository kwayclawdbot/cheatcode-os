"""Unified ticker sentiment.

Combines four signal sources into a single bullish/bearish score for any
ticker, with each source weighted by reliability and decayed by recency:

  1. Convergence brain direction (tickers.direction)         — Kai's view
  2. Curated content sentiment (content_tickers.sentiment)   — what creators say
  3. Community feed sentiment (feed_posts.sentiment)         — what traders post
  4. Direct community votes (ticker_votes)                   — explicit bull/bear

Returns a structured dict the frontend can render directly. Pure DB queries —
no external API calls — so this is cheap to call from /intelligence/ticker.
"""

from datetime import datetime, timedelta, timezone

from app.core.supabase import get_supabase, maybe_one


# Weights are tuned so that:
#  - direct user votes dominate when present (community has spoken)
#  - the brain direction is the floor (always available)
#  - feed/content add nuance
SOURCE_WEIGHTS = {
    "votes":   0.40,
    "feed":    0.25,
    "content": 0.20,
    "brain":   0.15,
}


def _direction_to_score(direction: str | None) -> float:
    """Map a direction label to a -1..1 score."""
    if not direction:
        return 0.0
    d = direction.lower()
    if d in ("bullish", "long", "up"):
        return 1.0
    if d in ("bearish", "short", "down"):
        return -1.0
    return 0.0


def _score_to_label(score: float) -> str:
    if score > 0.25:
        return "bullish"
    if score < -0.25:
        return "bearish"
    return "neutral"


def get_ticker_sentiment(symbol: str) -> dict:
    """Aggregate sentiment for a ticker from all four sources.

    Returns:
        {
          "symbol": str,
          "score": float,           # -1..1 (negative=bearish, positive=bullish)
          "label": str,             # 'bullish' | 'bearish' | 'neutral'
          "confidence": str,        # 'high' | 'medium' | 'low'
          "votes":   {"bullish": int, "bearish": int, "total": int},
          "feed":    {"bullish": int, "bearish": int, "neutral": int},
          "content": {"bullish": int, "bearish": int, "neutral": int, "mixed": int},
          "brain":   {"direction": str|None, "score": int|None},
          "sources_present": int,   # how many of the 4 sources contributed
        }
    """
    db = get_supabase()
    sym = symbol.upper()

    # 1. Convergence brain direction (1 row)
    brain_row = maybe_one(
        db.table("tickers").select("direction, convergence_score").eq("symbol", sym)
    )
    brain_direction = (brain_row.data or {}).get("direction") if brain_row.data else None
    brain_score_raw = (brain_row.data or {}).get("convergence_score") if brain_row.data else None
    brain_score = _direction_to_score(brain_direction)

    # 2. Curated content sentiment (last 30 days)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    recent_content_ids: list[str] = []
    try:
        recent = (
            db.table("content")
            .select("id")
            .gte("curated_at", cutoff)
            .eq("is_published", True)
            .execute()
        )
        recent_content_ids = [r["id"] for r in (recent.data or [])]
    except Exception:
        pass

    content_counts = {"bullish": 0, "bearish": 0, "neutral": 0, "mixed": 0}
    if recent_content_ids:
        # Chunk to avoid PostgREST URL-length limits.
        for i in range(0, len(recent_content_ids), 200):
            chunk = recent_content_ids[i:i + 200]
            mentions = (
                db.table("content_tickers")
                .select("sentiment")
                .eq("ticker", sym)
                .in_("content_id", chunk)
                .execute()
            )
            for row in (mentions.data or []):
                s = (row.get("sentiment") or "neutral").lower()
                if s not in content_counts:
                    s = "neutral"
                content_counts[s] += 1

    content_total = sum(content_counts.values())
    content_score = 0.0
    if content_total > 0:
        content_score = (content_counts["bullish"] - content_counts["bearish"]) / content_total

    # 3. Community feed sentiment (last 14 days)
    feed_cutoff = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
    feed_counts = {"bullish": 0, "bearish": 0, "neutral": 0}
    try:
        feed_rows = (
            db.table("feed_posts")
            .select("sentiment")
            .eq("ticker", sym)
            .gte("created_at", feed_cutoff)
            .execute()
        )
        for row in (feed_rows.data or []):
            s = (row.get("sentiment") or "neutral").lower()
            if s not in feed_counts:
                s = "neutral"
            feed_counts[s] += 1
    except Exception:
        pass

    feed_total = sum(feed_counts.values())
    feed_score = 0.0
    if feed_total > 0:
        feed_score = (feed_counts["bullish"] - feed_counts["bearish"]) / feed_total

    # 4. Direct ticker votes (all-time)
    vote_counts = {"bullish": 0, "bearish": 0}
    try:
        votes = (
            db.table("ticker_votes")
            .select("direction")
            .eq("symbol", sym)
            .execute()
        )
        for row in (votes.data or []):
            d = (row.get("direction") or "").lower()
            if d in vote_counts:
                vote_counts[d] += 1
    except Exception:
        pass

    vote_total = vote_counts["bullish"] + vote_counts["bearish"]
    vote_score = 0.0
    if vote_total > 0:
        vote_score = (vote_counts["bullish"] - vote_counts["bearish"]) / vote_total

    # Composite — only count sources that actually have data, then renormalise
    # the weights so a missing source doesn't tank the score toward zero.
    contributions: list[tuple[str, float]] = []
    if vote_total > 0:
        contributions.append(("votes", vote_score))
    if feed_total > 0:
        contributions.append(("feed", feed_score))
    if content_total > 0:
        contributions.append(("content", content_score))
    if brain_direction is not None:
        contributions.append(("brain", brain_score))

    if contributions:
        weight_sum = sum(SOURCE_WEIGHTS[name] for name, _ in contributions)
        composite = sum(SOURCE_WEIGHTS[name] * score for name, score in contributions) / weight_sum
    else:
        composite = 0.0

    sources_present = len(contributions)
    if sources_present >= 3 and (vote_total + feed_total + content_total) >= 5:
        confidence = "high"
    elif sources_present >= 2:
        confidence = "medium"
    else:
        confidence = "low"

    return {
        "symbol": sym,
        "score": round(composite, 3),
        "label": _score_to_label(composite),
        "confidence": confidence,
        "votes":   {**vote_counts, "total": vote_total},
        "feed":    feed_counts,
        "content": content_counts,
        "brain":   {"direction": brain_direction, "score": brain_score_raw},
        "sources_present": sources_present,
    }
