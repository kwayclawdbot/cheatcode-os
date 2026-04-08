"""Curation Pipeline — monitors YouTube channels, scores, enriches, publishes."""

import json
import logging
from datetime import datetime, timezone, timedelta
import httpx
from app.core.config import get_settings
from app.core.supabase import get_supabase, maybe_one

log = logging.getLogger("curation")


# ── YouTube API ──────────────────────────────────────────────────────────────

async def fetch_channel_uploads(channel_id: str, max_results: int = 10) -> list[dict]:
    """Fetch recent uploads from a YouTube channel."""
    s = get_settings()
    async with httpx.AsyncClient() as client:
        # Get uploads playlist ID
        resp = await client.get(
            "https://www.googleapis.com/youtube/v3/channels",
            params={"part": "contentDetails,snippet,brandingSettings", "id": channel_id, "key": s.youtube_api_key},
        )
        data = resp.json()
        items = data.get("items", [])
        if not items:
            return []

        channel_info = items[0]
        uploads_id = channel_info["contentDetails"]["relatedPlaylists"]["uploads"]

        # Auto-update creator avatar + description from YouTube
        snippet = channel_info.get("snippet", {})
        avatar_url = snippet.get("thumbnails", {}).get("high", {}).get("url") or snippet.get("thumbnails", {}).get("default", {}).get("url")
        banner_url = channel_info.get("brandingSettings", {}).get("image", {}).get("bannerExternalUrl")
        yt_description = snippet.get("description", "")

        if avatar_url:
            db = get_supabase()
            updates = {"avatar_url": avatar_url}
            if yt_description and len(yt_description) > 10:
                updates["description"] = yt_description[:500]
            if banner_url:
                updates["metadata"] = {"banner_url": banner_url, "youtube_handle": snippet.get("customUrl", "")}
            db.table("creators").update(updates).eq("youtube_channel_id", channel_id).execute()

        # Get recent videos from uploads playlist
        resp = await client.get(
            "https://www.googleapis.com/youtube/v3/playlistItems",
            params={
                "part": "snippet,contentDetails",
                "playlistId": uploads_id,
                "maxResults": max_results,
                "key": s.youtube_api_key,
            },
        )
        playlist_data = resp.json()

        videos = []
        video_ids = []
        for item in playlist_data.get("items", []):
            vid_id = item["contentDetails"]["videoId"]
            snippet = item["snippet"]
            videos.append({
                "video_id": vid_id,
                "title": snippet["title"],
                "description": snippet.get("description", ""),
                "thumbnail_url": snippet.get("thumbnails", {}).get("maxres", {}).get("url") or snippet.get("thumbnails", {}).get("high", {}).get("url"),
                "published_at": snippet.get("publishedAt"),
                "channel_title": snippet.get("channelTitle"),
            })
            video_ids.append(vid_id)

        # Fetch durations
        if video_ids:
            resp = await client.get(
                "https://www.googleapis.com/youtube/v3/videos",
                params={
                    "part": "contentDetails,statistics",
                    "id": ",".join(video_ids),
                    "key": s.youtube_api_key,
                },
            )
            details = {v["id"]: v for v in resp.json().get("items", [])}
            for v in videos:
                d = details.get(v["video_id"], {})
                duration_iso = d.get("contentDetails", {}).get("duration", "")
                v["duration_seconds"] = _parse_iso_duration(duration_iso)
                stats = d.get("statistics", {})
                v["view_count"] = int(stats.get("viewCount", 0))
                v["like_count"] = int(stats.get("likeCount", 0))

        return videos


def _parse_iso_duration(iso: str) -> int:
    """Parse ISO 8601 duration (PT1H2M3S) to seconds."""
    import re
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso)
    if not match:
        return 0
    h, m, s = (int(g) if g else 0 for g in match.groups())
    return h * 3600 + m * 60 + s


# ── Transcript Extraction ────────────────────────────────────────────────────

