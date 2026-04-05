"""Curation Pipeline — monitors YouTube channels, scores, enriches, publishes."""

import json
import logging
from datetime import datetime, timezone
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

    # Fallback: yt-dlp subtitle download
    try:
        import subprocess
        result = subprocess.run(
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
    """Score content relevance 0-1 based on multiple factors."""
    score = 0.0

    # Creator quality (0-0.2)
    score += creator_quality * 0.2

    # Theme overlap (0-0.3)
    content_themes = set(context.get("themes", []))
    active_set = set(active_themes)
    if active_set and content_themes:
        overlap = len(content_themes & active_set) / max(len(active_set), 1)
        score += min(overlap * 0.5, 0.3)

    # Ticker overlap with radar (0-0.3)
    content_tickers = {t["symbol"] for t in context.get("tickers_mentioned", [])}
    radar_set = set(radar_tickers)
    if radar_set and content_tickers:
        overlap = len(content_tickers & radar_set) / max(len(radar_set), 1)
        score += min(overlap * 0.6, 0.3)

    # Recency bonus (0-0.1)
    published = video.get("published_at")
    if published:
        try:
            pub_dt = datetime.fromisoformat(published.replace("Z", "+00:00"))
            hours_ago = (datetime.now(timezone.utc) - pub_dt).total_seconds() / 3600
            if hours_ago < 24:
                score += 0.1
            elif hours_ago < 72:
                score += 0.05
        except (ValueError, TypeError):
            pass

    # Engagement signal (0-0.1)
    views = video.get("view_count", 0)
    if views > 100000:
        score += 0.1
    elif views > 10000:
        score += 0.05

    return min(score, 1.0)


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

    # Get active themes and radar tickers for context
    themes_result = db.table("themes").select("name").in_("status", ["active", "escalating"]).execute()
    active_themes = [t["name"] for t in (themes_result.data or [])]

    tickers_result = db.table("tickers").select("symbol").gte("convergence_score", 60).execute()
    radar_tickers = [t["symbol"] for t in (tickers_result.data or [])]

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

    # Score relevance
    relevance = score_relevance(
        video, context, active_themes, radar_tickers,
        creator_quality=creator.get("quality_score", 0.7),
    )

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
        "embedding": embedding,
        "is_published": relevance >= s.relevance_threshold,
        "is_featured": relevance >= 0.8,
    }

    # Insert content
    result = db.table("content").insert(record).execute()
    content_id = result.data[0]["id"]

    # Insert ticker mentions
    for ticker in context.get("tickers_mentioned", []):
        db.table("content_tickers").insert({
            "content_id": content_id,
            "ticker": ticker["symbol"],
            "mention_context": ticker.get("context"),
            "sentiment": ticker.get("sentiment"),
            "is_primary": ticker.get("is_primary", False),
        }).execute()

    log.info("Curated %s (relevance=%.2f, published=%s): %s",
             video_id, relevance, record["is_published"], video["title"][:60])

    # Auto-ingest into vault + KB
    try:
        from app.services.ingestion import ingest_content
        await ingest_content(content_id)
    except Exception as e:
        log.warning("Auto-ingestion failed for %s: %s", video_id, e)

    return record


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
