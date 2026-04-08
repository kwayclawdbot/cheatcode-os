"""Ingestion Engine — curated content → Supabase cheatcode_vault rows + KB chunks.

ARCHITECTURE NOTE (2026-04-08 rebuild):
    The original implementation wrote markdown files to `~/.openclaw/vault/`
    on the Railway container's filesystem. Railway containers don't have
    persistent home directories, so every write was silently lost to
    ephemeral disk on the next container restart. The "vault" was effectively
    invisible in production.

    The rebuild stores vault notes as rows in a dedicated Supabase
    `cheatcode_vault` table (migration 009), keyed by relative path. The
    Python backend writes rows. A sync agent running on the user's Mac
    (scripts/vault_sync.py) polls the table and writes any new rows to
    `~/.openclaw/vault/{path}` as real files, which the user's Obsidian
    opens normally.

    IMPORTANT: this table is ISOLATED from `vault_store` (which another
    personal-vault sync process uses for unrelated data). cheatcode-os
    writes go HERE — to `cheatcode_vault` — so the two systems don't
    collide. A CHECK constraint on cheatcode_vault.path enforces the
    "06 - Knowledge Base/CheatCode OS/%" prefix so accidental out-of-scope
    writes fail loudly.

Path convention — all paths are POSIX-style relative strings (no home dir):
    06 - Knowledge Base/CheatCode OS/Frameworks/{slug}.md
    06 - Knowledge Base/CheatCode OS/Tickers/{symbol}.md
    06 - Knowledge Base/CheatCode OS/Themes/{slug}.md
    06 - Knowledge Base/CheatCode OS/Creators/{slug}.md
    06 - Knowledge Base/CheatCode OS/Videos/{creator_slug}/{title_slug}.md

The sync agent maps these 1:1 under `~/.openclaw/vault/`.
"""

import json
import logging
import re
from datetime import datetime, timezone

import anthropic

from app.core.config import get_settings
from app.core.supabase import get_supabase, maybe_one
from app.services.curation import generate_embedding

log = logging.getLogger("ingestion")

# All relative paths live under this base inside the vault.
# The cheatcode_vault CHECK constraint enforces this prefix — accidental
# writes outside it will fail loudly instead of polluting unrelated data.
VAULT_BASE = "06 - Knowledge Base/CheatCode OS"
VIDEOS_DIR = f"{VAULT_BASE}/Videos"
FRAMEWORKS_DIR = f"{VAULT_BASE}/Frameworks"
TICKERS_DIR = f"{VAULT_BASE}/Tickers"
THEMES_DIR = f"{VAULT_BASE}/Themes"
CREATORS_DIR = f"{VAULT_BASE}/Creators"

# Supabase table for cheatcode-os vault rows — isolated from the personal
# vault_store table that another sync process uses for unrelated data.
VAULT_TABLE = "cheatcode_vault"


# ── Vault row I/O (Supabase cheatcode_vault table) ─────────────────────────

def _slugify(text: str) -> str:
    """Convert text to a safe path segment."""
    text = re.sub(r'[^\w\s-]', '', (text or "").strip())
    return re.sub(r'[-\s]+', '-', text)[:80] or "untitled"