async def extract_transcript(video_id: str) -> str | None:
    """Extract transcript from YouTube video using captions API or yt-dlp fallback."""
    # Try YouTube captions first
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://www.youtube.com/watch?v={video_id}",
                headers={"User-Agent": "Mozilla/5.0"},
            )
            # Extract captions track URL from page source
            import re
            caption_match = re.search(r'"captionTracks":\[(\{[^]]+\})\]', resp.text)
            if caption_match:
                tracks = json.loads(f"[{caption_match.group(1)}]")
                # Prefer English manual captions, fall back to auto
                en_track = None
                for t in tracks:
                    if t.get("languageCode") == "en":
                        en_track = t
                        if t.get("kind") != "asr":  # manual > auto
                            break
                if en_track and en_track.get("baseUrl"):
                    caption_resp = await client.get(en_track["baseUrl"] + "&fmt=json3")
                    if caption_resp.status_code == 200:
                        events = caption_resp.json().get("events", [])
                        lines = []
                        for e in events:
                            segs = e.get("segs", [])
                            text = "".join(s.get("utf8", "") for s in segs).strip()
                            if text and text != "\n":
                                lines.append(text)
                        if lines:
                            return " ".join(lines)
    except Exception as e:
        log.warning("Caption extraction failed for %s: %s", video_id, e)

    # Fallback: yt-dlp subtitle download.
    # Wrapped in asyncio.to_thread so the blocking subprocess doesn't freeze
    # the entire event loop for ~30s. Other scheduler jobs + API requests
    # would have been queued behind this on the old sync path.
    try:
        import asyncio
        import subprocess
        result = await asyncio.to_thread(
            subprocess.run,
            ["yt-dlp", "--write-auto-sub", "--sub-lang", "en", "--skip-download",
             "--sub-format", "json3", "-o", "/tmp/%(id)s", f"https://youtube.com/watch?v={video_id}"],
            capture_output=True, text=True, timeout=30,
        )
        import pathlib
        sub_file = pathlib.Path(f"/tmp/{video_id}.en.json3")
        if sub_file.exists():
            data = json.loads(sub_file.read_text())
            lines = []
            for e in data.get("events", []):
                segs = e.get("segs", [])
                text = "".join(s.get("utf8", "") for s in segs).strip()
                if text and text != "\n":
                    lines.append(text)
            sub_file.unlink()
            if lines:
                return " ".join(lines)
    except Exception as e:
        log.warning("yt-dlp transcript fallback failed for %s: %s", video_id, e)

    return None


# ── AI Context Generation ────────────────────────────────────────────────────

async def generate_context_layer(
    title: str,
    transcript: str,
    description: str = "",
    active_themes: list[str] | None = None,
    active_tickers: list[str] | None = None,
) -> dict:
    """Generate the AI context layer for a piece of content using Claude."""
    import anthropic
    s = get_settings()
    client = anthropic.Anthropic(api_key=s.anthropic_api_key)

    themes_ctx = f"\nActive market themes: {', '.join(active_themes)}" if active_themes else ""
    tickers_ctx = f"\nTickers on radar: {', '.join(active_tickers[:30])}" if active_tickers else ""

    prompt = f"""Analyze this finance video and generate a context layer.

Title: {title}
Description: {description[:500]}
{themes_ctx}{tickers_ctx}

Transcript (first 8000 chars):
{transcript[:8000]}

Return a JSON object with these exact keys:

1. "quick_take" — 3-4 sentences. What this video covers and why it matters RIGHT NOW. Tie to current market conditions. Not a generic summary. Be specific and actionable.

2. "key_insights" — array of 4-6 objects: {{"insight": "...", "category": "strategy|analysis|risk|opportunity|education"}}. Actual takeaways. Actionable, not filler.

3. "tickers_mentioned" — array of objects: {{"symbol": "AAPL", "context": "what the creator said about it", "sentiment": "bullish|bearish|neutral|mixed", "is_primary": true/false}}

4. "timestamps" — array of objects: {{"seconds": 120, "label": "VCP pattern breakdown"}}. Key moments. If you can't determine exact times, estimate from context.

5. "topics" — array of strings from: technical_analysis, options, swing_trading, day_trading, macro, sectors, crypto, fundamentals, psychology, earnings, etfs, risk_management, market_structure

6. "skill_level" — "beginner", "intermediate", or "advanced"

7. "themes" — array of market themes discussed (e.g., "ai_infrastructure", "rate_cuts", "nuclear_renaissance"). Use snake_case.

Return ONLY valid JSON, no markdown fences."""

    response = client.messages.create(
        model=s.kai_model,
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )

    try:
        text = response.content[0].text
        # Strip markdown fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(text)
    except (json.JSONDecodeError, IndexError) as e:
        log.error("Failed to parse context layer: %s", e)
        return {}


# ── Relevance Scoring ────────────────────────────────────────────────────────

