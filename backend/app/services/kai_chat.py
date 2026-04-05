"""Kai Chat — AI analyst powered by convergence brain + vault RAG."""

import json
import logging
from datetime import datetime, timezone
import anthropic
from app.core.config import get_settings
from app.core.supabase import get_supabase, maybe_one
from app.services.curation import generate_embedding

log = logging.getLogger("kai_chat")

KAI_SYSTEM_PROMPT = """You are Kai, the AI market analyst for CheatCode OS. You are calm, clinical, and data-first. You speak with authority but never hype.

Your voice: kai_transmission — measured, precise, no fluff. Short paragraphs. Data before opinion. When uncertain, say so.

You have access to:
1. CONVERGENCE BRAIN — multi-source convergence scores for tickers (news, flow, macro, insider, earnings, curated expert content)
2. CURATED CONTENT — transcripts and insights from top finance YouTubers and podcasters
3. THEME TRACKING — active market themes with escalation status
4. TRADING FRAMEWORKS — KB of technical analysis, supply/demand, VCP, ORB patterns

When a user asks about a ticker:
- Lead with the convergence score and direction
- Cite specific evidence from sources
- Reference curated content if relevant ("Minervini covered this on April 2...")
- Mention the theme if it belongs to one
- Give catalyst and invalidation levels
- Be actionable

When asked general questions:
- Reference the radar and active themes
- Point to relevant curated content
- Keep it educational but not condescending

Rules:
- NEVER give specific trade advice ("buy AAPL at $180")
- ALWAYS frame as analysis, not recommendations
- If convergence data is thin, say so — don't fabricate confidence
- Use the sources provided to ground every claim"""