def _vault_put(path: str, content: str) -> None:
    """Upsert a vault note by path into cheatcode_vault. Idempotent.

    The DB-side CHECK constraint rejects any path not under
    "06 - Knowledge Base/CheatCode OS/...", so a bug that tries to write
    elsewhere will raise a clear error instead of silently polluting.
    """
    if not path.startswith(VAULT_BASE + "/"):
        raise ValueError(f"vault path must start with '{VAULT_BASE}/': got {path!r}")
    db = get_supabase()
    db.table(VAULT_TABLE).upsert(
        {
            "path": path,
            "content": content,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="path",
    ).execute()


def _vault_get(path: str) -> str | None:
    """Fetch an existing vault note by path. Returns None if not present."""
    db = get_supabase()
    result = maybe_one(db.table(VAULT_TABLE).select("content").eq("path", path))
    if not result.data:
        return None
    return result.data.get("content")


# ── 1. Master Video Vault Note ──────────────────────────────────────────────

def create_video_vault_note(content: dict, creator_name: str, tickers: list[dict], themes: list[str]) -> str:
    """Create the master vault note for a curated video. Returns the vault path."""
    title = content["title"]
    safe_title = _slugify(title)
    creator_slug = _slugify(creator_name)

    ticker_links = [f"[[{t['ticker']}]]" for t in tickers]
    theme_links = [f"[[{t}]]" for t in themes]
    creator_link = f"[[{creator_name}]]"

    insights = content.get("key_insights") or []
    insight_bullets = "\n".join(f"- {i.get('insight', '')}" for i in insights[:6])

    timestamps = content.get("timestamps") or []
    timestamp_lines = "\n".join(
        f"- **{int(t.get('seconds', 0)) // 60}:{int(t.get('seconds', 0)) % 60:02d}** — {t.get('label', '')}"
        for t in timestamps
    )

    ticker_sections = ""
    for t in tickers:
        sentiment_badge = {
            "bullish": "🟢", "bearish": "🔴", "neutral": "⚪", "mixed": "🟡"
        }.get(t.get("sentiment", ""), "")
        ticker_sections += f"\n### {sentiment_badge} {t['ticker']}\n{t.get('mention_context', 'Mentioned in video.')}\n"

    duration_min = (content.get("duration_seconds") or 0) // 60
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    note = f"""---
title: "{title}"
type: reference
tags: [cheatcode-os, curated-video, {', '.join(content.get('topics', [])[:5])}]
created: {today}
updated: {today}
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
*Curated by CheatCode OS on {today}*
"""

    path = f"{VIDEOS_DIR}/{creator_slug}/{safe_title}.md"
    _vault_put(path, note)
    log.info("vault: wrote video note %s", path)
    return path


# ── 2. Framework Extraction ──────────────────────────────────────────────────

async def extract_frameworks(content: dict, video_note_title: str, video_note_path: str) -> list[str]:
    """Extract teachable frameworks from transcript and save as vault notes.

    Returns the list of vault paths for the framework notes created.
    """
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
            model=s.kai_haiku_model,
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.content[0].text
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        frameworks = json.loads(text)
    except (json.JSONDecodeError, IndexError) as e:
        log.warning("Framework extraction parse failed for %s: %s", content["title"][:40], e)
        return []
    except anthropic.APIError as e:
        log.warning("Framework extraction API failed for %s: %s", content["title"][:40], e)
        return []

    if not frameworks:
        return []

    paths: list[str] = []
    framework_links: list[str] = []
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    for fw in frameworks[:5]:  # Max 5 per video
        fw_title = fw.get("title", "Unnamed Framework")
        safe_name = _slugify(fw_title)
        fw_tags = fw.get("tags", [])

        steps = "\n".join(f"{i+1}. {step}" for i, step in enumerate(fw.get("steps", [])))
        rules = "\n".join(f"- {r}" for r in fw.get("key_rules", []))

        note = f"""---
title: "{fw_title}"
type: framework
tags: [cheatcode-os, framework, {', '.join(fw_tags[:5])}]
created: {today}
updated: {today}
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

        path = f"{FRAMEWORKS_DIR}/{safe_name}.md"
        _vault_put(path, note)
        paths.append(path)
        framework_links.append(f"[[{fw_title}]]")
        log.info("vault: wrote framework %s", path)

    # Backlink: update the video vault note with framework links
    if framework_links:
        _append_framework_links(video_note_path, framework_links)

    return paths


def _append_framework_links(video_note_path: str, framework_links: list[str]) -> None:
    """Replace the framework placeholder in the video note with actual links."""
    existing = _vault_get(video_note_path)
    if not existing:
        return
    replacement = "\n".join(f"- {link}" for link in framework_links)
    updated = existing.replace(
        "_Frameworks extracted from this video will be linked here._",
        replacement,
    )
    _vault_put(video_note_path, updated)


# ── 3. Ticker Notes ──────────────────────────────────────────────────────────

def update_ticker_notes(tickers: list[dict], video_title: str, creator_name: str, quick_take: str) -> None:
    """Create/update per-ticker vault notes with video mention."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    for t in tickers:
        symbol = t["ticker"]
        path = f"{TICKERS_DIR}/{symbol}.md"
        sentiment = t.get("sentiment", "neutral")
        context = t.get("mention_context", "Mentioned in video.")
        sentiment_emoji = {
            "bullish": "🟢", "bearish": "🔴", "neutral": "⚪", "mixed": "🟡"
        }.get(sentiment, "")

        entry = f"""
### {sentiment_emoji} [[{video_title}]] ({today})
**Creator:** [[{creator_name}]] · **Sentiment:** {sentiment}
{context}

"""

        existing = _vault_get(path)
        if existing:
            if "\n## Recent Mentions" in existing:
                updated = existing.replace(
                    "\n## Recent Mentions\n",
                    f"\n## Recent Mentions\n{entry}",
                )
            else:
                updated = existing + f"\n## Recent Mentions\n{entry}"
            _vault_put(path, updated)
        else:
            note = f"""---
title: "{symbol}"
type: reference
tags: [cheatcode-os, ticker, {symbol.lower()}]
created: {today}
updated: {today}
status: active
links: []
---

# {symbol}

Ticker tracking note. Updated automatically by CheatCode OS ingestion.

## Recent Mentions
{entry}
"""
            _vault_put(path, note)

        log.info("vault: ticker %s updated", symbol)


# ── 4. Theme Notes ───────────────────────────────────────────────────────────

def update_theme_notes(themes: list[str], video_title: str, creator_name: str) -> None:
    """Create/update per-theme vault notes with video reference."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    for theme in themes:
        safe_theme = _slugify(theme)
        path = f"{THEMES_DIR}/{safe_theme}.md"
        display_name = theme.replace("_", " ").title()
        entry = f"- [[{video_title}]] by [[{creator_name}]] ({today})\n"

        existing = _vault_get(path)
        if existing:
            if "\n## Content Coverage\n" in existing:
                updated = existing.replace(
                    "\n## Content Coverage\n",
                    f"\n## Content Coverage\n{entry}",
                )
            else:
                updated = existing + f"\n## Content Coverage\n{entry}"
            updated = re.sub(r'updated: \d{4}-\d{2}-\d{2}', f'updated: {today}', updated)
            _vault_put(path, updated)
        else:
            note = f"""---
title: "{display_name}"
type: reference
tags: [cheatcode-os, theme, {theme.replace('_', '-')}]
created: {today}
updated: {today}
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
            _vault_put(path, note)

        log.info("vault: theme %s updated", display_name)


# ── 5. Creator Notes ─────────────────────────────────────────────────────────

def update_creator_note(creator_name: str, creator_slug: str, video_title: str, topics: list[str]) -> None:
    """Create/update per-creator vault note."""
    path = f"{CREATORS_DIR}/{_slugify(creator_name)}.md"
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    entry = f"- [[{video_title}]] ({today})\n"

    existing = _vault_get(path)
    if existing:
        if "\n## Curated Videos\n" in existing:
            updated = existing.replace(
                "\n## Curated Videos\n",
                f"\n## Curated Videos\n{entry}",
            )
        else:
            updated = existing + f"\n## Curated Videos\n{entry}"
        updated = re.sub(r'updated: \d{4}-\d{2}-\d{2}', f'updated: {today}', updated)
        _vault_put(path, updated)
    else:
        topic_tags = ", ".join(topics[:5])
        note = f"""---
title: "{creator_name}"
type: reference
tags: [cheatcode-os, creator, {topic_tags}]
created: {today}
updated: {today}
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
        _vault_put(path, note)

    log.info("vault: creator %s updated", creator_name)


# ── 6. KB Chunking + Embedding (unchanged — already Supabase-backed) ────────

async def chunk_and_embed(content_id: str, title: str, transcript: str, quick_take: str, topics: list[str]) -> int:
    """Split transcript into chunks, embed each, store in kb_chunks table."""
    if not transcript or len(transcript) < 200:
        return 0

    db = get_supabase()

    # Skip if already chunked (idempotent retries)
    existing = db.table("kb_chunks").select("id", count="exact").eq("content_id", content_id).execute()
    if existing.count and existing.count > 0:
        return 0

    # Split into ~500-word chunks with 50-word overlap
    words = transcript.split()
    chunk_size = 500
    overlap = 50
    chunks: list[str] = []
    i = 0
    while i < len(words):
        chunk_words = words[i:i + chunk_size]
        chunks.append(" ".join(chunk_words))
        i += chunk_size - overlap

    topic_str = ", ".join(topics[:5])
    stored = 0
    for idx, chunk_text in enumerate(chunks):
        embed_input = f"[Video: {title} | Topics: {topic_str}]\n\n{chunk_text}"

        try:
            embedding = await generate_embedding(embed_input)
        except Exception as e:
            log.warning("Embedding failed for chunk %d of %s: %s", idx, content_id[:8], e)
            continue

        keywords = _extract_keywords(chunk_text)

        try:
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
        except Exception as e:
            log.warning("kb_chunks insert failed for chunk %d of %s: %s", idx, content_id[:8], e)

    log.info("kb_chunks: %s → %d chunks stored", title[:40], stored)
    return stored


def _extract_keywords(text: str, max_keywords: int = 10) -> list[str]:
    """Extract simple keywords from text, prioritizing finance terms."""
    finance_terms = {
        "bullish", "bearish", "breakout", "resistance", "support", "volume",
        "momentum", "trend", "reversal", "consolidation", "accumulation",
        "distribution", "volatility", "earnings", "revenue", "margin",
        "growth", "value", "dividend", "options", "calls", "puts",
        "spread", "premium", "strike", "expiration", "hedge",
        "portfolio", "allocation", "risk", "reward", "drawdown",
    }

    words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
    freq: dict[str, int] = {}
    for w in words:
        if w in finance_terms or len(w) > 5:
            freq[w] = freq.get(w, 0) + 1

    sorted_words = sorted(freq.items(), key=lambda x: -x[1])
    return [w for w, _ in sorted_words[:max_keywords]]


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
        log.warning("ingest_content: content %s not found", content_id)
        return None

    content = content_row.data

    # Idempotency: if already succeeded, don't reprocess
    if content.get("ingestion_status") == "succeeded":
        return None

    # Mark in_progress + increment attempts
    current_attempts = content.get("ingestion_attempts") or 0
    db.table("content").update({
        "ingestion_status": "in_progress",
        "ingestion_attempts": current_attempts + 1,
    }).eq("id", content_id).execute()

    try:
        tickers_result = db.table("content_tickers").select("*").eq("content_id", content_id).execute()
        tickers = tickers_result.data or []

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

        log.info("ingest_content: %s by %s (attempt %d)", title[:50], creator_name, current_attempts + 1)

        # 1. Master video vault note
        video_note_path = create_video_vault_note(content, creator_name, tickers, themes)

        # 2. Extract frameworks (Claude call over transcript)
        content["_creator_name"] = creator_name
        framework_paths = await extract_frameworks(content, title, video_note_path)

        # 3. Ticker backlinks
        update_ticker_notes(tickers, title, creator_name, content.get("quick_take", ""))

        # 4. Theme backlinks
        update_theme_notes(themes, title, creator_name)

        # 5. Creator note
        update_creator_note(creator_name, creator_slug, title, topics)

        # 6. Chunk + embed for granular KB search
        chunks_stored = await chunk_and_embed(
            content_id, title,
            content.get("transcript", ""),
            content.get("quick_take", ""),
            topics,
        )

        # 7. Mark succeeded
        db.table("content").update({
            "ingestion_status": "succeeded",
            "ingestion_error": None,
            "ingested_at": datetime.now(timezone.utc).isoformat(),
            "tags": list(set((content.get("tags") or []) + ["ingested"])),
        }).eq("id", content_id).execute()

        log.info(
            "ingest_content: %s → vault_note=%s frameworks=%d chunks=%d",
            title[:40], video_note_path, len(framework_paths), chunks_stored,
        )

        return {
            "vault_note": video_note_path,
            "frameworks": len(framework_paths),
            "chunks": chunks_stored,
            "tickers_updated": len(tickers),
            "themes_updated": len(themes),
        }

    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)[:500]}"
        log.error("ingest_content failed for %s: %s", content_id, error_msg, exc_info=True)
        db.table("content").update({
            "ingestion_status": "failed",
            "ingestion_error": error_msg,
        }).eq("id", content_id).execute()
        raise


async def ingest_all_pending(max_attempts: int = 5) -> dict:
    """Ingest all content that hasn't succeeded yet.

    Picks up:
      - Rows with ingestion_status='pending' (never attempted)
      - Rows with ingestion_status='failed' below the attempt cap

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

    succeeded = 0
    failed = 0
    for row in rows:
        try:
            result = await ingest_content(row["id"])
            if result:
                succeeded += 1
        except Exception as e:
            failed += 1
            log.warning("ingest_all_pending: batch skip %s: %s", row.get("title", row["id"])[:40], e)

    log.info("ingest_all_pending: %d succeeded, %d failed, %d scanned", succeeded, failed, len(rows))
    return {"succeeded": succeeded, "failed": failed, "scanned": len(rows)}