def score_relevance(
    video: dict,
    context: dict,
    active_themes: list[str],
    radar_tickers: list[str],
    creator_quality: float = 0.7,
) -> float:
    """Score content relevance 0-1 based on multiple factors.

    Has a graceful-degradation fallback: if upstream intelligence (themes +
    radar tickers) is empty, the weights for theme/ticker overlap (60% of
    max) are redistributed across creator quality, recency, and engagement
    so a quality video still passes the publish threshold on an intel drought.
    """
    active_set = set(active_themes)
    radar_set = set(radar_tickers)
    intel_available = bool(active_set or radar_set)

    if intel_available:
        weights = {
            "creator": 0.20,
            "theme": 0.30,
            "ticker": 0.30,
            "recency": 0.10,
            "engagement": 0.10,
        }
    else:
        # Fallback: redistribute the 60% theme/ticker weight across stable signals
        weights = {
            "creator": 0.50,
            "theme": 0.0,
            "ticker": 0.0,
            "recency": 0.25,
            "engagement": 0.25,
        }
        log.warning(
            "score_relevance fallback active: no themes or radar tickers available — "
            "redistributing theme/ticker weight to creator/recency/engagement"
        )

    score = 0.0

    # Creator quality
    score += creator_quality * weights["creator"]

    # Theme overlap
    content_themes = set(context.get("themes", []))
    if weights["theme"] > 0 and active_set and content_themes:
        overlap = len(content_themes & active_set) / max(len(active_set), 1)
        score += min(overlap * (weights["theme"] / 0.6), weights["theme"])

    # Ticker overlap with radar
    content_tickers = {t["symbol"] for t in context.get("tickers_mentioned", [])}
    if weights["ticker"] > 0 and radar_set and content_tickers:
        overlap = len(content_tickers & radar_set) / max(len(radar_set), 1)
        score += min(overlap * (weights["ticker"] / 0.5), weights["ticker"])

    # Recency bonus (scaled to weight)
    published = video.get("published_at")
    if published:
        try:
            pub_dt = datetime.fromisoformat(published.replace("Z", "+00:00"))
            hours_ago = (datetime.now(timezone.utc) - pub_dt).total_seconds() / 3600
            if hours_ago < 24:
                score += weights["recency"]
            elif hours_ago < 72:
                score += weights["recency"] * 0.5
        except (ValueError, TypeError):
            pass

    # Engagement signal (scaled to weight)
    views = video.get("view_count", 0)
    if views > 100000:
        score += weights["engagement"]
    elif views > 10000:
        score += weights["engagement"] * 0.5

    return min(score, 1.0)


def _fetch_intel_with_lookback(db, days: int = 7) -> tuple[list[str], list[str]]:
    """Fetch active themes + radar tickers with a lookback window.

    If today's themes table is empty, fall back to themes that were active
    any time in the last `days` days. Same for radar tickers. Prevents a
    1-day intel drought from killing content publishing.
    """
    # Today's active themes
    themes_result = db.table("themes").select("name").in_("status", ["active", "escalating"]).execute()
    active_themes = [t["name"] for t in (themes_result.data or [])]

    # If empty, look back
    if not active_themes:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        lookback = db.table("themes").select("name").gte("updated_at", cutoff).execute()
        active_themes = [t["name"] for t in (lookback.data or [])]
        if active_themes:
            log.info("Themes lookback: no active themes today, using %d from last %d days", len(active_themes), days)

    # Today's radar tickers
    tickers_result = db.table("tickers").select("symbol").gte("convergence_score", 60).execute()
    radar_tickers = [t["symbol"] for t in (tickers_result.data or [])]

    # If empty, look back with a lower threshold
    if not radar_tickers:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        lookback = (
            db.table("tickers")
            .select("symbol")
            .gte("convergence_score", 40)
            .gte("scored_at", cutoff)
            .execute()
        )
        radar_tickers = [t["symbol"] for t in (lookback.data or [])]
        if radar_tickers:
            log.info("Radar lookback: no tickers ≥60 today, using %d at ≥40 from last %d days", len(radar_tickers), days)

    return active_themes, radar_tickers


# ── Value Scoring (user-facing "worth watching") ─────────────────────────────

# Topics that make a video timeless — if any of these are present, the
# video bypasses the recency decay in value_score.
EDUCATIONAL_TOPICS = frozenset({
    "education",
    "psychology",
    "risk_management",
    "fundamentals",
    "market_structure",
})


