"""Local AI agent worker — runs one post + hot-take cycle.

Invoked by the LaunchAgent (com.openclaw.community-seeder.plist) every 20
minutes. Shells out to `claude -p` for text generation, so this MUST run
on a machine where Claude Code is installed and authenticated. Not on
Railway.

What it does each tick:
    1. Read app_settings.agent_posting_enabled — bail if false
    2. Run the scheduled-post job (1 post per tick from a weighted-random agent)
    3. Run the hot-takes scan (fires on any ticker that moved >5%)

Logs go to ~/.openclaw/logs/community-seeder.log via the LaunchAgent's
StandardOutPath / StandardErrorPath.

Required env vars (loaded from a .env file or the LaunchAgent plist):
    SUPABASE_URL
    SUPABASE_SERVICE_KEY
    CLAUDE_CLI_BIN          (optional, defaults to `claude` on PATH)
    CC_AGENT_MODEL          (optional, defaults to `haiku`)

The backend's normal Pydantic config requires many other env vars (Stripe,
EODHD, etc.) that this worker doesn't need, so we set safe stubs for them
before importing the app modules.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone


# Make the backend package importable.
HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.normpath(os.path.join(HERE, "..", "backend"))
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)


def _load_dotenv_if_present() -> None:
    """Lightweight .env loader — avoids a dependency on python-dotenv."""
    candidates = [
        os.path.join(HERE, ".env"),
        os.path.join(BACKEND, ".env"),
    ]
    for path in candidates:
        if not os.path.isfile(path):
            continue
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, val = line.partition("=")
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                # Don't clobber existing env (LaunchAgent plist wins)
                os.environ.setdefault(key, val)


def _ensure_stub_env() -> None:
    """The backend's Settings class requires many fields. This worker only
    needs Supabase + (optionally) Claude CLI. Stub the rest so config loads."""
    stubs = {
        "ANTHROPIC_API_KEY": "stub-not-used-cli-mode",
        "OPENAI_API_KEY": "stub",
        "YOUTUBE_API_KEY": "stub",
        "EODHD_API_KEY": "stub",
        "STRIPE_SECRET_KEY": "stub",
        "STRIPE_WEBHOOK_SECRET": "stub",
        "STRIPE_PRO_PRICE_ID": "stub",
    }
    for k, v in stubs.items():
        os.environ.setdefault(k, v)


def main() -> int:
    _load_dotenv_if_present()
    _ensure_stub_env()

    if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_SERVICE_KEY"):
        print("FATAL: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set", file=sys.stderr)
        return 2

    # Imports must come after env stubs so Pydantic doesn't crash on validation.
    from app.services.ai_agent_poster import (  # noqa: E402
        run_scheduled_post_job,
        is_agent_posting_enabled,
    )
    from app.services.ai_agent_reactor import react_to_big_movers  # noqa: E402

    started = datetime.now(timezone.utc).isoformat(timespec="seconds")
    print(f"[{started}] community-seeder tick start", flush=True)

    if not is_agent_posting_enabled():
        print(f"[{started}] agent_posting_enabled=false — bailing", flush=True)
        return 0

    post_status = run_scheduled_post_job(max_posts=1)
    print(f"[post] {json.dumps(post_status, default=str)}", flush=True)

    hot_status = react_to_big_movers()
    print(f"[hot]  {json.dumps(hot_status, default=str)}", flush=True)

    finished = datetime.now(timezone.utc).isoformat(timespec="seconds")
    print(f"[{finished}] community-seeder tick done", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
