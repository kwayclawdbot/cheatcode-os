"""Content Repurposing Engine — longform → branded short-form clips via Remotion.

Pipeline:
1. Claude analyzes transcript, finds 3-5 best "clippable moments"
2. For each clip: assembles a multi-scene StoryReel from mixed timestamps
3. Generates voiceover script (hook + insight + CTA)
4. Builds props.json for Remotion StoryReel composition
5. Renders via Remotion CLI
6. Generates caption + hashtags for each platform
"""

import json
import logging
import subprocess
import re
from datetime import datetime, timezone
from pathlib import Path

import anthropic
from app.core.config import get_settings
from app.core.supabase import get_supabase, maybe_one

log = logging.getLogger("repurposing")

REMOTION_STUDIO = Path.home() / "projects" / "remotion-studio"
RENDER_OUTPUT = REMOTION_STUDIO / "out" / "clips"

CHEATCODE_ACCENT = "#00AEEF"  # CC Cyan
CHEATCODE_WATERMARK = "@cheatcodeos"

# Scene template mapping for different content types
SCENE_TEMPLATES = {
    "hook": "letter-slam",           # Big dramatic opening
    "stat": "big-statement",         # Single number reveal
    "comparison": "comparison",       # Side-by-side
    "chart": "candlestick-chart",    # Price action
    "levels": "level-watch",         # Support/resistance
    "multi_stat": "stat-grid",       # 2x2 stats
    "fear": "fear-screen",           # Sentiment gauge
    "visual": "visual-scene",        # Custom background
    "cta": "cta",                    # Closing CTA
    "price": "price-hero",           # Ticker + price
}


# ── 1. Clip Extraction — Find the best moments ──────────────────────────────

