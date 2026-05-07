"""Dry-run the AI agent post generator and print N sample posts.

Generation goes through the local Claude Code CLI (`claude -p`), so this
script must run on a machine where Claude Code is installed and logged in.

Usage:
    cd ~/projects/cheatcode-os
    uv run --with supabase --with pydantic --with pydantic-settings \\
        python scripts/ai_agent_dry_run.py --count 5

Does NOT insert anything into feed_posts. Records actual cost to kai_usage
(tier='agent') so the spend is visible. Bypasses the `agent_posting_enabled`
feature flag because this is a reviewer tool.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

# Make the backend package importable when running from anywhere.
HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.normpath(os.path.join(HERE, "..", "backend"))
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)


def _load_dotenv_if_present() -> None:
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


def _ensure_stub_env() -> None:
    """Backend Settings requires many fields. Stub the ones the dry-run
    doesn't actually use so config validation passes."""
    for k, v in {
        "ANTHROPIC_API_KEY": "stub-not-used-cli-mode",
        "OPENAI_API_KEY": "stub",
        "YOUTUBE_API_KEY": "stub",
        "EODHD_API_KEY": "stub",
        "STRIPE_SECRET_KEY": "stub",
        "STRIPE_WEBHOOK_SECRET": "stub",
        "STRIPE_PRO_PRICE_ID": "stub",
    }.items():
        os.environ.setdefault(k, v)


_load_dotenv_if_present()
_ensure_stub_env()

from app.services.ai_agent_poster import dry_run_samples  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=5)
    parser.add_argument("--json", action="store_true", help="Output raw JSON instead of pretty print")
    args = parser.parse_args()

    samples = dry_run_samples(n=args.count)

    if args.json:
        print(json.dumps(samples, indent=2))
        return 0

    if not samples:
        print("No samples produced. Check that agents exist in the ai_agents table and that `claude` is on PATH and logged in.")
        return 1

    for i, s in enumerate(samples, 1):
        print(f"\n───── Sample {i} / {len(samples)} ─────")
        if "error" in s:
            print(f"  [{s.get('agent','?')}] ERROR: {s['error']}")
            continue
        print(f"  agent:     @{s['agent']}  ({s['persona']})")
        print(f"  style:     {s['style']}   post_type: {s['post_type']}")
        print(f"  ticker:    {s.get('ticker') or '-'}   sentiment: {s.get('sentiment') or '-'}")
        tags = ", ".join(s.get("tags") or [])
        print(f"  tags:      {tags}")
        body = s.get("body") or ""
        print(f"  body:      {body}")
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
