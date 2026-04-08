"""Intelligence Brain — convergence scoring, prediction cards, radar generation."""

import json
import logging
from datetime import datetime, timezone, timedelta
import httpx
from app.core.config import get_settings
from app.core.supabase import get_supabase, maybe_one

log = logging.getLogger("intelligence")


# ── Convergence Scoring ──────────────────────────────────────────────────────

def compute_convergence_score(evidence: list[dict]) -> dict:
    """Compute convergence score from evidence chain.

    Evidence format: [{source, signal, direction, strength, timestamp}]
    Returns: {score, direction, confidence, source_count}
    """
    if not evidence:
        return {"score": 0, "direction": "neutral", "confidence": "low", "source_count": 0}

    # Count unique sources
    sources = set()
    bullish_count = 0
    bearish_count = 0
    total_strength = 0

    for e in evidence:
        sources.add(e.get("source", "unknown"))
        direction = e.get("direction", "neutral")
        strength = e.get("strength", 0.5)
        total_strength += strength
        if direction == "bullish":
            bullish_count += 1
        elif direction == "bearish":
            bearish_count += 1

    source_count = len(sources)

    # Base score from source count
    base_scores = {1: 40, 2: 60, 3: 80, 4: 90, 5: 95}
    base = base_scores.get(min(source_count, 5), 95)

    # Direction
    if bullish_count > bearish_count:
        direction = "bullish"
    elif bearish_count > bullish_count:
        direction = "bearish"
    elif bullish_count == bearish_count and bullish_count > 0:
        direction = "contested"
        base = int(base * 0.7)  # contested reduces score
    else:
        direction = "neutral"
        base = int(base * 0.5)

    # Temporal clustering modifier: evidence within 48h boosts score
    recent_count = 0
    cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
    for e in evidence:
        ts = e.get("timestamp")
        if ts:
            try:
                if isinstance(ts, str):
                    ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                if ts > cutoff:
                    recent_count += 1
            except (ValueError, TypeError):
                pass

    if recent_count >= 3:
        base = min(base + 5, 100)

    # Average strength modifier
    avg_strength = total_strength / len(evidence) if evidence else 0.5
    score = int(base * (0.8 + avg_strength * 0.4))
    score = max(0, min(100, score))

    # Confidence
    if score >= 85 and source_count >= 3:
        confidence = "very_high"
    elif score >= 70 and source_count >= 2:
        confidence = "high"
    elif score >= 50:
        confidence = "medium"
    else:
        confidence = "low"

    return {
        "score": score,
        "direction": direction,
        "confidence": confidence,
        "source_count": source_count,
    }


# ── Ticker Update ────────────────────────────────────────────────────────────

