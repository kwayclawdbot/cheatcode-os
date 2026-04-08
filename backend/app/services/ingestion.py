"""Ingestion Engine — curated content → vault notes + KB chunks + connections."""

import json
import logging
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import anthropic
from app.core.config import get_settings
from app.core.supabase import get_supabase, maybe_one
from app.services.curation import generate_embedding

log = logging.getLogger("ingestion")

VAULT_ROOT = Path.home() / ".openclaw" / "vault"
CHEATCODE_KB = VAULT_ROOT / "06 - Knowledge Base" / "CheatCode OS"
FRAMEWORK_DIR = CHEATCODE_KB / "Frameworks"
TICKER_DIR = CHEATCODE_KB / "Tickers"
THEME_DIR = CHEATCODE_KB / "Themes"
CREATOR_DIR = CHEATCODE_KB / "Creators"


def _slugify(text: str) -> str:
    """Convert text to filesystem-safe slug."""
    text = re.sub(r'[^\w\s-]', '', text.strip())
    return re.sub(r'[-\s]+', '-', text)[:80]


def _ensure_dirs():
    for d in [CHEATCODE_KB, FRAMEWORK_DIR, TICKER_DIR, THEME_DIR, CREATOR_DIR]:
        d.mkdir(parents=True, exist_ok=True)


# ── 1. Master Vault Note ────────────────────────────────────────────────────

def create_video_vault_note(content: dict, creator_name: str, tickers: list[dict], themes: list[str]) -> Path:
    """Create the master vault note for a curated video."""
    _ensure_dirs()

    title = content["title"]
    safe_title = _slugify(title)
    creator_slug = _slugify(creator_name)

    # Build wikilinks
    ticker_links = [f"[[{t['ticker']}]]" for t in tickers]
    theme_links = [f"[[{t}]]" for t in themes]
    creator_link = f"[[{creator_name}]]"

    # Build related frameworks placeholder (filled after extraction)
    insights = content.get("key_insights") or []
    insight_bullets = "\n".join(f"- {i.get('insight', '')}" for i in insights[:6])

    timestamps = content.get("timestamps") or []
    timestamp_lines = "\n".join(
        f"- **{int(t.get('seconds', 0)) // 60}:{int(t.get('seconds', 0)) % 60:02d}** — {t.get('label', '')}"
        for t in timestamps
    )

    ticker_sections = ""
    for t in tickers:
        sentiment_badge = {"bullish": "🟢", "bearish": "🔴", "neutral": "⚪", "mixed": "🟡"}.get(t.get("sentiment", ""), "")
        ticker_sections += f"\n### {sentiment_badge} {t['ticker']}\n{t.get('mention_context', 'Mentioned in video.')}\n"

    duration_min = (content.get("duration_seconds") or 0) // 60

    note = f"""---
title: "{title}"
type: reference
tags: [cheatcode-os, curated-video, {', '.join(content.get('topics', [])[:5])}]
created: {datetime.now().strftime('%Y-%m-%d')}
updated: {datetime.now().strftime('%Y-%m-%d')}
status: active
source: youtube
creator: {creator_name}
duration: {duration_min}min
external_url: {content.get('external_url', '')}
links: [{creator_link}, {', '.join(ticker_links)}, {', '.join(theme_links)}]
---

# {title}

> **Creator:** {creator_link} · **Duration:** {duration_min} min · **Type:** {content.get('content_type', 'video')}
> **Source:** [{content.get('external_url', '')}]({content.get('external_url', '')})

## Quick Take

{content.get('quick_take', '')}

## Key Insights

{insight_bullets}

## Tickers Mentioned

{ticker_sections}

## Themes

{', '.join(theme_links) if theme_links else 'No specific themes tagged.'}

## Timestamps

{timestamp_lines if timestamp_lines else 'No timestamps available.'}

## Extracted Frameworks

_Frameworks extracted from this video will be linked here._

## Related Content

_Auto-populated by vault connections._

---
*Curated by CheatCode OS on {datetime.now().strftime('%Y-%m-%d')}*
"""

    # Save to creator subfolder
    creator_dir = CHEATCODE_KB / creator_slug
    creator_dir.mkdir(parents=True, exist_ok=True)
    filepath = creator_dir / f"{safe_title}.md"
    filepath.write_text(note)
    log.info("Vault note created: %s", filepath)
    return filepath


