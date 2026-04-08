"""Trending ticker ranking — StockTwits-style composite score.

Computes `tickers.trending_score` over the full preset universe every 15
minutes via a scheduler job. Zero social traffic at launch is expected
and handled gracefully — the formula still produces meaningful rankings
from price/volume/content data alone. When users start posting, the
social component naturally takes its weight without rebalancing.

Formula (all sub-scores clamped 0-100):
    trending_score =
        0.35 * price_momentum_score    (abs today's % change, 10% = max)
      + 0.25 * volume_anomaly_score    (today / 20d avg, 2x = max)
      + 0.20 * content_mentions_score  (curated videos in last 48h, 10 = max)
      + 0.20 * social_activity_score   (posts + 0.5*comments, 24h, 50 = max)

Cashtag extraction:
    extract_cashtags(text) → list of validated ticker symbols (uppercase)
    Only symbols that exist in the preset `tickers` table are returned.
    No auto-create. Unknown cashtags are silently dropped.
"""

import logging
import re
from datetime import datetime, timedelta, timezone

from app.core.supabase import get_supabase

log = logging.getLogger("trending")

# $ followed by 1-5 uppercase alpha chars. Case-insensitive at the regex
# level, uppercased during validation. Allows optional hyphenated crypto
# form like $BTC-USD.
_CASHTAG_RE = re.compile(r"\$([A-Za-z][A-Za-z0-9]{0,4}(?:-[A-Za-z]{3})?)\b")


# ── Cashtag extraction + validation ────────────────────────────────────────

def extract_cashtags(text: str) -> list[str]:
    """Extract raw $cashtag tokens from free text. Returns uppercased,
    deduplicated list WITHOUT validating against the universe.
    Use validate_cashtags() for DB-backed validation."""
    if not text:
        return []
    matches = _CASHTAG_RE.findall(text)
    seen: set[str] = set()
    out: list[str] = []
    for m in matches:
        sym = m.upper()
        if sym not in seen:
            seen.add(sym)
            out.append(sym)
    return out


def validate_cashtags(raw_symbols: list[str]) -> list[str]:
    """Filter a cashtag list down to symbols that exist in the preset universe.
    Returns the subset that's present in the `tickers` table."""
    if not raw_symbols:
        return []
    db = get_supabase()
    result = (
        db.table("tickers")
        .select("symbol")
        .in_("symbol", raw_symbols)
        .execute()
    )
    return [r["symbol"] for r in (result.data or [])]


def log_post_mentions(
    text: str,
    post_id: str | None = None,
    comment_id: str | None = None,
    user_id: str | None = None,
) -> list[str]:
    """Extract + validate cashtags from text, then insert one row per
    validated symbol into post_ticker_mentions. Returns the list of
    validated symbols so the caller can include them in the post response
    for frontend rendering (clickable links)."""
    raw = extract_cashtags(text)
    valid = validate_cashtags(raw)
    if not valid:
        return []

    db = get_supabase()
    rows = [
        {
            "ticker": sym,
            "post_id": post_id,
            "comment_id": comment_id,
            "user_id": user_id,
        }
        for sym in valid
    ]
    try:
        db.table("post_ticker_mentions").insert(rows).execute()
    except Exception as e:
        log.warning("log_post_mentions insert failed: %s", e)
    return valid


# ── Trending score computation ─────────────────────────────────────────────

# Weight configuration — tweak if you want to emphasise different signals.
WEIGHTS = {
    "price": 0.35,
    "volume": 0.25,
    "content": 0.20,
    "social": 0.20,
}


# Data quality threshold — abs percentage moves above this are treated
# as junk data (delisted instruments, broken quotes, stale EODHD rows).
# A real-world daily move of 95%+ on an equity/crypto/forex would be a
# 2-sigma event worth manual review anyway.
_MAX_PLAUSIBLE_PCT_MOVE = 95.0


def _is_plausible_quote(last_price: float | None, change_pct: float | None) -> bool:
    """Reject obvious junk: zero/negative prices, impossible moves."""
    if last_price is None or last_price <= 0:
        return False
    if change_pct is None:
        return False
    if abs(float(change_pct)) > _MAX_PLAUSIBLE_PCT_MOVE:
        return False
    return True


def _price_momentum_score(change_pct: float | None) -> float:
    """0-100 from abs daily % change. 10%+ move = maxed."""
    if change_pct is None:
        return 0.0
    return min(100.0, abs(float(change_pct)) * 10.0)


def _volume_anomaly_score(last_volume: int | None, avg_volume: int | None) -> float:
    """0-100 from volume ratio vs 20d avg. 2x average = maxed."""
    if not last_volume or not avg_volume or avg_volume <= 0:
        return 0.0
    ratio = last_volume / avg_volume
    # 1x = 0 points, 2x = 100 points, clamp either side
    return max(0.0, min(100.0, (ratio - 1.0) * 100.0))


def _content_score(mentions_48h: int) -> float:
    """0-100 from curated video mentions in last 48h. 10 mentions = maxed."""
    return min(100.0, mentions_48h * 10.0)


def _social_score(post_mentions: int, comment_mentions: int) -> float:
    """0-100 from post + weighted comment mentions in last 24h.
    50 weighted mentions = maxed."""
    weighted = post_mentions + comment_mentions * 0.5
    return min(100.0, weighted * 2.0)


def _composite(price: float, volume: float, content: float, social: float) -> float:
    return round(
        WEIGHTS["price"] * price
        + WEIGHTS["volume"] * volume
        + WEIGHTS["content"] * content
        + WEIGHTS["social"] * social,
        2,
    )