def score_value(video: dict, context: dict, creator_quality: float, transcript: str) -> dict:
    """Compute user-facing value_score (0-100) — "is this video worth watching?".

    Separate from relevance_score (market-timing) and convergence_score
    (ticker intelligence). Stable across time: an educational video scores
    the same today as next month.

    Components (max 100):
      - Creator quality      (0-30)  trustworthy source baseline
      - Insight density      (0-25)  actionable insights per hour runtime
      - Transcript density   (0-15)  words-per-minute vs 180 wpm target
      - Skill clarity        (0-10)  AI successfully classified skill level
      - Engagement quality   (0-10)  like-to-view ratio, not raw views
      - Recency              (0-10)  time-decayed, EXCEPT for educational topics

    Returns: {"score": int, "components": dict} — components exposed for UI debug.
    """
    components = {}

    # Creator quality (0-30): trusted source is half the battle
    components["creator"] = round(creator_quality * 30, 2)

    # Insight density (0-25): actionable insights per hour of runtime.
    # 8+ insights/hour caps out the score — rewards tight content.
    duration_sec = video.get("duration_seconds") or 0
    duration_min = max(duration_sec / 60, 1)  # avoid div/0
    key_insights = context.get("key_insights") or []
    insights_per_hour = (len(key_insights) / duration_min) * 60
    # Target: 8 insights/hour = 25 points (divisor = 8/25 = 0.32)
    components["insight_density"] = round(min(25.0, (insights_per_hour / 8) * 25), 2)

    # Transcript density (0-15): words per minute vs 180 wpm speech target.
    # Catches low-effort vlog-style fluff that talks slowly and says little.
    word_count = len((transcript or "").split())
    wpm = word_count / duration_min
    # Target: 180 wpm = 15 points. Cap at 15.
    components["transcript_density"] = round(min(15.0, (wpm / 180) * 15), 2)

    # Skill clarity (0-10): proxy for "AI could cleanly classify = well-structured"
    skill = context.get("skill_level")
    components["skill_clarity"] = 10.0 if skill in {"beginner", "intermediate", "advanced"} else 0.0

    # Engagement quality (0-10): like-to-view RATIO (not raw views).
    # Kills the "viral clickbait" inflation. 1% like rate ≈ max.
    views = video.get("view_count") or 0
    likes = video.get("like_count") or 0
    if views > 0:
        like_ratio = likes / views
        components["engagement"] = round(min(10.0, like_ratio * 1000), 2)
    else:
        components["engagement"] = 0.0

    # Recency (0-10): time-decay, EXCEPT for educational topics which never decay.
    topics = set(context.get("topics") or [])
    is_educational = bool(topics & EDUCATIONAL_TOPICS)
    if is_educational:
        components["recency"] = 10.0  # Timeless content
    else:
        published = video.get("published_at")
        components["recency"] = 0.0
        if published:
            try:
                pub_dt = datetime.fromisoformat(published.replace("Z", "+00:00"))
                hours_ago = (datetime.now(timezone.utc) - pub_dt).total_seconds() / 3600
                if hours_ago < 48:
                    components["recency"] = 10.0
                elif hours_ago < 24 * 7:
                    components["recency"] = 7.0
                elif hours_ago < 24 * 30:
                    components["recency"] = 5.0
            except (ValueError, TypeError):
                pass

    total = int(round(sum(components.values())))
    total = max(0, min(100, total))

    return {
        "score": total,
        "components": components,
        "word_count": word_count,
    }


# ── Embedding Generation ─────────────────────────────────────────────────────

async def generate_embedding(text: str) -> list[float]:
    """Generate embedding using OpenAI text-embedding-3-small."""
    s = get_settings()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.openai.com/v1/embeddings",
            headers={"Authorization": f"Bearer {s.openai_api_key}"},
            json={"input": text[:8000], "model": s.embedding_model},
            timeout=30,
        )
        data = resp.json()
        return data["data"][0]["embedding"]


# ── Full Pipeline ────────────────────────────────────────────────────────────