async def extract_clips(content_id: str) -> list[dict]:
    """Use Claude to find the 3-5 best clippable moments from a video transcript.

    Key: we don't just cut straight through — we MIX timestamps to create
    a compelling narrative arc (hook → context → insight → CTA).
    """
    db = get_supabase()
    s = get_settings()

    content = maybe_one(db.table("content").select("*").eq("id", content_id))
    if not content.data:
        log.warning("Content not found: %s", content_id)
        return []

    c = content.data
    transcript = c.get("transcript", "")
    if not transcript or len(transcript) < 500:
        log.warning("Transcript too short for clips: %s", c["title"][:40])
        return []

    # Get creator name
    creator_name = "Unknown"
    if c.get("creator_id"):
        cr = maybe_one(db.table("creators").select("name").eq("id", c["creator_id"]))
        if cr.data:
            creator_name = cr.data["name"]

    # Get ticker context
    tickers = db.table("content_tickers").select("ticker, sentiment, mention_context").eq("content_id", content_id).execute()
    ticker_ctx = json.dumps(tickers.data or [])

    client = anthropic.Anthropic(api_key=s.anthropic_api_key)

    prompt = f"""You are a viral content strategist for a finance education platform called CheatCode OS.

Analyze this video transcript and create 3-5 SHORT-FORM CLIPS (30-45 seconds each).

CRITICAL RULES:
- Do NOT just cut a 1-minute segment straight through
- INSTEAD, MIX the best moments from different parts of the video into a tight narrative
- Each clip should follow: HOOK (2-3s) → CONTEXT (5-8s) → INSIGHT (15-20s) → CTA (3-5s)
- The hook must be attention-grabbing — a bold claim, shocking stat, or provocative question
- Pull the best quotes/moments from ANYWHERE in the transcript and weave them together
- Each clip should be self-contained — makes sense without watching the full video

VIDEO INFO:
Title: {c['title']}
Creator: {creator_name}
Duration: {c.get('duration_seconds', 0)}s
Topics: {c.get('topics', [])}
Tickers mentioned: {ticker_ctx}
Quick take: {c.get('quick_take', '')}

TRANSCRIPT (first 12000 chars):
{transcript[:12000]}

Return a JSON array of clip objects:
[{{
  "title": "Short punchy title for the clip (< 60 chars)",
  "hook": "The opening line — must stop the scroll (1 sentence, bold claim or question)",
  "script": "Full 30-45 second script mixing the best moments. Write it as spoken narration. Short punchy sentences. Include [PAUSE] markers for dramatic effect.",
  "source_segments": [
    {{"start_approx": 120, "end_approx": 135, "quote": "exact quote from transcript", "purpose": "context"}},
    {{"start_approx": 340, "end_approx": 355, "quote": "another quote", "purpose": "key insight"}},
  ],
  "scenes": [
    {{
      "type": "hook",
      "text": "The opening hook text",
      "duration": 3,
      "visual_suggestion": "letter-slam with shake effect"
    }},
    {{
      "type": "stat|comparison|chart|levels|visual|price",
      "text": "Scene narration",
      "duration": 8,
      "data": {{}},
      "visual_suggestion": "what to show"
    }},
    {{
      "type": "cta",
      "text": "Follow @cheatcodeos for more",
      "duration": 4
    }}
  ],
  "tickers": ["NVDA", "AMD"],
  "caption": "Instagram/TikTok caption with hooks and line breaks (max 300 chars)",
  "hashtags": ["trading", "stockmarket", "investing", "finance"]
}}]

Make clips VIRAL-WORTHY:
- Lead with controversy, surprise, or urgency
- Use specific numbers (not "stocks went up" but "$NVDA up 247% in 9 months")
- Create information gaps ("Most traders miss this one pattern...")
- End with a soft CTA (follow for more, drop a comment)

Return ONLY valid JSON."""

    try:
        resp = client.messages.create(
            model=s.kai_model,
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        clips = json.loads(text)
    except (json.JSONDecodeError, IndexError, Exception) as e:
        log.error("Clip extraction failed for %s: %s", c["title"][:40], e)
        return []

    # Save clips to DB
    saved = []
    for i, clip in enumerate(clips[:5]):
        result = db.table("repurposed_clips").insert({
            "content_id": content_id,
            "clip_index": i,
            "title": clip.get("title", f"Clip {i+1}"),
            "hook": clip.get("hook", ""),
            "script": clip.get("script", ""),
            "scenes": clip.get("scenes", []),
            "source_segments": clip.get("source_segments", []),
            "duration_seconds": sum(s.get("duration", 5) for s in clip.get("scenes", [])),
            "caption": clip.get("caption", ""),
            "hashtags": clip.get("hashtags", []),
            "status": "planned",
        }).execute()
        if result.data:
            saved.append(result.data[0])

    log.info("Extracted %d clips from: %s", len(saved), c["title"][:50])
    return saved


# ── 2. Build StoryReel Props — Convert clip plan to Remotion props ───────────

def build_storyreel_props(clip: dict, voiceover_path: str = None) -> dict:
    """Convert a clip plan into a Remotion StoryReel props.json."""
    scenes = clip.get("scenes", [])
    script = clip.get("script", "")

    storyreel_scenes = []
    current_time = 0.0

    for i, scene in enumerate(scenes):
        scene_type = scene.get("type", "visual")
        duration = scene.get("duration", 5)
        text = scene.get("text", "")
        data = scene.get("data", {})

        # Map to StoryReel template
        template_name = SCENE_TEMPLATES.get(scene_type, "visual-scene")

        # Build template data based on type
        template_data = _build_template_data(scene_type, text, data, clip)

        # Choose transition
        transitions = ["glitch", "wipe-left", "zoom", "fade"]
        transition = transitions[i % len(transitions)] if i > 0 else None

        storyreel_scene = {
            "id": i,
            "start": current_time,
            "end": current_time + duration,
            "caption": text,
            "captionHighlights": _extract_highlights(text),
            "captionPosition": "center" if scene_type == "hook" else "lower",
            "template": {
                "template": template_name,
                "data": template_data,
            },
        }

        if transition:
            storyreel_scene["transition"] = transition
        if scene_type == "hook":
            storyreel_scene["shake"] = True
            storyreel_scene["particles"] = True
            storyreel_scene["colorWash"] = "cyan"
        if scene_type == "stat" or scene_type == "price":
            storyreel_scene["colorWash"] = "green" if "up" in text.lower() or "bull" in text.lower() else "red"

        storyreel_scenes.append(storyreel_scene)
        current_time += duration

    props = {
        "accentColor": CHEATCODE_ACCENT,
        "captionFontSize": 58,
        "showProgressBar": True,
        "progressBarColor": CHEATCODE_ACCENT,
        "scenes": storyreel_scenes,
    }

    if voiceover_path:
        props["voiceoverSrc"] = voiceover_path

    return props


def _build_template_data(scene_type: str, text: str, data: dict, clip: dict) -> dict:
    """Build template-specific data for a StoryReel scene."""
    tickers = clip.get("tickers", [])
    primary_ticker = tickers[0] if tickers else ""

    if scene_type == "hook":
        return {"text": text, "fontSize": 72, "accentColor": CHEATCODE_ACCENT}

    elif scene_type == "stat":
        return {
            "value": data.get("value", ""),
            "prefix": data.get("prefix", ""),
            "suffix": data.get("suffix", "%"),
            "topLabel": data.get("label", ""),
            "bottomLabel": data.get("sublabel", ""),
            "icon": data.get("icon", "trending-up"),
        }

    elif scene_type == "price":
        return {
            "ticker": data.get("ticker", primary_ticker),
            "price": data.get("price", ""),
            "change": data.get("change", ""),
            "changePercent": data.get("change_pct", ""),
            "subtitle": data.get("subtitle", text[:50]),
        }

    elif scene_type == "comparison":
        return {
            "title": data.get("title", ""),
            "left": data.get("left", {"label": "Before", "value": ""}),
            "right": data.get("right", {"label": "After", "value": ""}),
        }

    elif scene_type == "chart":
        return {
            "ticker": data.get("ticker", primary_ticker),
            "candles": data.get("candles", []),
            "levels": data.get("levels", []),
        }

    elif scene_type == "levels":
        return {
            "title": data.get("title", f"{primary_ticker} Key Levels"),
            "levels": data.get("levels", []),
        }

    elif scene_type == "multi_stat":
        return {
            "title": data.get("title", "By The Numbers"),
            "stats": data.get("stats", []),
        }

    elif scene_type == "fear":
        return {
            "headline": data.get("headline", text[:40]),
            "gauge": data.get("gauge", 50),
        }

    elif scene_type == "cta":
        return {
            "headline": "Follow for more",
            "subheadline": CHEATCODE_WATERMARK,
            "takeaways": data.get("takeaways", [text[:60]]),
            "followText": f"Follow {CHEATCODE_WATERMARK}",
        }

    # Default: visual-scene
    return {
        "visual": {"type": "gradient", "colors": ["#0a0f1a", "#1a2035"]},
        "elements": [],
    }


def _extract_highlights(text: str) -> list[str]:
    """Extract words worth highlighting in captions."""
    # Highlight tickers, numbers, strong words
    highlights = []
    for word in text.split():
        clean = re.sub(r'[^\w$%]', '', word)
        if re.match(r'^\$?[A-Z]{2,5}$', clean):  # Tickers
            highlights.append(clean)
        elif re.match(r'^\d+[%x]?$', clean):  # Numbers
            highlights.append(clean)
        elif clean.lower() in {"never", "always", "most", "biggest", "worst", "best", "secret", "mistake", "exactly", "insane"}:
            highlights.append(clean)
    return highlights[:5]


# ── 3. Generate Voiceover ────────────────────────────────────────────────────

async def generate_clip_voiceover(clip_id: str, script: str) -> str | None:
    """Generate voiceover via Voicebox (Chatterbox TTS)."""
    import httpx

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "http://localhost:8000/generate",
                json={
                    "profile_id": "2cd42fda-3482-4eb4-a79a-6abc64802e24",  # Kway voice
                    "text": script.replace("[PAUSE]", "..."),
                    "language": "en",
                },
                timeout=60,
            )
            if resp.status_code != 200:
                log.warning("Voicebox failed: %s", resp.text[:200])
                return None

            data = resp.json()
            gen_id = data.get("id") or data.get("generation_id")
            if not gen_id:
                return None

            # Download audio
            audio_resp = await client.get(f"http://localhost:8000/audio/{gen_id}", timeout=30)
            if audio_resp.status_code != 200:
                return None

            # Save to Remotion public dir
            output_dir = REMOTION_STUDIO / "public" / f"clip-{clip_id}"
            output_dir.mkdir(parents=True, exist_ok=True)
            audio_path = output_dir / "voiceover.wav"
            audio_path.write_bytes(audio_resp.content)

            # Convert to mp3
            mp3_path = output_dir / "voiceover.mp3"
            subprocess.run(
                ["ffmpeg", "-i", str(audio_path), "-codec:a", "libmp3lame", "-qscale:a", "2", str(mp3_path), "-y"],
                capture_output=True, timeout=30,
            )

            return f"clip-{clip_id}/voiceover.mp3"

    except Exception as e:
        log.warning("Voiceover generation failed: %s", e)
        return None