async def compute_trending_scores() -> dict:
    """Recompute trending_score for every ticker in the universe.

    This is a pure-DB operation — no external API calls — so it's cheap
    to run every 15 minutes. For each ticker we roll up:
      - last_price / price_change_pct   (already on the row, synced hourly)
      - last_volume / volume_avg_20d    (same)
      - content_mentions_48h            (content_tickers table joined to content.curated_at)
      - social_mentions_24h             (post_ticker_mentions in 24h window)

    Then compute the composite score and update in batches.
    """
    db = get_supabase()
    now = datetime.now(timezone.utc)
    cutoff_24h = (now - timedelta(hours=24)).isoformat()
    cutoff_48h = (now - timedelta(hours=48)).isoformat()

    # Step 1: pull every ticker with current price/volume state.
    # Supabase REST defaults to 1000 rows per call — paginate to cover
    # the full 33K-ticker universe.
    page_size = 1000
    offset = 0
    tickers: list[dict] = []
    while True:
        res = (
            db.table("tickers")
            .select("symbol, last_price, price_change_pct, last_volume, volume_avg_20d, asset_class, trending_score")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = res.data or []
        if not batch:
            break
        tickers.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size

    if not tickers:
        log.info("compute_trending_scores: no tickers in universe")
        return {"scanned": 0, "updated": 0}

    # Step 2: aggregate social mentions for the last 24h. One query rollup.
    social_rollup: dict[str, dict[str, int]] = {}
    try:
        mentions = (
            db.table("post_ticker_mentions")
            .select("ticker, post_id, comment_id")
            .gte("created_at", cutoff_24h)
            .execute()
        )
        for m in (mentions.data or []):
            sym = m["ticker"]
            bucket = social_rollup.setdefault(sym, {"posts": 0, "comments": 0})
            if m.get("post_id"):
                bucket["posts"] += 1
            if m.get("comment_id"):
                bucket["comments"] += 1
    except Exception as e:
        log.warning("compute_trending_scores: social rollup failed: %s", e)

    # Step 3: content mentions in last 48h from curation.
    content_rollup: dict[str, int] = {}
    try:
        # content_tickers has no timestamp — join through content for curated_at.
        # Get recent published content IDs first.
        recent_content = (
            db.table("content")
            .select("id")
            .gte("curated_at", cutoff_48h)
            .eq("is_published", True)
            .execute()
        )
        recent_ids = [r["id"] for r in (recent_content.data or [])]
        if recent_ids:
            # Chunk the IN query if huge
            for i in range(0, len(recent_ids), 500):
                chunk = recent_ids[i:i + 500]
                ct = (
                    db.table("content_tickers")
                    .select("ticker")
                    .in_("content_id", chunk)
                    .execute()
                )
                for row in (ct.data or []):
                    sym = row["ticker"]
                    content_rollup[sym] = content_rollup.get(sym, 0) + 1
    except Exception as e:
        log.warning("compute_trending_scores: content rollup failed: %s", e)

    # Step 4: compute + collect updates. Skip tickers with no signal AND
    # no previous non-zero score — they'd be zero-to-zero no-ops. This
    # keeps the upsert set small (typically a few hundred rows instead
    # of 33K) and avoids pointless churn in the tickers table.
    #
    # Also reject tickers with implausible price data (delisted pairs
    # showing -100%, zero prices, etc.) — they're given zero price
    # momentum so they can only surface if social/content signal beats
    # them, which is the right behaviour.
    updates: list[dict] = []
    for t in tickers:
        symbol = t["symbol"]
        last_price = t.get("last_price")
        change_pct = t.get("price_change_pct")

        if _is_plausible_quote(last_price, change_pct):
            price_s = _price_momentum_score(change_pct)
            volume_s = _volume_anomaly_score(t.get("last_volume"), t.get("volume_avg_20d"))
        else:
            price_s = 0.0
            volume_s = 0.0

        content_s = _content_score(content_rollup.get(symbol, 0))
        social_bucket = social_rollup.get(symbol, {})
        social_s = _social_score(
            social_bucket.get("posts", 0),
            social_bucket.get("comments", 0),
        )
        score = _composite(price_s, volume_s, content_s, social_s)

        old_score = t.get("trending_score") or 0
        if score == 0 and old_score == 0:
            continue  # no signal, no change — skip

        updates.append({
            "symbol": symbol,
            "trending_score": score,
            "content_mentions_48h": content_rollup.get(symbol, 0),
            "social_mentions_24h": social_bucket.get("posts", 0),
            "social_comments_24h": social_bucket.get("comments", 0),
            "trending_score_computed_at": now.isoformat(),
        })

    # Step 5: batched upsert back to tickers
    updated_count = 0
    for i in range(0, len(updates), 500):
        batch = updates[i:i + 500]
        try:
            db.table("tickers").upsert(batch, on_conflict="symbol").execute()
            updated_count += len(batch)
        except Exception as e:
            log.warning("compute_trending_scores: batch upsert failed at %d: %s", i, e)

    log.info(
        "compute_trending_scores: %d/%d tickers updated (content_rollup=%d, social_rollup=%d)",
        updated_count, len(tickers), len(content_rollup), len(social_rollup),
    )
    return {
        "scanned": len(tickers),
        "updated": updated_count,
        "content_rollup_size": len(content_rollup),
        "social_rollup_size": len(social_rollup),
    }