async def process_video(video: dict, creator: dict) -> dict | None:
    """Run the full curation pipeline for a single video.
    Returns content record dict or None if below threshold."""
    db = get_supabase()
    s = get_settings()
    video_id = video["video_id"]

    # Skip shorts (under 3 minutes)
    duration = video.get("duration_seconds", 0)
    if duration and duration < 180:
        log.info("Skipping short (%ds): %s", duration, video["title"][:60])
        return None

    # Check if already curated
    existing = maybe_one(db.table("content").select("id").eq("external_id", video_id))
    if existing.data:
        return None

    # Check if in queue and already rejected
    queued = maybe_one(db.table("curation_queue").select("status").eq("external_id", video_id))
    if queued.data and queued.data.get("status") == "rejected":
        return None

    # Extract transcript
    log.info("Extracting transcript for %s: %s", video_id, video["title"][:60])
    transcript = await extract_transcript(video_id)
    if not transcript:
        log.warning("No transcript available for %s", video_id)
        # Still proceed with description-only context
        transcript = video.get("description", "")

    # Get active themes and radar tickers for context (with 7-day lookback fallback)
    active_themes, radar_tickers = _fetch_intel_with_lookback(db, days=7)

    # Generate AI context layer
    context = await generate_context_layer(
        title=video["title"],
        transcript=transcript,
        description=video.get("description", ""),
        active_themes=active_themes,
        active_tickers=radar_tickers,
    )

    if not context:
        log.warning("Failed to generate context for %s", video_id)
        return None

    # Score relevance (market-timing, 0-1)
    creator_quality = creator.get("quality_score", 0.7)
    relevance = score_relevance(
        video, context, active_themes, radar_tickers,
        creator_quality=creator_quality,
    )

    # Score value (user-facing "worth watching", 0-100, stable)
    value = score_value(video, context, creator_quality, transcript or "")

    # Generate embedding for semantic search
    embed_text = f"{video['title']}. {context.get('quick_take', '')}. {' '.join(context.get('topics', []))}"
    embedding = await generate_embedding(embed_text)

    # Build content record
    record = {
        "creator_id": creator["id"],
        "content_type": "video",
        "source_platform": "youtube",
        "external_id": video_id,
        "external_url": f"https://www.youtube.com/watch?v={video_id}",
        "title": video["title"],
        "description": video.get("description", "")[:2000],
        "thumbnail_url": video.get("thumbnail_url"),
        "duration_seconds": video.get("duration_seconds"),
        "published_at": video.get("published_at"),
        "quick_take": context.get("quick_take"),
        "key_insights": context.get("key_insights"),
        "timestamps": context.get("timestamps"),
        "transcript": transcript[:50000] if transcript else None,
        "topics": context.get("topics", []),
        "themes": context.get("themes", []),
        "skill_level": context.get("skill_level", "intermediate"),
        "relevance_score": relevance,
        "value_score": value["score"],
        "value_score_components": value["components"],
        "view_count": video.get("view_count"),
        "like_count": video.get("like_count"),
        "word_count": value["word_count"],
        "embedding": embedding,
        "is_published": relevance >= s.relevance_threshold,
        "is_featured": relevance >= 0.8,
        # Initialize ingestion lifecycle fields so the orphan picker
        # (ingest_all_pending) never misses this row because of NULL.
        "ingestion_status": "pending",
        "ingestion_attempts": 0,
    }

    # Idempotent upsert on (source_platform, external_id) — if the curation
    # cycle retries after a network cut, we don't create duplicate rows.
    # Requires the partial unique index from migration 007.
    result = (
        db.table("content")
        .upsert(record, on_conflict="source_platform,external_id")
        .execute()
    )
    content_id = result.data[0]["id"]

    # Insert ticker mentions — idempotent by (content_id, ticker) if such
    # a constraint exists; otherwise tolerate duplicates silently.
    for ticker in context.get("tickers_mentioned", []):
        try:
            db.table("content_tickers").insert({
                "content_id": content_id,
                "ticker": ticker["symbol"],
                "mention_context": ticker.get("context"),
                "sentiment": ticker.get("sentiment"),
                "is_primary": ticker.get("is_primary", False),
            }).execute()
        except Exception as e:
            # Duplicate ticker mention on retry — log and continue.
            log.debug("content_tickers insert skipped for %s/%s: %s", content_id, ticker.get("symbol"), e)

    log.info("Curated %s (relevance=%.2f, published=%s): %s",
             video_id, relevance, record["is_published"], video["title"][:60])

    # Auto-ingest into vault + KB
    try:
        from app.services.ingestion import ingest_content
        await ingest_content(content_id)
    except Exception as e:
        log.warning("Auto-ingestion failed for %s: %s", video_id, e)

    return record


