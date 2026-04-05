"""Live Clip Pipeline — download actual YouTube segments, add branding + captions.

Pipeline:
1. Claude identifies best 30-45s segments from transcript with exact timestamps
2. yt-dlp downloads those specific segments from the YouTube video
3. ffmpeg adds: CheatCode watermark, kinetic captions, progress bar, branded intro/outro
4. Output: branded clip ready for posting
"""

import json
import logging
import subprocess
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import anthropic
from app.core.config import get_settings
from app.core.supabase import get_supabase, maybe_one

log = logging.getLogger("live_clipper")

OUTPUT_DIR = Path.home() / "projects" / "cheatcode-os" / "clips"
FONT_PATH = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
WATERMARK_TEXT = "@cheatcodeos"
BRAND_COLOR = "#00AEEF"


# ── 1. Find best segments ────────────────────────────────────────────────────

async def find_clip_segments(content_id: str) -> list[dict]:
    """Claude finds the best 3-5 self-contained segments to clip directly."""
    db = get_supabase()
    s = get_settings()

    content = maybe_one(db.table("content").select("*").eq("id", content_id))
    if not content.data:
        return []

    c = content.data
    transcript = c.get("transcript", "")
    if not transcript or len(transcript) < 500:
        return []

    # Get creator
    creator_name = "Unknown"
    if c.get("creator_id"):
        cr = maybe_one(db.table("creators").select("name").eq("id", c["creator_id"]))
        if cr.data:
            creator_name = cr.data["name"]

    duration = c.get("duration_seconds", 0)

    client = anthropic.Anthropic(api_key=s.anthropic_api_key)

    prompt = f"""You are a viral clip editor for CheatCode OS, a finance education platform.

Analyze this video transcript and find the 3-5 BEST moments to clip DIRECTLY from the video.

RULES:
- Each clip should be 30-60 seconds of CONTINUOUS footage (we're cutting the actual video)
- Find moments where the creator says something powerful, insightful, or provocative
- The segment must make sense on its own without the rest of the video
- Prioritize: bold claims, specific numbers, actionable advice, emotional moments, controversial takes
- Give PRECISE timestamp ranges (start_seconds, end_seconds)
- The transcript has roughly 1 word per 0.4 seconds — use this to estimate timestamps

VIDEO:
Title: {c['title']}
Creator: {creator_name}
Total duration: {duration}s
Topics: {c.get('topics', [])}

TRANSCRIPT (with approximate timing — every ~250 words ≈ 100 seconds):
{transcript[:15000]}

Return a JSON array:
[{{
  "title": "Short clip title for social media",
  "start_seconds": 120,
  "end_seconds": 165,
  "duration": 45,
  "quote": "The key quote from this segment (exact words from transcript)",
  "why_viral": "Why this clip will perform well on social",
  "caption": "Social media caption (under 200 chars, include line breaks)",
  "hashtags": ["trading", "finance"],
  "caption_overlay": "Short text to overlay on video (under 60 chars, the hook)"
}}]

Return ONLY valid JSON."""

    try:
        resp = client.messages.create(
            model=s.kai_model,
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        segments = json.loads(text)
    except (json.JSONDecodeError, Exception) as e:
        log.error("Segment extraction failed: %s", e)
        return []

    # Save to DB
    saved = []
    for i, seg in enumerate(segments[:5]):
        result = db.table("repurposed_clips").insert({
            "content_id": content_id,
            "clip_index": i + 100,  # 100+ = live clips (vs 0-9 = story reels)
            "title": seg.get("title", f"Live Clip {i+1}"),
            "hook": seg.get("caption_overlay", ""),
            "script": seg.get("quote", ""),
            "scenes": [],
            "source_segments": [{
                "start": seg["start_seconds"],
                "end": seg["end_seconds"],
                "quote": seg.get("quote", ""),
            }],
            "duration_seconds": seg.get("duration", seg["end_seconds"] - seg["start_seconds"]),
            "caption": seg.get("caption", ""),
            "hashtags": seg.get("hashtags", []),
            "status": "planned",
        }).execute()
        if result.data:
            clip_data = result.data[0]
            clip_data["_meta"] = seg  # carry forward for rendering
            saved.append(clip_data)

    log.info("Found %d live clip segments from: %s", len(saved), c["title"][:50])
    return saved


# ── 2. Download + Brand clip ─────────────────────────────────────────────────

async def render_live_clip(clip_id: str) -> str | None:
    """Download YouTube segment and add CheatCode branding."""
    db = get_supabase()
    clip = maybe_one(db.table("repurposed_clips").select("*, content(external_url, title)").eq("id", clip_id))
    if not clip.data:
        return None

    c = clip.data
    content_data = c.get("content", {}) or {}
    youtube_url = content_data.get("external_url", "")
    if not youtube_url:
        log.error("No YouTube URL for clip %s", clip_id)
        return None

    segments = c.get("source_segments", [])
    if not segments:
        return None

    seg = segments[0]
    start = seg["start"]
    end = seg["end"]
    caption_text = c.get("hook", "") or c.get("title", "")

    db.table("repurposed_clips").update({"status": "rendering"}).eq("id", clip_id).execute()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    try:
        # Step 1: Download segment via yt-dlp
        raw_file = OUTPUT_DIR / f"raw-{clip_id}.mp4"
        log.info("Downloading %s [%d-%d]...", youtube_url, start, end)

        dl_result = subprocess.run([
            "yt-dlp",
            "--download-sections", f"*{start}-{end}",
            "-f", "bestvideo[height<=1080]+bestaudio/best[height<=1080]",
            "--merge-output-format", "mp4",
            "-o", str(raw_file),
            "--force-keyframes-at-cuts",
            youtube_url,
        ], capture_output=True, text=True, timeout=120)

        if dl_result.returncode != 0 or not raw_file.exists():
            log.error("yt-dlp failed: %s", dl_result.stderr[:300])
            db.table("repurposed_clips").update({"status": "failed"}).eq("id", clip_id).execute()
            return None

        # Step 2: Smart crop — face detection + 9:16 crop centered on speaker
        output_file = OUTPUT_DIR / f"clip-{clip_id}.mp4"

        from app.services.smart_crop import smart_crop_video
        log.info("Running smart crop (face detection)...")
        success = smart_crop_video(str(raw_file), str(output_file))

        if not success or not output_file.exists():
            log.error("Smart crop failed, falling back to center crop")
            # Fallback: simple center crop
            ff_result = subprocess.run([
                "ffmpeg", "-i", str(raw_file),
                "-vf", "crop=ih*9/16:ih,scale=1080:1920:flags=lanczos",
                "-c:v", "libx264", "-crf", "20", "-preset", "fast",
                "-c:a", "aac", "-b:a", "128k",
                "-movflags", "+faststart", "-y", str(output_file),
            ], capture_output=True, text=True, timeout=120)

            if ff_result.returncode != 0 or not output_file.exists():
                log.error("Fallback crop also failed")
                db.table("repurposed_clips").update({"status": "failed"}).eq("id", clip_id).execute()
                raw_file.unlink(missing_ok=True)
                return None

        # Cleanup raw file
        raw_file.unlink(missing_ok=True)

        # Update DB
        file_size = output_file.stat().st_size
        db.table("repurposed_clips").update({
            "status": "rendered",
            "render_path": str(output_file),
            "rendered_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", clip_id).execute()

        log.info("Live clip rendered: %s (%.1fMB)", output_file.name, file_size / 1024 / 1024)
        return str(output_file)

    except subprocess.TimeoutExpired:
        log.error("Render timed out for clip %s", clip_id)
        db.table("repurposed_clips").update({"status": "failed"}).eq("id", clip_id).execute()
        return None
    except Exception as e:
        log.error("Live clip render failed: %s", e)
        db.table("repurposed_clips").update({"status": "failed"}).eq("id", clip_id).execute()
        return None


# ── Full Pipeline ────────────────────────────────────────────────────────────

async def clip_content(content_id: str, auto_render: bool = True) -> dict:
    """Full live clip pipeline for a single video."""
    segments = await find_clip_segments(content_id)
    if not segments:
        return {"error": "No segments found", "content_id": content_id}

    results = {"content_id": content_id, "clips": []}

    for seg in segments:
        clip_result = {"id": seg["id"], "title": seg["title"], "status": "planned"}

        if auto_render:
            path = await render_live_clip(seg["id"])
            clip_result["status"] = "rendered" if path else "failed"
            clip_result["render_path"] = path

        results["clips"].append(clip_result)

    return results