# ── 4. Render Clip via Remotion ──────────────────────────────────────────────

async def render_clip(clip_id: str) -> str | None:
    """Render a clip using Remotion CLI."""
    db = get_supabase()
    clip = maybe_one(db.table("repurposed_clips").select("*").eq("id", clip_id))
    if not clip.data:
        return None

    c = clip.data
    db.table("repurposed_clips").update({"status": "rendering"}).eq("id", clip_id).execute()

    # Generate voiceover
    voiceover_path = await generate_clip_voiceover(clip_id, c["script"])

    # Build props
    props = build_storyreel_props(c, voiceover_path)

    # Write props to Remotion public dir
    props_dir = REMOTION_STUDIO / "public" / f"clip-{clip_id}"
    props_dir.mkdir(parents=True, exist_ok=True)
    props_file = props_dir / "props.json"
    props_file.write_text(json.dumps(props, indent=2))

    # Calculate duration in frames (30fps)
    total_duration = sum(s.get("duration", 5) for s in c.get("scenes", []))
    total_frames = int(total_duration * 30)

    # Render
    RENDER_OUTPUT.mkdir(parents=True, exist_ok=True)
    output_file = RENDER_OUTPUT / f"clip-{clip_id}.mp4"

    try:
        result = subprocess.run(
            [
                "npx", "remotion", "render",
                "StoryReel",
                str(output_file),
                "--props", str(props_file),
                "--frames", f"0-{total_frames}",
                "--codec", "h264",
                "--crf", "18",
            ],
            cwd=str(REMOTION_STUDIO),
            capture_output=True, text=True, timeout=300,
        )

        if result.returncode != 0:
            log.error("Render failed for clip %s: %s", clip_id, result.stderr[:500])
            db.table("repurposed_clips").update({"status": "failed"}).eq("id", clip_id).execute()
            return None

        db.table("repurposed_clips").update({
            "status": "rendered",
            "render_path": str(output_file),
            "props": props,
            "rendered_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", clip_id).execute()

        log.info("Rendered clip: %s → %s", c["title"][:40], output_file)
        return str(output_file)

    except subprocess.TimeoutExpired:
        log.error("Render timed out for clip %s", clip_id)
        db.table("repurposed_clips").update({"status": "failed"}).eq("id", clip_id).execute()
        return None


# ── 5. Social Posting (token-ready, plug in when accounts created) ───────────

async def post_clip(clip_id: str, platforms: list[str] = None) -> dict:
    """Post a rendered clip to social platforms.
    Platforms: instagram, tiktok, youtube, twitter
    """
    db = get_supabase()
    clip = maybe_one(db.table("repurposed_clips").select("*").eq("id", clip_id))
    if not clip.data or clip.data["status"] != "rendered":
        return {"error": "Clip not rendered"}

    c = clip.data
    platforms = platforms or ["instagram", "tiktok", "youtube", "twitter"]
    results = {}

    caption = c.get("caption", "")
    hashtags = " ".join(f"#{h}" for h in c.get("hashtags", []))
    full_caption = f"{caption}\n\n{hashtags}\n\n{CHEATCODE_WATERMARK}"
    render_path = c.get("render_path", "")

    for platform in platforms:
        try:
            if platform == "youtube":
                result = await _post_youtube_short(render_path, c["title"], full_caption)
            elif platform == "instagram":
                result = await _post_instagram_reel(render_path, full_caption)
            elif platform == "tiktok":
                result = await _post_tiktok(render_path, full_caption)
            elif platform == "twitter":
                result = await _post_twitter(render_path, full_caption)
            else:
                result = {"status": "skipped", "reason": f"Unknown platform: {platform}"}
            results[platform] = result
        except Exception as e:
            results[platform] = {"status": "error", "error": str(e)}

    # Update clip status
    posted_to = c.get("posted_to", {})
    posted_to.update(results)
    db.table("repurposed_clips").update({
        "status": "posted",
        "posted_to": posted_to,
        "posted_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", clip_id).execute()

    return results


async def _post_youtube_short(video_path: str, title: str, description: str) -> dict:
    """Post to YouTube Shorts via YouTube Data API."""
    # TODO: Implement with YouTube resumable upload API
    # Requires: youtube.upload scope OAuth token
    log.info("YouTube Shorts posting ready — needs OAuth token")
    return {"status": "pending_auth", "platform": "youtube"}


async def _post_instagram_reel(video_path: str, caption: str) -> dict:
    """Post to Instagram Reels via Graph API."""
    # TODO: Implement with Instagram Graph API
    # Requires: instagram_content_publish permission
    log.info("Instagram Reels posting ready — needs Graph API token")
    return {"status": "pending_auth", "platform": "instagram"}


async def _post_tiktok(video_path: str, caption: str) -> dict:
    """Post to TikTok via TikTok API for Business."""
    # TODO: Implement with TikTok Content Posting API
    # Requires: video.upload scope
    log.info("TikTok posting ready — needs API token")
    return {"status": "pending_auth", "platform": "tiktok"}


async def _post_twitter(video_path: str, caption: str) -> dict:
    """Post to Twitter/X via v2 API."""
    # TODO: Implement with X API v2 media upload + tweet
    # Requires: OAuth 2.0 with tweet.write + media.upload
    log.info("Twitter/X posting ready — needs API token")
    return {"status": "pending_auth", "platform": "twitter"}


# ── FULL PIPELINE ────────────────────────────────────────────────────────────

async def repurpose_content(content_id: str, auto_render: bool = True, auto_post: bool = False) -> dict:
    """Full repurposing pipeline for a single piece of content."""
    # 1. Extract clips
    clips = await extract_clips(content_id)
    if not clips:
        return {"error": "No clips extracted", "content_id": content_id}

    results = {"content_id": content_id, "clips": []}

    for clip in clips:
        clip_result = {"id": clip["id"], "title": clip["title"], "status": "planned"}

        # 2. Render
        if auto_render:
            render_path = await render_clip(clip["id"])
            clip_result["status"] = "rendered" if render_path else "render_failed"
            clip_result["render_path"] = render_path

            # 3. Post
            if auto_post and render_path:
                post_results = await post_clip(clip["id"])
                clip_result["posted_to"] = post_results
                clip_result["status"] = "posted"

        results["clips"].append(clip_result)

    return results


async def repurpose_all_pending(auto_render: bool = True):
    """Repurpose all published content that hasn't been clipped yet."""
    db = get_supabase()

    # Find content with no clips
    all_content = db.table("content").select("id, title").eq("is_published", True).execute()
    clipped = db.table("repurposed_clips").select("content_id").execute()
    clipped_ids = {c["content_id"] for c in (clipped.data or [])}

    pending = [c for c in (all_content.data or []) if c["id"] not in clipped_ids]

    results = []
    for c in pending:
        try:
            result = await repurpose_content(c["id"], auto_render=auto_render, auto_post=False)
            results.append(result)
        except Exception as e:
            log.error("Repurposing failed for %s: %s", c["title"][:40], e)

    return {"processed": len(results), "results": results}