async def rescore_recent_content(days: int = 14) -> dict:
    """Re-score content from the last `days` days against today's intelligence.

    Why: relevance_score is market-timing — it depends on what's hot TODAY.
    A video curated on Monday when AAPL wasn't on radar stays unfeatured
    even if AAPL dominates Friday's radar. This cron fixes that.

    Behavior:
    - Re-fetches today's active themes + radar tickers (with 7-day lookback)
    - Re-runs score_relevance + score_value on each video
    - Updates relevance_score, value_score, value_score_components, is_featured
    - is_published CAN flip from false→true (promotion) but NOT true→false
      (sticky publish gate — never yank content users may already have seen)
    - Skips micro-updates (|delta| < 0.05 on relevance_score) to avoid DB churn
    """
    db = get_supabase()
    s = get_settings()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    # Today's intelligence (with lookback fallback)
    active_themes, radar_tickers = _fetch_intel_with_lookback(db, days=7)

    # Fetch recent content
    recent = (
        db.table("content")
        .select("*")
        .gte("published_at", cutoff)
        .eq("content_type", "video")
        .execute()
    )
    rows = recent.data or []

    # Preload creators once
    creator_ids = list({r["creator_id"] for r in rows if r.get("creator_id")})
    creator_map = {}
    if creator_ids:
        creators_result = db.table("creators").select("id, quality_score").in_("id", creator_ids).execute()
        creator_map = {c["id"]: c.get("quality_score", 0.7) for c in (creators_result.data or [])}

    updated = 0
    promoted = 0
    featured_changes = 0

    for row in rows:
        creator_quality = creator_map.get(row.get("creator_id"), 0.7)

        # Reconstruct the video + context shapes expected by the scoring fns
        video_like = {
            "duration_seconds": row.get("duration_seconds") or 0,
            "view_count": row.get("view_count") or 0,
            "like_count": row.get("like_count") or 0,
            "published_at": row.get("published_at"),
        }

        # Ticker symbols for this content — look up from content_tickers
        tickers_result = db.table("content_tickers").select("ticker").eq("content_id", row["id"]).execute()
        ticker_syms = [t["ticker"] for t in (tickers_result.data or [])]

        context_like = {
            "themes": row.get("themes") or [],
            "tickers_mentioned": [{"symbol": t} for t in ticker_syms],
            "topics": row.get("topics") or [],
            "key_insights": row.get("key_insights") or [],
            "skill_level": row.get("skill_level"),
            "quick_take": row.get("quick_take"),
        }

        new_rel = score_relevance(video_like, context_like, active_themes, radar_tickers, creator_quality)
        new_val = score_value(video_like, context_like, creator_quality, row.get("transcript") or "")

        old_rel = row.get("relevance_score") or 0
        old_val = row.get("value_score") or 0
        old_featured = bool(row.get("is_featured"))
        old_published = bool(row.get("is_published"))

        rel_delta = abs(new_rel - old_rel)
        val_delta = abs(new_val["score"] - old_val)
        new_featured = new_rel >= 0.80
        # Sticky publish: never un-publish, but allow promotion
        new_published = old_published or (new_rel >= s.relevance_threshold)

        # Skip if nothing meaningful changed
        if (rel_delta < 0.05 and val_delta < 2
                and new_featured == old_featured
                and new_published == old_published):
            continue

        db.table("content").update({
            "relevance_score": new_rel,
            "value_score": new_val["score"],
            "value_score_components": new_val["components"],
            "word_count": new_val["word_count"],
            "is_featured": new_featured,
            "is_published": new_published,
        }).eq("id", row["id"]).execute()

        updated += 1
        if new_published and not old_published:
            promoted += 1
        if new_featured != old_featured:
            featured_changes += 1

    log.info(
        "Rescore complete: %d/%d updated (promoted=%d, featured_flips=%d)",
        updated, len(rows), promoted, featured_changes,
    )
    return {
        "scanned": len(rows),
        "updated": updated,
        "promoted": promoted,
        "featured_changes": featured_changes,
    }


async def run_curation_cycle():
    """Run one full curation cycle: scan all active creators, process new uploads."""
    db = get_supabase()
    creators = db.table("creators").select("*").eq("is_active", True).execute()

    total_processed = 0
    for creator in creators.data or []:
        if not creator.get("youtube_channel_id"):
            continue

        try:
            videos = await fetch_channel_uploads(creator["youtube_channel_id"], max_results=15)
            for video in videos:
                result = await process_video(video, creator)
                if result:
                    total_processed += 1
        except Exception as e:
            log.error("Failed to process creator %s: %s", creator["name"], e)

    log.info("Curation cycle complete: %d new items processed", total_processed)
    return total_processed