# ── 2. Framework Extraction ──────────────────────────────────────────────────

async def extract_frameworks(content: dict, video_note_title: str) -> list[Path]:
    """Extract teachable frameworks from transcript and save as vault notes."""
    transcript = content.get("transcript", "")
    if not transcript or len(transcript) < 500:
        return []

    s = get_settings()
    client = anthropic.Anthropic(api_key=s.anthropic_api_key)

    prompt = f"""Analyze this finance video transcript and extract ALL teachable frameworks, strategies, or mental models.

Title: {content['title']}
Creator: {content.get('_creator_name', 'Unknown')}

Transcript (first 10000 chars):
{transcript[:10000]}

For each framework found, return a JSON array of objects:
[{{
  "title": "Framework name (use creator's name if given, e.g. 'Minervini VCP Setup')",
  "type": "process|model|principle|tactic|template|formula|checklist|strategy|mindset",
  "tags": ["trading", "technical_analysis"],
  "steps": ["Step 1...", "Step 2..."],
  "key_rules": ["Rule 1...", "Rule 2..."],
  "example": "Brief real example from the video if given",
  "warning": "Common mistake or pitfall mentioned"
}}]

Only extract REAL frameworks with actionable steps — not generic summaries.
If no clear frameworks exist, return an empty array [].
Return ONLY valid JSON."""

    try:
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        frameworks = json.loads(text)
    except (json.JSONDecodeError, IndexError, Exception) as e:
        log.warning("Framework extraction failed for %s: %s", content["title"][:40], e)
        return []

    if not frameworks:
        return []

    _ensure_dirs()
    paths = []
    framework_links = []

    for fw in frameworks[:5]:  # Max 5 per video
        fw_title = fw.get("title", "Unnamed Framework")
        safe_name = _slugify(fw_title)
        fw_tags = fw.get("tags", [])

        steps = "\n".join(f"{i+1}. {s}" for i, s in enumerate(fw.get("steps", [])))
        rules = "\n".join(f"- {r}" for r in fw.get("key_rules", []))

        note = f"""---
title: "{fw_title}"
type: framework
tags: [cheatcode-os, framework, {', '.join(fw_tags[:5])}]
created: {datetime.now().strftime('%Y-%m-%d')}
updated: {datetime.now().strftime('%Y-%m-%d')}
status: active
source_video: "[[{video_note_title}]]"
framework_type: {fw.get('type', 'strategy')}
links: [[[{video_note_title}]]]
---

# {fw_title}

> Extracted from [[{video_note_title}]]

## Type
{fw.get('type', 'strategy').capitalize()}

## Steps

{steps if steps else '_No specific steps outlined._'}

## Key Rules

{rules if rules else '_No specific rules outlined._'}

## Example

{fw.get('example', '_No specific example given._')}

## Warning

{fw.get('warning', '_No specific warnings._')}

---
*Extracted by CheatCode OS Ingestion Engine*
"""

        filepath = FRAMEWORK_DIR / f"{safe_name}.md"
        filepath.write_text(note)
        paths.append(filepath)
        framework_links.append(f"[[{fw_title}]]")
        log.info("Framework extracted: %s", fw_title)

    # Backlink: update the video vault note with framework links
    if framework_links:
        _append_framework_links(video_note_title, framework_links)

    return paths


def _append_framework_links(video_note_title: str, framework_links: list[str]):
    """Replace the framework placeholder in the video note with actual links."""
    safe_title = _slugify(video_note_title)
    # Search for the file
    for f in CHEATCODE_KB.rglob(f"{safe_title}.md"):
        text = f.read_text()
        replacement = "\n".join(f"- {link}" for link in framework_links)
        text = text.replace(
            "_Frameworks extracted from this video will be linked here._",
            replacement,
        )
        f.write_text(text)
        break


# ── 3. Ticker Notes ──────────────────────────────────────────────────────────

