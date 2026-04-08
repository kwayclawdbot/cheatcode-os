"""Dry-run the AI agent post generator and print N sample posts.

Usage (from the backend venv):
    cd ~/projects/cheatcode-os/backend
    source .venv/bin/activate   # or however the venv is named
    python ../scripts/ai_agent_dry_run.py [--count 5]

Does NOT insert anything into feed_posts. Records token usage to kai_usage
so the cost of the dry-run is visible. Bypasses the `agent_posting_enabled`
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
        print("No samples produced. Check that agents exist and the anthropic key is set.")
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