async def chat(
    user_id: str,
    message: str,
    conversation_id: str | None = None,
    user_tier: str = "free",
) -> dict:
    """Process a Kai chat message and return response."""
    s = get_settings()
    db = get_supabase()

    # Check message limits for free users
    if user_tier == "free":
        profile = db.table("profiles").select("kai_messages_today, kai_messages_reset_at").eq("id", user_id).single().execute()
        p = profile.data
        reset_at = datetime.fromisoformat(p["kai_messages_reset_at"].replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)

        # Reset daily counter if past midnight UTC
        if now.date() > reset_at.date():
            db.table("profiles").update({
                "kai_messages_today": 0,
                "kai_messages_reset_at": now.isoformat(),
            }).eq("id", user_id).execute()
            messages_today = 0
        else:
            messages_today = p["kai_messages_today"]

        remaining = max(0, s.kai_free_messages_per_day - messages_today)
        if remaining <= 0:
            return {
                "conversation_id": conversation_id or "",
                "message": {
                    "role": "assistant",
                    "content": "You've reached your daily message limit. Upgrade to Pro for unlimited Kai access.",
                    "sources": None,
                },
                "remaining_messages": 0,
            }
    else:
        remaining = None
        messages_today = 0

    # Get or create conversation
    if conversation_id:
        conv = maybe_one(db.table("kai_conversations").select("id").eq("id", conversation_id).eq("user_id", user_id))
        if not conv.data:
            conversation_id = None

    if not conversation_id:
        result = db.table("kai_conversations").insert({
            "user_id": user_id,
            "title": message[:100],
        }).execute()
        conversation_id = result.data[0]["id"]

    # Save user message
    db.table("kai_messages").insert({
        "conversation_id": conversation_id,
        "role": "user",
        "content": message,
    }).execute()

    # Gather context for RAG
    context = await _gather_context(message, user_tier)

    # Get conversation history (last 10 messages)
    history = db.table("kai_messages").select("role, content").eq(
        "conversation_id", conversation_id
    ).order("created_at").limit(20).execute()

    messages = []
    for msg in (history.data or [])[-10:]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Build system prompt with context
    system = KAI_SYSTEM_PROMPT + "\n\n--- CONTEXT FOR THIS QUERY ---\n" + context

    # Call Claude
    client = anthropic.Anthropic(api_key=s.anthropic_api_key)
    response = client.messages.create(
        model=s.kai_model,
        max_tokens=1500,
        system=system,
        messages=messages,
    )

    assistant_text = response.content[0].text

    # Extract sources mentioned
    sources = _extract_sources(context)

    # Save assistant message
    db.table("kai_messages").insert({
        "conversation_id": conversation_id,
        "role": "assistant",
        "content": assistant_text,
        "sources": sources,
    }).execute()

    # Update conversation
    db.table("kai_conversations").update({
        "message_count": len(messages) + 1,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", conversation_id).execute()

    # Increment message counter for free users
    if user_tier == "free":
        db.table("profiles").update({
            "kai_messages_today": messages_today + 1,
        }).eq("id", user_id).execute()
        remaining = max(0, s.kai_free_messages_per_day - messages_today - 1)

    return {
        "conversation_id": conversation_id,
        "message": {
            "role": "assistant",
            "content": assistant_text,
            "sources": sources,
        },
        "remaining_messages": remaining,
    }


async def _gather_context(query: str, tier: str) -> str:
    """Gather relevant context from brain, content, and themes."""
    db = get_supabase()
    sections = []

    # 1. Extract tickers from query
    tickers = _extract_tickers(query)

    # 2. Ticker convergence data
    if tickers:
        for symbol in tickers[:5]:
            result = maybe_one(db.table("tickers").select("*").eq("symbol", symbol))
            if result.data:
                t = result.data
                sections.append(f"""TICKER: {t['symbol']} ({t.get('name', '')})
Convergence Score: {t['convergence_score']}/100 | Direction: {t.get('direction')} | Confidence: {t.get('confidence')} | Timeframe: {t.get('timeframe')}
Evidence ({t.get('source_count', 0)} sources): {json.dumps(t.get('evidence_chain', [])[:5])}
Themes: {', '.join(t.get('themes', []))}
Catalyst: {t.get('catalyst', 'N/A')} | Invalidation: {t.get('invalidation', 'N/A')}""")

    # 3. Semantic search for relevant curated content
    try:
        query_embedding = await generate_embedding(query)
        # Use Supabase RPC for vector similarity search
        content_results = db.rpc("match_content", {
            "query_embedding": query_embedding,
            "match_threshold": 0.3,
            "match_count": 5,
        }).execute()

        for c in (content_results.data or []):
            sections.append(f"""CURATED CONTENT: "{c['title']}"
Creator: {c.get('creator_name', 'Unknown')} | Published: {c.get('published_at', '')}
Quick Take: {c.get('quick_take', '')}
Key Insights: {json.dumps(c.get('key_insights', [])[:3])}""")
    except Exception as e:
        log.warning("Semantic search failed: %s", e)

    # 3b. Granular KB chunk search (deep transcript search)
    try:
        if not query_embedding:
            query_embedding = await generate_embedding(query)
        chunk_results = db.rpc("match_kb_chunks", {
            "query_embedding": query_embedding,
            "match_threshold": 0.35,
            "match_count": 5,
        }).execute()

        for ch in (chunk_results.data or []):
            sections.append(f"""TRANSCRIPT EXCERPT from "{ch.get('content_title', '')}" ({ch.get('creator_name', '')}):
{ch['text'][:500]}""")
    except Exception as e:
        log.warning("KB chunk search failed: %s", e)

    # 4. Active themes
    themes = db.table("themes").select("name, status, description, tickers, escalation_score").in_(
        "status", ["active", "escalating"]
    ).order("escalation_score", desc=True).limit(5).execute()

    if themes.data:
        theme_text = "\n".join(
            f"- {t['name']} ({t['status']}, score={t['escalation_score']}): {t.get('description', '')[:100]} — tickers: {', '.join(t.get('tickers', [])[:5])}"
            for t in themes.data
        )
        sections.append(f"ACTIVE THEMES:\n{theme_text}")

    # 5. Today's radar
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    radar = maybe_one(db.table("radar_snapshots").select("market_sentiment, sentiment_summary, critical, high_conviction").eq("date", today))
    if radar.data:
        r = radar.data
        sections.append(f"""TODAY'S RADAR:
Sentiment: {r['market_sentiment']} — {r.get('sentiment_summary', '')}
Critical: {json.dumps(r.get('critical', [])[:5])}
High Conviction: {json.dumps(r.get('high_conviction', [])[:5])}""")

    # 6. Content mentioning queried tickers
    if tickers:
        for symbol in tickers[:3]:
            mentions = db.table("content_tickers").select(
                "mention_context, sentiment, content(title, quick_take, external_url)"
            ).eq("ticker", symbol).order("created_at", desc=True).limit(3).execute()

            for m in (mentions.data or []):
                content = m.get("content", {})
                sections.append(f"""EXPERT MENTION of {symbol}:
Video: "{content.get('title', '')}"
Context: {m.get('mention_context', '')}
Sentiment: {m.get('sentiment', 'N/A')}""")

    return "\n\n".join(sections) if sections else "No specific data available for this query. Respond based on general market knowledge."


def _extract_tickers(text: str) -> list[str]:
    """Extract potential ticker symbols from text."""
    import re
    # Match $AAPL or standalone 1-5 letter uppercase words
    dollar_tickers = re.findall(r'\$([A-Z]{1,5})', text)
    # Common patterns
    word_tickers = re.findall(r'\b([A-Z]{2,5})\b', text)
    # Filter out common words
    noise = {"THE", "AND", "FOR", "ARE", "BUT", "NOT", "YOU", "ALL", "CAN", "HAD", "HER",
             "WAS", "ONE", "OUR", "OUT", "HAS", "HIS", "HOW", "ITS", "MAY", "NEW", "NOW",
             "OLD", "SEE", "WAY", "WHO", "BOY", "DID", "GET", "HIM", "LET", "SAY", "SHE",
             "TOO", "USE", "WHAT", "WITH", "ABOUT", "THINK", "KNOW", "JUST", "LOOK"}
    word_tickers = [t for t in word_tickers if t not in noise]
    return list(dict.fromkeys(dollar_tickers + word_tickers))[:10]


def _extract_sources(context: str) -> list[dict]:
    """Extract source references from context for citation."""
    sources = []
    for line in context.split("\n"):
        if line.startswith("TICKER:"):
            symbol = line.split(":")[1].strip().split(" ")[0]
            sources.append({"type": "ticker", "id": symbol, "title": f"Convergence: {symbol}"})
        elif line.startswith('CURATED CONTENT: "'):
            title = line.split('"')[1]
            sources.append({"type": "content", "title": title})
        elif line.startswith("EXPERT MENTION of"):
            ticker = line.split("of ")[-1].strip().rstrip(":")
            sources.append({"type": "mention", "id": ticker, "title": f"Expert mention: {ticker}"})
    return sources[:10]