async def update_ticker_convergence(symbol: str, new_evidence: list[dict]):
    """Update a ticker's convergence score with new evidence."""
    db = get_supabase()

    # Fetch existing evidence
    existing = maybe_one(db.table("tickers").select("evidence_chain").eq("symbol", symbol))
    if existing.data:
        old_evidence = existing.data.get("evidence_chain", [])
    else:
        old_evidence = []

    # Merge, keeping last 30 days of evidence
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    combined = [e for e in old_evidence if e.get("timestamp", "") > cutoff] + new_evidence

    # Compute new score
    result = compute_convergence_score(combined)

    # Determine timeframe from evidence patterns
    timeframe = _infer_timeframe(combined)

    update = {
        "convergence_score": result["score"],
        "direction": result["direction"],
        "confidence": result["confidence"],
        "source_count": result["source_count"],
        "evidence_chain": combined,
        "timeframe": timeframe,
        "scored_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    db.table("tickers").upsert({"symbol": symbol, **update}).execute()
    return result


def _infer_timeframe(evidence: list[dict]) -> str:
    """Infer trading timeframe from evidence signals."""
    signals = [e.get("signal", "") for e in evidence]
    signal_text = " ".join(signals).lower()
    if any(w in signal_text for w in ["intraday", "scalp", "day trade", "1-min", "5-min"]):
        return "day_trade"
    if any(w in signal_text for w in ["swing", "weekly", "2-5 days", "breakout"]):
        return "swing"
    if any(w in signal_text for w in ["position", "monthly", "long-term", "accumulation"]):
        return "position"
    return "swing"  # default


# ── Data Source Agents ────────────────────────────────────────────────────────

async def run_news_agent() -> list[dict]:
    """Collect news signals via Perplexity sonar for active tickers and themes."""
    s = get_settings()
    db = get_supabase()

    # Get tickers with recent activity
    tickers = db.table("tickers").select("symbol, name, themes").gte("convergence_score", 40).limit(30).execute()
    themes = db.table("themes").select("name").in_("status", ["active", "escalating"]).execute()

    symbols = [t["symbol"] for t in (tickers.data or [])]
    theme_names = [t["name"] for t in (themes.data or [])]

    if not symbols and not theme_names:
        return []

    query = f"Latest market-moving news for: {', '.join(symbols[:15])}. Themes: {', '.join(theme_names[:10])}. Focus on catalysts, earnings, FDA, policy, macro events. For each piece of news, identify the ticker(s) affected and whether the signal is bullish or bearish."

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.perplexity.ai/chat/completions",
            headers={"Authorization": f"Bearer {s.perplexity_api_key}"},
            json={
                "model": "sonar",
                "messages": [{"role": "user", "content": query}],
            },
            timeout=30,
        )
        data = resp.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

    # Parse into evidence items via Claude
    import anthropic
    parser = anthropic.Anthropic(api_key=s.anthropic_api_key)
    parse_resp = parser.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1500,
        messages=[{"role": "user", "content": f"""Extract ticker evidence from this news summary. Return a JSON array of objects:
[{{"ticker": "AAPL", "signal": "FDA approval for health sensor", "direction": "bullish", "strength": 0.8, "source": "news"}}]

Only include items where you can identify a specific ticker and direction. strength is 0-1.

News:
{content[:4000]}

Return ONLY valid JSON array."""}],
    )

    try:
        text = parse_resp.content[0].text
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        evidence = json.loads(text)
        for e in evidence:
            e["timestamp"] = datetime.now(timezone.utc).isoformat()
            e["source"] = "news"
        return evidence
    except (json.JSONDecodeError, IndexError):
        return []


async def run_flow_agent() -> list[dict]:
    """Collect dark pool / unusual options signals."""
    # TODO: Integrate Unusual Whales or Quiver Quant API
    # For now, return empty — will be wired in Phase 5
    return []


async def run_macro_agent() -> list[dict]:
    """Collect macro signals from FRED."""
    # TODO: FRED API integration for regime classification
    return []


async def run_insider_agent() -> list[dict]:
    """Collect insider trading + congressional trades."""
    # TODO: SEC EDGAR + Capitol Trades
    return []


async def run_earnings_agent() -> list[dict]:
    """Collect earnings signals from EODHD."""
    s = get_settings()
    if not s.eodhd_api_key:
        return []

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://eodhistoricaldata.com/api/calendar/earnings",
            params={"api_token": s.eodhd_api_key, "fmt": "json", "from": datetime.now().strftime("%Y-%m-%d")},
            timeout=15,
        )
        if resp.status_code != 200:
            return []
        data = resp.json()

    evidence = []
    for item in (data.get("earnings", []) or [])[:50]:
        ticker = item.get("code", "").split(".")[0]
        if not ticker:
            continue
        actual = item.get("actual")
        estimate = item.get("estimate")
        if actual is not None and estimate is not None:
            try:
                actual_f = float(actual)
                estimate_f = float(estimate)
                if estimate_f != 0:
                    surprise_pct = (actual_f - estimate_f) / abs(estimate_f) * 100
                    direction = "bullish" if surprise_pct > 5 else ("bearish" if surprise_pct < -5 else "neutral")
                    if direction != "neutral":
                        evidence.append({
                            "ticker": ticker,
                            "signal": f"Earnings {'beat' if direction == 'bullish' else 'miss'}: actual {actual} vs est {estimate} ({surprise_pct:+.1f}%)",
                            "direction": direction,
                            "strength": min(abs(surprise_pct) / 20, 1.0),
                            "source": "earnings",
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        })
            except (ValueError, TypeError):
                pass

    return evidence


