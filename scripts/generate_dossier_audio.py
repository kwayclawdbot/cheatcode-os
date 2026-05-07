"""Generate spoken dossier brief via Chatterbox TTS and upload to Supabase storage.

Runs LOCALLY since Chatterbox is at localhost:8000. Called on-demand when
a user requests audio on a dossier page, or batch-run for trending tickers.

Usage:
    python scripts/generate_dossier_audio.py NVDA
    python scripts/generate_dossier_audio.py NVDA PLTR ZS   # batch

Flow:
    1. Fetch dossier data from Railway API (or local)
    2. Build a natural spoken brief (40s max for Chatterbox)
    3. Call Chatterbox at localhost:8000 to generate WAV
    4. Upload to Supabase storage dossier-audio bucket
    5. Available immediately at public URL
"""

from __future__ import annotations

import json
import os
import sys
import requests
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.normpath(os.path.join(HERE, "..", "backend"))
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)

# Chatterbox config
VOICEBOX_URL = os.environ.get("VOICEBOX_URL", "http://localhost:8000")
VOICE_PROFILE = os.environ.get("VOICEBOX_PROFILE", "2cd42fda-3482-4eb4-a79a-6abc64802e24")  # Kway
EXAGGERATION = 0.6

# Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

# Railway API (for fetching dossier data)
API_BASE = os.environ.get("API_BASE", "https://cheatcode-os-api-production.up.railway.app/api/v1")


def _load_env():
    for path in (os.path.join(HERE, ".env"), os.path.join(BACKEND, ".env")):
        if not os.path.isfile(path):
            continue
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def build_brief_script(data: dict) -> str:
    """Build a natural spoken brief from dossier data. Max ~40 seconds."""
    symbol = data.get("symbol", "?")
    name = data.get("name") or symbol
    price = data.get("last_price") or 0
    chg = data.get("price_change_pct") or 0
    direction = data.get("direction") or "neutral"
    score = data.get("convergence_score") or 0

    parts = []

    # Opening
    chg_word = "up" if chg >= 0 else "down"
    parts.append(f"{name}, ticker {symbol}, is trading at {price:.2f}, {chg_word} {abs(chg):.1f} percent today.")

    # Direction + score
    parts.append(f"The overall signal is {direction} with a convergence score of {score} out of 100.")

    # Kai TLDR
    kai = data.get("kai_analysis") or {}
    if kai.get("tldr"):
        parts.append(kai["tldr"])

    # Top catalyst
    catalysts = kai.get("catalysts") or []
    if catalysts:
        parts.append(f"Key catalyst: {catalysts[0]}.")

    # Top risk
    risks = kai.get("risks") or []
    if risks:
        parts.append(f"Main risk: {risks[0]}.")

    # Key levels
    levels = kai.get("key_levels") or {}
    sup = levels.get("support")
    res = levels.get("resistance")
    if sup:
        sup_val = sup[0] if isinstance(sup, list) else sup
        parts.append(f"Support at {sup_val:.0f}." if isinstance(sup_val, (int, float)) else "")
    if res:
        res_val = res[0] if isinstance(res, list) else res
        parts.append(f"Resistance at {res_val:.0f}." if isinstance(res_val, (int, float)) else "")

    # News summary
    news_s = data.get("news_sentiment") or {}
    pos = news_s.get("positive", 0)
    neg = news_s.get("negative", 0)
    if pos + neg > 0:
        parts.append(f"News sentiment: {pos} positive, {neg} negative articles.")

    # Trim to ~40 seconds (~120 words at 3 words/sec)
    script = " ".join(p for p in parts if p)
    words = script.split()
    if len(words) > 120:
        script = " ".join(words[:120]) + "."

    return script


def generate_audio(symbol: str) -> str | None:
    """Fetch dossier, generate TTS, upload to Supabase. Returns public URL."""
    print(f"[{symbol}] Fetching dossier...", flush=True)

    # Fetch dossier from API
    try:
        resp = requests.post(f"{API_BASE}/intelligence/ticker/{symbol}/analyze", timeout=30)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"[{symbol}] Dossier fetch failed: {e}", flush=True)
        return None

    # Build script
    script = build_brief_script(data)
    print(f"[{symbol}] Script ({len(script.split())} words): {script[:100]}...", flush=True)

    # Call Chatterbox
    print(f"[{symbol}] Generating audio via Chatterbox...", flush=True)
    try:
        tts_resp = requests.post(
            f"{VOICEBOX_URL}/v1/tts",
            json={
                "text": script,
                "voice_id": VOICE_PROFILE,
                "exaggeration": EXAGGERATION,
                "output_format": "wav",
            },
            timeout=60,
        )
        tts_resp.raise_for_status()
        audio_bytes = tts_resp.content
        print(f"[{symbol}] Audio generated: {len(audio_bytes)} bytes", flush=True)
    except Exception as e:
        print(f"[{symbol}] TTS failed: {e}", flush=True)
        return None

    # Upload to Supabase storage
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filename = f"{symbol}_{today}.wav"

    print(f"[{symbol}] Uploading to Supabase storage...", flush=True)
    try:
        upload_resp = requests.post(
            f"{SUPABASE_URL}/storage/v1/object/dossier-audio/{filename}",
            headers={
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "audio/wav",
                "x-upsert": "true",
            },
            data=audio_bytes,
            timeout=30,
        )
        upload_resp.raise_for_status()
    except Exception as e:
        print(f"[{symbol}] Upload failed: {e}", flush=True)
        return None

    public_url = f"{SUPABASE_URL}/storage/v1/object/public/dossier-audio/{filename}"
    print(f"[{symbol}] Audio live: {public_url}", flush=True)
    return public_url


def main():
    _load_env()
    global SUPABASE_URL, SUPABASE_KEY
    SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
    SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("FATAL: SUPABASE_URL and SUPABASE_SERVICE_KEY required", file=sys.stderr)
        return 1

    symbols = [s.upper() for s in sys.argv[1:] if s.strip()]
    if not symbols:
        print("Usage: python generate_dossier_audio.py NVDA [PLTR ZS ...]")
        return 1

    for sym in symbols:
        generate_audio(sym)

    return 0


if __name__ == "__main__":
    sys.exit(main())
