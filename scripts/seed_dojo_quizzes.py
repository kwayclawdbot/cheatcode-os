#!/usr/bin/env python3
"""
Seed Dojo Quiz Questions into CheatCode OS via Supabase client.
Tracks: Breakout Mastery, Risk Management, Market Psychology
Run: python scripts/seed_dojo_quizzes.py
"""

import os
import sys
from pathlib import Path

# Load env from backend/.env
env_path = Path(__file__).parent.parent / "backend" / ".env"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                # Remove surrounding quotes if present
                value = value.strip().strip('"').strip("'")
                os.environ.setdefault(key.strip(), value)
    print(f"✅ Loaded env from {env_path}")
else:
    print(f"⚠️  backend/.env not found at {env_path}, using system env")

try:
    from supabase import create_client, Client
except ImportError:
    print("❌ supabase-py not installed. Run: pip install supabase")
    sys.exit(1)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "") or os.environ.get("SUPABASE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ── Quiz Data ────────────────────────────────────────────────────────────────

QUIZ_DATA = {
    "Breakout Mastery": [
        {
            "question": "What is the most important confirmation signal for a breakout?",
            "options": ["High volume spike", "Low volume", "Gap down", "Price rejection"],
            "correct_index": 0,
            "explanation": "A high volume spike confirms institutional participation and validates the breakout as genuine rather than a fakeout.",
        },
        {
            "question": "A breakout from a flat base pattern is most bullish when?",
            "options": ["Volume is below average", "Volume is 2x+ average", "Price gaps below base", "RSI is below 30"],
            "correct_index": 1,
            "explanation": "Volume 2x+ average on a breakout signals strong institutional demand and conviction, making the move more likely to sustain.",
        },
        {
            "question": "What does a 'false breakout' indicate?",
            "options": ["Strong institutional buying", "Weak buying pressure, likely reversal", "Guaranteed continuation", "Insider selling"],
            "correct_index": 1,
            "explanation": "A false breakout reveals weak buying pressure because price cannot sustain above the breakout level, often leading to a reversal back into the range.",
        },
        {
            "question": "The RPI score measures which of the following?",
            "options": ["Random price indicators", "Relative momentum vs peers", "Narrative, Business, and Institutional factors", "Real-time price impact"],
            "correct_index": 2,
            "explanation": "The RPI (Relative Power Index) evaluates a stock's Narrative strength, Business fundamentals, and Institutional buying activity to score conviction.",
        },
        {
            "question": "After a breakout, what is the ideal retest behavior?",
            "options": ["Price falls 20%+ below breakout level", "Price retests the breakout level with low volume", "Price immediately reverses", "Volume drops to zero"],
            "correct_index": 1,
            "explanation": "A healthy retest of the breakout level on low volume confirms the level as new support and gives a lower-risk entry opportunity.",
        },
    ],
    "Risk Management": [
        {
            "question": "If your stop loss is $2 away from entry, what is your position size for a $200 max loss?",
            "options": ["50 shares", "100 shares", "200 shares", "500 shares"],
            "correct_index": 1,
            "explanation": "Position size = Max loss / Stop distance = $200 / $2 = 100 shares — this is the core formula for position sizing by risk.",
        },
        {
            "question": "R-Multiple of 2.5 means?",
            "options": ["You lost 2.5x your risk", "You won 2.5x your initial risk", "You risked 25% of your account", "You held for 2.5 days"],
            "correct_index": 1,
            "explanation": "An R-multiple measures profit relative to initial risk — 2.5R means you made 2.5 times what you risked on the trade.",
        },
        {
            "question": "The '2% rule' in trading means?",
            "options": ["Only trade 2 stocks", "Never risk more than 2% of total capital on one trade", "Take profit at 2% gain", "Hold for 2 weeks minimum"],
            "correct_index": 1,
            "explanation": "The 2% rule caps single-trade risk at 2% of account equity, preserving capital and preventing any one loss from being catastrophic.",
        },
        {
            "question": "What is a 'risk-reward ratio' of 1:3?",
            "options": ["Risk $3 to make $1", "Risk $1 to make $3", "Risk and reward are equal", "Win 3 out of every 10 trades"],
            "correct_index": 1,
            "explanation": "A 1:3 risk-reward ratio means for every $1 risked, the potential reward is $3 — you only need to be right ~33% of the time to be profitable.",
        },
        {
            "question": "At what point should you consider stopping trading for the day?",
            "options": ["After 1 trade", "After making money", "After hitting your max daily loss limit", "After lunch"],
            "correct_index": 2,
            "explanation": "A predefined max daily loss limit protects you from revenge trading and prevents one bad day from wiping out a week of gains.",
        },
    ],
    "Market Psychology": [
        # Maps to "Technical Analysis Foundations" track in DB
        {
            "question": "What emotion typically causes traders to hold losing positions too long?",
            "options": ["Greed", "Fear of being wrong (loss aversion)", "Overconfidence", "FOMO"],
            "correct_index": 1,
            "explanation": "Loss aversion — the psychological pain of realizing a loss — causes traders to hold losers hoping for a recovery instead of cutting losses.",
        },
        {
            "question": "FOMO stands for and causes traders to?",
            "options": [
                "Fear Of Missed Opportunity — enter trades too late at bad prices",
                "Focus On Money Only — over-trade",
                "Full Order Market Operations — use limit orders",
                "First Order, More Orders — average down",
            ],
            "correct_index": 0,
            "explanation": "FOMO (Fear Of Missed Opportunity) drives traders to chase moves after they've already happened, entering at extended prices with poor risk-reward.",
        },
        {
            "question": "Revenge trading after a loss typically results in?",
            "options": ["Recovering losses faster", "Better decision making", "Larger losses and emotional decisions", "Higher win rates"],
            "correct_index": 2,
            "explanation": "Revenge trading compounds losses because emotional state overrides logic, leading to oversized positions and impulsive entries outside your plan.",
        },
        {
            "question": "Why do institutional investors have an edge over retail traders?",
            "options": [
                "They have better luck",
                "Access to superior data, larger teams, and no emotional bias",
                "They always trade with the trend",
                "They know the market direction in advance",
            ],
            "correct_index": 1,
            "explanation": "Institutions leverage proprietary data, dedicated research teams, and systematic (emotionless) processes that give them a consistent analytical edge.",
        },
        {
            "question": "The best mindset before entering a trade is?",
            "options": [
                "'I must win this trade'",
                "'This setup has a proven edge, I accept the outcome either way'",
                "'The market owes me after my last loss'",
                "'Everyone else is buying so I should too'",
            ],
            "correct_index": 1,
            "explanation": "Process-focused thinking — trusting your edge and accepting uncertainty — is the hallmark of professional traders and leads to consistent execution.",
        },
    ],
}


def main():
    print("\n🎯 CheatCode OS — Dojo Quiz Seeder")
    print("=" * 50)

    total_inserted = 0
    total_skipped = 0

    # Map local track names to DB track titles
    TRACK_NAME_MAP = {
        "Breakout Mastery": "Breakout Mastery",
        "Risk Management": "Risk Management",
        "Market Psychology": "Technical Analysis Foundations",
    }

    for track_name, questions in QUIZ_DATA.items():
        db_track_name = TRACK_NAME_MAP.get(track_name, track_name)
        print(f"\n📚 Track: {track_name} → '{db_track_name}'")

        # Look up track ID
        track_res = supabase.table("dojo_tracks").select("id, title").eq("title", db_track_name).execute()
        if not track_res.data:
            print(f"  ⚠️  Track '{track_name}' not found in dojo_tracks table — skipping")
            continue

        track_id = track_res.data[0]["id"]
        print(f"  ✅ Found track ID: {track_id}")

        # Check if questions already exist
        count_res = supabase.table("dojo_quizzes").select("id", count="exact").eq("track_id", track_id).execute()
        existing_count = count_res.count if hasattr(count_res, "count") and count_res.count else len(count_res.data)

        if existing_count > 0:
            print(f"  ⏭️  {existing_count} questions already exist — skipping (delete them manually to re-seed)")
            total_skipped += existing_count
            continue

        # Insert questions — DB schema has no correct_index column,
        # so encode it in explanation as "[CORRECT:N] explanation text"
        import json
        rows = [
            {
                "track_id": track_id,
                "question": q["question"],
                "options": json.dumps(q["options"]),
                "explanation": f"[CORRECT:{q['correct_index']}] {q['explanation']}",
                "difficulty": "intermediate",
                "order_index": i,
            }
            for i, q in enumerate(questions)
        ]

        insert_res = supabase.table("dojo_quizzes").insert(rows).execute()
        inserted = len(insert_res.data) if insert_res.data else 0
        print(f"  ✅ Inserted {inserted} questions")
        total_inserted += inserted

    print("\n" + "=" * 50)
    print(f"✅ Done — {total_inserted} inserted, {total_skipped} already existed")


if __name__ == "__main__":
    main()