async def run_content_agent() -> list[dict]:
    """Extract signals from recently curated content transcripts."""
    db = get_supabase()
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    recent = db.table("content_tickers").select(
        "ticker, mention_context, sentiment, content(title, curated_at)"
    ).gte("created_at", cutoff).execute()

    evidence = []
    for item in (recent.data or []):
        if not item.get("ticker") or not item.get("sentiment") or item["sentiment"] == "neutral":
            continue
        evidence.append({
            "ticker": item["ticker"],
            "signal": f"Expert mention: {item.get('mention_context', '')[:100]}",
            "direction": item["sentiment"],
            "strength": 0.6,
            "source": "curated_content",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    return evidence


# ── Brain Cycle ──────────────────────────────────────────────────────────────

async def run_brain_cycle():
    """Run all data source agents and update convergence scores."""
    log.info("Starting brain cycle...")

    # Run agents (news + earnings + content for now)
    all_evidence = []
    for agent_name, agent_fn in [
        ("news", run_news_agent),
        ("earnings", run_earnings_agent),
        ("content", run_content_agent),
        ("flow", run_flow_agent),
        ("macro", run_macro_agent),
        ("insider", run_insider_agent),
    ]:
        try:
            evidence = await agent_fn()
            all_evidence.extend(evidence)
            log.info("Agent %s: %d signals", agent_name, len(evidence))
        except Exception as e:
            log.error("Agent %s failed: %s", agent_name, e)

    # Group evidence by ticker
    by_ticker: dict[str, list] = {}
    for e in all_evidence:
        ticker = e.get("ticker")
        if ticker:
            by_ticker.setdefault(ticker, []).append(e)

    # Update convergence scores
    updated = 0
    for ticker, evidence in by_ticker.items():
        result = await update_ticker_convergence(ticker, evidence)
        if result["score"] >= 60:
            await _maybe_create_prediction(ticker, result, evidence)
        updated += 1

    log.info("Brain cycle complete: %d tickers updated from %d total signals", updated, len(all_evidence))
    return {"tickers_updated": updated, "total_signals": len(all_evidence)}


async def _maybe_create_prediction(ticker: str, convergence: dict, evidence: list[dict]):
    """Create or update prediction card for high-conviction tickers."""
    db = get_supabase()

    # Check if active prediction already exists
    existing = maybe_one(db.table("predictions").select("id, convergence_score").eq("ticker", ticker).eq("status", "active"))
    if existing.data:
        # Update if score changed significantly
        old_score = existing.data["convergence_score"]
        if abs(convergence["score"] - old_score) >= 5:
            db.table("predictions").update({
                "convergence_score": convergence["score"],
                "evidence_chain": evidence,
            }).eq("id", existing.data["id"]).execute()
        return

    if convergence["score"] < 60:
        return

    # Get ticker themes
    ticker_data = maybe_one(db.table("tickers").select("themes, name").eq("symbol", ticker))
    themes = (ticker_data.data or {}).get("themes", [])

    db.table("predictions").insert({
        "ticker": ticker,
        "direction": convergence["direction"],
        "convergence_score": convergence["score"],
        "timeframe": _infer_timeframe(evidence),
        "confidence": convergence["confidence"],
        "evidence_chain": evidence,
        "theme": themes[0] if themes else None,
        "related_tickers": [],
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
    }).execute()


# ── Radar Generation ─────────────────────────────────────────────────────────

async def generate_radar() -> dict:
    """Generate daily radar snapshot from current ticker data.

    Two-tier sourcing strategy:
      1. Primary: tickers with convergence_score >= 40 (intelligence-scored)
      2. Fallback: top trending tickers if intelligence is sparse

    The fallback was added 2026-04-08 because the convergence brain only
    covers ~40 manually-curated tickers — leaving the radar mostly empty
    against the new 33K-ticker universe. The trending fallback ensures
    the radar always has real content from real movers.
    """
    db = get_supabase()
    s = get_settings()

    # Get intelligence-scored tickers first
    tickers = db.table("tickers").select("*").gte("convergence_score", 40).order("convergence_score", desc=True).execute()

    critical = []     # 90+
    high_conv = []    # 75-89
    watch = []        # 60-74
    contested = []

    for t in (tickers.data or []):
        entry = {
            "symbol": t["symbol"],
            "name": t.get("name"),
            "score": t["convergence_score"],
            "direction": t.get("direction"),
            "timeframe": t.get("timeframe"),
            "confidence": t.get("confidence"),
        }
        if t.get("direction") == "contested":
            contested.append(entry)
        elif t["convergence_score"] >= 90:
            critical.append(entry)
        elif t["convergence_score"] >= 75:
            high_conv.append(entry)
        elif t["convergence_score"] >= 60:
            watch.append(entry)

    # Always supplement with trending tickers up to ~30 total. This fills
    # the radar with real content from the live trending system whenever
    # the convergence brain isn't producing enough scored tickers
    # (which is the default state for the new 33K-ticker universe).
    #
    # We use RANK-based bucketing (top 5 = critical, next 10 = high_conv,
    # next 15 = watch) instead of absolute score thresholds because the
    # trending formula's max score in the cold-start state (no social,
    # no content signal) is ~60, so threshold-based bucketing would
    # leave critical/high_conviction empty even when we have great data.
    TARGET_TOTAL = 30
    if (len(critical) + len(high_conv) + len(watch)) < TARGET_TOTAL:
        log.info("generate_radar: intelligence sparse — falling back to trending tickers")
        # Filter out the existing intelligence tickers + the obvious junk
        # (microcaps under $0.01, names that look like derivative tokens)
        already_symbols = {x["symbol"] for x in critical + high_conv + watch + contested}

        trending = (
            db.table("tickers")
            .select("symbol, name, trending_score, price_change_pct, last_price, asset_class")
            .gt("trending_score", 0)
            .gt("last_price", 0.01)  # filter penny stocks / dust crypto
            .order("trending_score", desc=True)
            .limit(60)  # over-fetch so the dedup pass still leaves enough
            .execute()
        )

        deduped = [t for t in (trending.data or []) if t["symbol"] not in already_symbols]

        def _entry(t):
            score = int(t.get("trending_score") or 0)
            change = float(t.get("price_change_pct") or 0)
            direction = "bullish" if change > 0.5 else "bearish" if change < -0.5 else "neutral"
            return {
                "symbol": t["symbol"],
                "name": t.get("name"),
                "score": score,
                "direction": direction,
                "timeframe": "intraday",
                "confidence": "high" if score >= 50 else "medium" if score >= 30 else "low",
                "last_price": t.get("last_price"),
                "price_change_pct": t.get("price_change_pct"),
            }

        # Rank-based bucketing — always produces 30 tickers split across 3 buckets
        critical.extend(_entry(t) for t in deduped[:5])
        high_conv.extend(_entry(t) for t in deduped[5:15])
        watch.extend(_entry(t) for t in deduped[15:30])

    # Get theme heatmap
    themes = db.table("themes").select("name, status, escalation_score, tickers").in_("status", ["emerging", "active", "escalating"]).execute()
    theme_heatmap = [
        {"name": t["name"], "status": t["status"], "score": t["escalation_score"], "tickers": t.get("tickers", [])}
        for t in (themes.data or [])
    ]

    # Determine market sentiment via Claude
    import anthropic
    client = anthropic.Anthropic(api_key=s.anthropic_api_key)
    summary_data = {
        "critical_count": len(critical),
        "bullish_count": sum(1 for t in (tickers.data or []) if t.get("direction") == "bullish"),
        "bearish_count": sum(1 for t in (tickers.data or []) if t.get("direction") == "bearish"),
        "escalating_themes": [t["name"] for t in (themes.data or []) if t["status"] == "escalating"],
    }

    sentiment_resp = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=200,
        messages=[{"role": "user", "content": f"""Based on this market data, return a JSON object with:
- "sentiment": one of "bullish", "bearish", "choppy", "neutral"
- "summary": one sentence describing today's market regime

Data: {json.dumps(summary_data)}

Return ONLY valid JSON."""}],
    )

    try:
        text = sentiment_resp.content[0].text
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        sentiment_data = json.loads(text)
    except (json.JSONDecodeError, IndexError):
        sentiment_data = {"sentiment": "neutral", "summary": "Mixed signals across the market."}

    # Upsert radar snapshot
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    snapshot = {
        "date": today,
        "market_sentiment": sentiment_data["sentiment"],
        "sentiment_summary": sentiment_data.get("summary"),
        "critical": critical,
        "high_conviction": high_conv,
        "watch": watch,
        "contested": contested,
        "theme_heatmap": theme_heatmap,
        "sector_rotation": {},
    }

    db.table("radar_snapshots").upsert(snapshot, on_conflict="date").execute()
    return snapshot