def update_ticker_notes(tickers: list[dict], video_title: str, creator_name: str, quick_take: str):
    """Create/update per-ticker vault notes with video mention."""
    _ensure_dirs()

    for t in tickers:
        symbol = t["ticker"]
        filepath = TICKER_DIR / f"{symbol}.md"
        date_str = datetime.now().strftime("%Y-%m-%d")
        sentiment = t.get("sentiment", "neutral")
        context = t.get("mention_context", "Mentioned in video.")
        sentiment_emoji = {"bullish": "🟢", "bearish": "🔴", "neutral": "⚪", "mixed": "🟡"}.get(sentiment, "")

        entry = f"""
### {sentiment_emoji} [[{video_title}]] ({date_str})
**Creator:** [[{creator_name}]] · **Sentiment:** {sentiment}
{context}

"""

        if filepath.exists():
            # Append new mention
            existing = filepath.read_text()
            # Insert before the closing --- if present, or just append
            if "\n## Recent Mentions" in existing:
                existing = existing.replace(
                    "\n## Recent Mentions\n",
                    f"\n## Recent Mentions\n{entry}",
                )
            else:
                existing += f"\n## Recent Mentions\n{entry}"
            filepath.write_text(existing)
        else:
            # Create new ticker note
            note = f"""---
title: "{symbol}"
type: reference
tags: [cheatcode-os, ticker, {symbol.lower()}]
created: {date_str}
updated: {date_str}
status: active
links: []
---

# {symbol}

Ticker tracking note. Updated automatically by CheatCode OS ingestion.

## Recent Mentions
{entry}
"""
            filepath.write_text(note)

        log.info("Ticker note updated: %s", symbol)


# ── 4. Theme Notes ───────────────────────────────────────────────────────────

def update_theme_notes(themes: list[str], video_title: str, creator_name: str):
    """Create/update per-theme vault notes with video reference."""
    _ensure_dirs()

    for theme in themes:
        safe_theme = _slugify(theme)
        filepath = THEME_DIR / f"{safe_theme}.md"
        date_str = datetime.now().strftime("%Y-%m-%d")
        display_name = theme.replace("_", " ").title()

        entry = f"- [[{video_title}]] by [[{creator_name}]] ({date_str})\n"

        if filepath.exists():
            existing = filepath.read_text()
            if "\n## Content Coverage\n" in existing:
                existing = existing.replace(
                    "\n## Content Coverage\n",
                    f"\n## Content Coverage\n{entry}",
                )
            else:
                existing += f"\n## Content Coverage\n{entry}"

            # Update the updated date in frontmatter
            existing = re.sub(r'updated: \d{4}-\d{2}-\d{2}', f'updated: {date_str}', existing)
            filepath.write_text(existing)
        else:
            note = f"""---
title: "{display_name}"
type: reference
tags: [cheatcode-os, theme, {theme.replace('_', '-')}]
created: {date_str}
updated: {date_str}
status: active
links: []
---

# {display_name}

Market theme tracked by CheatCode OS.

## Content Coverage
{entry}
## Analysis

_Updated as more content is curated on this theme._
"""
            filepath.write_text(note)

        log.info("Theme note updated: %s", display_name)


# ── 5. Creator Notes ─────────────────────────────────────────────────────────

def update_creator_note(creator_name: str, creator_slug: str, video_title: str, topics: list[str]):
    """Create/update per-creator vault note."""
    _ensure_dirs()

    filepath = CREATOR_DIR / f"{_slugify(creator_name)}.md"
    date_str = datetime.now().strftime("%Y-%m-%d")

    entry = f"- [[{video_title}]] ({date_str})\n"

    if filepath.exists():
        existing = filepath.read_text()
        if "\n## Curated Videos\n" in existing:
            existing = existing.replace(
                "\n## Curated Videos\n",
                f"\n## Curated Videos\n{entry}",
            )
        else:
            existing += f"\n## Curated Videos\n{entry}"
        existing = re.sub(r'updated: \d{4}-\d{2}-\d{2}', f'updated: {date_str}', existing)
        filepath.write_text(existing)
    else:
        topic_tags = ", ".join(topics[:5])
        note = f"""---
title: "{creator_name}"
type: reference
tags: [cheatcode-os, creator, {topic_tags}]
created: {date_str}
updated: {date_str}
status: active
links: []
---

# {creator_name}

Finance content creator curated by CheatCode OS.

## Curated Videos
{entry}
## Topics

{', '.join(f'`{t}`' for t in topics) if topics else '_No topics tagged yet._'}

## Notes

_Observations about this creator's style, quality, and focus areas._
"""
        filepath.write_text(note)

    log.info("Creator note updated: %s", creator_name)


