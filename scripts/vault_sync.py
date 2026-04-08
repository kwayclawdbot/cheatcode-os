#!/usr/bin/env python3
"""
CheatCode OS → local Obsidian vault sync agent.

Runs on your Mac as a LaunchAgent (or manually). Pulls rows from the
Supabase `vault_store` table and writes them as markdown files under
~/.openclaw/vault/{path}, which is the root of your personal Obsidian
vault.

Why this exists:
    The Python backend running on Railway cannot write to your Mac's
    filesystem. Instead, the backend writes vault notes as rows to
    Supabase. This script runs locally and mirrors those rows into
    real markdown files that Obsidian opens.

Usage:
    # one-shot sync
    python3 vault_sync.py

    # run in a loop (polls every 5 minutes)
    python3 vault_sync.py --loop

    # initial full sync (ignores last_sync timestamp)
    python3 vault_sync.py --full

Requirements:
    pip install httpx python-dotenv

Environment (required, via .env next to this script OR exported):
    SUPABASE_URL
    SUPABASE_SERVICE_KEY   (or SUPABASE_ANON_KEY if RLS allows read)
    VAULT_ROOT             (default: ~/.openclaw/vault)

State:
    ~/.openclaw/.vault-sync-state.json
        Tracks last_sync timestamp so incremental pulls only fetch
        rows newer than the previous run.

Logs:
    ~/Library/Logs/cheatcode-vault-sync.log
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

try:
    import httpx
except ImportError:
    print("ERROR: httpx not installed. Run: pip install httpx python-dotenv", file=sys.stderr)
    sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass  # dotenv is optional; env vars can come from the shell

# ── Config ─────────────────────────────────────────────────────────────────

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY", "")
VAULT_ROOT = Path(os.environ.get("VAULT_ROOT", "")).expanduser() or (Path.home() / ".openclaw" / "vault")
STATE_FILE = Path.home() / ".openclaw" / ".vault-sync-state.json"
LOG_FILE = Path.home() / "Library" / "Logs" / "cheatcode-vault-sync.log"
POLL_INTERVAL_SECONDS = int(os.environ.get("VAULT_SYNC_INTERVAL", "300"))  # 5 minutes

# ── Logging ────────────────────────────────────────────────────────────────

LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("vault_sync")


# ── State ──────────────────────────────────────────────────────────────────

def load_state() -> dict:
    if not STATE_FILE.exists():
        return {}
    try:
        return json.loads(STATE_FILE.read_text())
    except (json.JSONDecodeError, OSError):
        return {}


def save_state(state: dict) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2))


# ── Safe path writing ──────────────────────────────────────────────────────

def _safe_target_path(rel_path: str) -> Path | None:
    """Resolve a vault row path to a filesystem path, rejecting anything
    that escapes VAULT_ROOT via .. or absolute paths."""
    # Normalize separators, reject absolute paths
    rel_path = rel_path.lstrip("/\\")
    candidate = (VAULT_ROOT / rel_path).resolve()
    try:
        candidate.relative_to(VAULT_ROOT.resolve())
    except ValueError:
        log.warning("rejected unsafe path: %s", rel_path)
        return None
    return candidate


def write_note(rel_path: str, content: str) -> bool:
    """Write a note to disk. Returns True if the file changed on disk."""
    target = _safe_target_path(rel_path)
    if target is None:
        return False
    target.parent.mkdir(parents=True, exist_ok=True)

    # Only write if content differs, so Obsidian doesn't constantly refresh.
    if target.exists():
        try:
            current = target.read_text()
            if current == content:
                return False
        except OSError:
            pass

    target.write_text(content)
    return True


# ── Supabase REST ──────────────────────────────────────────────────────────

def fetch_rows(since: str | None) -> list[dict]:
    """Fetch vault_store rows newer than `since` (ISO timestamp) via PostgREST."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        log.error("SUPABASE_URL and SUPABASE_SERVICE_KEY (or ANON_KEY) are required")
        sys.exit(2)

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Accept": "application/json",
    }
    params = {
        "select": "path,content,updated_at",
        "order": "updated_at.asc",
        "limit": "1000",
    }
    if since:
        params["updated_at"] = f"gte.{since}"

    url = f"{SUPABASE_URL}/rest/v1/vault_store"
    with httpx.Client(timeout=30) as client:
        resp = client.get(url, headers=headers, params=params)
        resp.raise_for_status()
        return resp.json()


# ── Sync loop ──────────────────────────────────────────────────────────────

def run_once(full: bool = False) -> dict:
    state = load_state()
    since = None if full else state.get("last_sync")

    log.info(
        "syncing vault_store → %s (incremental from %s)",
        VAULT_ROOT, since or "beginning",
    )

    try:
        rows = fetch_rows(since)
    except Exception as e:
        log.error("fetch failed: %s", e)
        return {"error": str(e)}

    log.info("fetched %d rows", len(rows))

    written = 0
    skipped = 0
    max_updated = since
    for row in rows:
        path = row.get("path")
        content = row.get("content") or ""
        updated_at = row.get("updated_at")
        if not path:
            continue
        if write_note(path, content):
            written += 1
        else:
            skipped += 1
        if updated_at and (max_updated is None or updated_at > max_updated):
            max_updated = updated_at

    if max_updated and max_updated != since:
        state["last_sync"] = max_updated
        state["last_run"] = datetime.now(timezone.utc).isoformat()
        save_state(state)

    log.info("sync complete: written=%d skipped=%d", written, skipped)
    return {"fetched": len(rows), "written": written, "skipped": skipped}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--loop", action="store_true", help="Run continuously, polling every VAULT_SYNC_INTERVAL seconds")
    parser.add_argument("--full", action="store_true", help="Ignore last_sync and do a full refetch")
    args = parser.parse_args()

    if not args.loop:
        result = run_once(full=args.full)
        return 0 if "error" not in result else 1

    log.info("entering loop mode (interval=%ds)", POLL_INTERVAL_SECONDS)
    full = args.full  # first iteration uses --full if passed
    while True:
        try:
            run_once(full=full)
        except KeyboardInterrupt:
            log.info("interrupt received, exiting")
            return 0
        except Exception as e:
            log.error("unexpected error in loop: %s", e)
        full = False  # subsequent iterations always incremental
        time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    sys.exit(main())