# ── 6. KB Chunking + Embedding ──────────────────────────────────────────────

async def chunk_and_embed(content_id: str, title: str, transcript: str, quick_take: str, topics: list[str]):
    """Split transcript into chunks, embed each, store in kb_chunks table."""
    if not transcript or len(transcript) < 200:
        return 0

    db = get_supabase()

    # Check if already chunked
    existing = db.table("kb_chunks").select("id", count="exact").eq("content_id", content_id).execute()
    if existing.count and existing.count > 0:
        return 0

    # Split into ~500-word chunks with 50-word overlap
    words = transcript.split()
    chunk_size = 500
    overlap = 50
    chunks = []
    i = 0
    while i < len(words):
        chunk_words = words[i:i + chunk_size]
        chunk_text = " ".join(chunk_words)
        chunks.append(chunk_text)
        i += chunk_size - overlap

    # Embed and store each chunk
    topic_str = ", ".join(topics[:5])
    stored = 0
    for idx, chunk_text in enumerate(chunks):
        # Contextual prefix for better embeddings
        embed_input = f"[Video: {title} | Topics: {topic_str}]\n\n{chunk_text}"

        try:
            embedding = await generate_embedding(embed_input)
        except Exception as e:
            log.warning("Embedding failed for chunk %d of %s: %s", idx, content_id[:8], e)
            continue

        # Extract keywords from chunk
        keywords = _extract_keywords(chunk_text)

        db.table("kb_chunks").insert({
            "content_id": content_id,
            "chunk_index": idx,
            "text": chunk_text,
            "section": f"chunk_{idx}",
            "keywords": keywords,
            "embedding_text": embed_input[:500],
            "embedding": embedding,
        }).execute()
        stored += 1

    log.info("Chunked %s: %d chunks stored", title[:40], stored)
    return stored


def _extract_keywords(text: str, max_keywords: int = 10) -> list[str]:
    """Extract simple keywords from text."""
    # Common finance terms to prioritize
    finance_terms = {
        "bullish", "bearish", "breakout", "resistance", "support", "volume",
        "momentum", "trend", "reversal", "consolidation", "accumulation",
        "distribution", "volatility", "earnings", "revenue", "margin",
        "growth", "value", "dividend", "options", "calls", "puts",
        "spread", "premium", "strike", "expiration", "hedge",
        "portfolio", "allocation", "risk", "reward", "drawdown",
    }

    words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
    # Count frequency
    freq = {}
    for w in words:
        if w in finance_terms or len(w) > 5:
            freq[w] = freq.get(w, 0) + 1

    # Sort by frequency, return top N
    sorted_words = sorted(freq.items(), key=lambda x: -x[1])
    return [w for w, _ in sorted_words[:max_keywords]]


# ── 7. Reindex Vault ────────────────────────────────────────────────────────

def reindex_vault():
    """Trigger FTS5 reindex via vault_brain.py."""
    vault_brain = Path.home() / ".openclaw" / "vault_brain.py"
    if vault_brain.exists():
        try:
            result = subprocess.run(
                ["python3", str(vault_brain), "index"],
                capture_output=True, text=True, timeout=30,
            )
            log.info("Vault reindexed: %s", result.stdout.strip()[:100])
        except Exception as e:
            log.warning("Vault reindex failed: %s", e)


# ── FULL INGESTION PIPELINE ─────────────────────────────────────────────────

async def ingest_content(content_id: str):
    """Run the full ingestion pipeline for a single piece of curated content.

    Lifecycle: pending → in_progress → succeeded | failed
    On failure, the row gets ingestion_error + incremented ingestion_attempts
    so orphans are visible in the admin dashboard and can be retried (up to 5)
    by ingest_all_pending.
    """
    db = get_supabase()

    # Fetch content + tickers
    content_row = maybe_one(db.table("content").select("*").eq("id", content_id))
    if not content_row.data:
        log.warning("Content not found: %s", content_id)
        return

    content = content_row.data

    # Idempotency: if already succeeded, don't reprocess
    if content.get("ingestion_status") == "succeeded":
        return

    # Mark in_progress + increment attempts
    current_attempts = content.get("ingestion_attempts") or 0
    db.table("content").update({
        "ingestion_status": "in_progress",
        "ingestion_attempts": current_attempts + 1,
    }).eq("id", content_id).execute()

    try:
        tickers_result = db.table("content_tickers").select("*").eq("content_id", content_id).execute()
        tickers = tickers_result.data or []

        # Get creator name
        creator_name = "Unknown"
        creator_slug = "unknown"
        if content.get("creator_id"):
            creator_row = maybe_one(db.table("creators").select("name, slug").eq("id", content["creator_id"]))
            if creator_row.data:
                creator_name = creator_row.data["name"]
                creator_slug = creator_row.data["slug"]

        themes = content.get("themes", [])
        topics = content.get("topics", [])
        title = content["title"]

        log.info("Ingesting: %s by %s (attempt %d)", title[:50], creator_name, current_attempts + 1)

        # 1. Create master vault note
        video_note_path = create_video_vault_note(content, creator_name, tickers, themes)

        # 2. Extract frameworks from transcript
        content["_creator_name"] = creator_name
        framework_paths = await extract_frameworks(content, title)

        # 3. Update ticker notes with backlinks
        update_ticker_notes(tickers, title, creator_name, content.get("quick_take", ""))

        # 4. Update theme notes with backlinks
        update_theme_notes(themes, title, creator_name)

        # 5. Update creator note
        update_creator_note(creator_name, creator_slug, title, topics)

        # 6. Chunk transcript and embed for granular KB search
        chunks_stored = await chunk_and_embed(
            content_id, title,
            content.get("transcript", ""),
            content.get("quick_take", ""),
            topics,
        )

        # 7. Reindex vault FTS5
        reindex_vault()

        # Mark as succeeded
        db.table("content").update({
            "ingestion_status": "succeeded",
            "ingestion_error": None,
            "ingested_at": datetime.now(timezone.utc).isoformat(),
            # Keep legacy "ingested" tag for any downstream consumers still reading tags
            "tags": list(set((content.get("tags") or []) + ["ingested"])),
        }).eq("id", content_id).execute()

        log.info("Ingestion complete for %s: vault_note=%s, frameworks=%d, chunks=%d",
                 title[:40], video_note_path.name, len(framework_paths), chunks_stored)

        return {
            "vault_note": str(video_note_path),
            "frameworks": len(framework_paths),
            "chunks": chunks_stored,
            "tickers_updated": len(tickers),
            "themes_updated": len(themes),
        }

    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)[:500]}"
        log.error("Ingestion failed for %s: %s", content_id, error_msg, exc_info=True)
        db.table("content").update({
            "ingestion_status": "failed",
            "ingestion_error": error_msg,
        }).eq("id", content_id).execute()
        # Re-raise so callers (like process_video) can observe the failure,
        # but the DB state is now accurate either way.
        raise


async def ingest_all_pending(max_attempts: int = 5):
    """Ingest all content that hasn't succeeded yet.

    Picks up:
    - Rows with ingestion_status='pending' (never attempted)
    - Rows with ingestion_status='failed' below the attempt cap (retry)

    Bounded by max_attempts (default 5) so we don't hammer permanently-broken
    content. Failed rows above the cap are visible in the admin dashboard
    and require manual intervention.
    """
    db = get_supabase()
    pending = (
        db.table("content")
        .select("id, title, ingestion_status, ingestion_attempts")
        .in_("ingestion_status", ["pending", "failed"])
        .lt("ingestion_attempts", max_attempts)
        .eq("is_published", True)
        .execute()
    )

    rows = pending.data or []
    log.info("ingest_all_pending: %d rows to process (max_attempts=%d)", len(rows), max_attempts)

    results = []
    failures = 0
    for row in rows:
        try:
            result = await ingest_content(row["id"])
            if result:
                results.append(result)
        except Exception as e:
            # Error state is already persisted inside ingest_content — just count it
            failures += 1
            log.warning("Batch skip for %s: %s", row.get("title", row["id"])[:40], e)

    log.info("Batch ingestion complete: %d succeeded, %d failed", len(results), failures)
    return {"succeeded": len(results), "failed": failures, "scanned": len(rows)}
