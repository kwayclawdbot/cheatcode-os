"""Intelligence API — ticker lookup, predictions, radar, themes."""

import logging
from collections import Counter
from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.supabase import get_supabase, maybe_one
from app.core.auth import get_current_user, require_pro
from app.models.content import TickerLookup, TickerDetail, PredictionCard, RadarSnapshot, ThemeDetail, ContentCard
from datetime import datetime, timezone

log = logging.getLogger("intelligence")

router = APIRouter(prefix="/intelligence", tags=["intelligence"])


# ── Ticker page enrichment helpers ─────────────────────────────────────────

def _build_score_breakdown(data: dict, evidence_chain: list[dict]) -> dict:
    """Build visual score breakdown from RAW TICKER DATA first (zero AI),
    then layer on evidence_chain signals if available.

    Every ticker in the 33K universe gets a populated breakdown from the
    EODHD-synced fields already in the tickers table.
    """
    # ── Tier 1: pure data, every ticker, $0 ──
    chg = abs(float(data.get("price_change_pct") or 0))
    # Price momentum: 1% = 5pts, 3% = 10, 5% = 15, 10%+ = 25
    momentum = min(25, round(chg * 2.5))

    # Volume anomaly: ratio of today vs 20d avg
    vol = float(data.get("last_volume") or 0)
    avg_vol = float(data.get("volume_avg_20d") or 1) or 1
    vol_ratio = vol / avg_vol
    # 1x = 0, 1.5x = 8, 2x = 15, 3x+ = 25
    volume = min(25, round(max(0, (vol_ratio - 1.0)) * 16))

    # 52-week proximity (how close to 52W high)
    high_52w = float(data.get("high_52w") or 0)
    price = float(data.get("last_price") or 0)
    if high_52w > 0 and price > 0:
        proximity = price / high_52w  # 1.0 = at high, 0.5 = 50% off
        technical = min(25, round(proximity * 25))
    else:
        technical = 0

    # Sector presence (has sector data = some points)
    sector_score = 10 if data.get("sector") else 0

    # Trending score contribution
    ts = float(data.get("trending_score") or 0)
    # trending_score 0-100 → 0-15 pts
    content = min(15, round(ts * 0.15))

    # ── Tier 3: evidence chain enrichment (AI-scored tickers only) ──
    catalyst = 0
    flow = 0
    for ev in (evidence_chain or []):
        src = ev.get("source", "").lower()
        strength = float(ev.get("strength", 0.6))
        if src in ("earnings", "news"):
            catalyst = min(25, catalyst + round(strength * 12))
        elif src in ("flow", "insider"):
            flow = min(25, flow + round(strength * 12))
        elif src == "content":
            content = min(25, content + round(strength * 5))

    return {
        "technical": technical,
        "momentum": momentum,
        "volume": volume,
        "sector": sector_score,
        "catalyst": catalyst,
        "content": content,
        "flow": flow,
    }


def _build_drivers(data: dict) -> list[dict]:
    """Build driver pills from RAW ticker data. Every ticker gets drivers.

    Sources (all zero AI, all from tickers table):
    - Price move magnitude + direction
    - Volume anomaly ratio
    - 52W high proximity
    - Sector
    - Themes (if tagged)
    - Trending score context
    """
    drivers: list[dict] = []
    chg = float(data.get("price_change_pct") or 0)
    vol = float(data.get("last_volume") or 0)
    avg_vol = float(data.get("volume_avg_20d") or 1) or 1
    vol_ratio = vol / avg_vol
    high_52w = float(data.get("high_52w") or 0)
    price = float(data.get("last_price") or 0)
    sector = data.get("sector")
    themes = data.get("themes") or []

    # Price move
    if abs(chg) >= 1:
        direction = "up" if chg > 0 else "down"
        drivers.append({
            "icon": "trending-up" if chg > 0 else "trending-down",
            "text": f"{'+' if chg > 0 else ''}{chg:.1f}% {'rally' if chg > 0 else 'selloff'} today",
            "type": "momentum",
        })

    # Volume spike
    if vol_ratio >= 1.5:
        drivers.append({
            "icon": "bar-chart",
            "text": f"Volume {vol_ratio:.1f}x average ({vol/1e6:.1f}M vs {avg_vol/1e6:.1f}M avg)",
            "type": "volume",
        })

    # Near 52W high
    if high_52w > 0 and price > 0:
        pct_from_high = ((high_52w - price) / high_52w) * 100
        if pct_from_high <= 5:
            drivers.append({"icon": "arrow-up", "text": f"Within {pct_from_high:.1f}% of 52-week high", "type": "technical"})
        elif pct_from_high >= 30:
            drivers.append({"icon": "arrow-down", "text": f"{pct_from_high:.0f}% below 52-week high", "type": "technical"})

    # Sector
    if sector:
        drivers.append({"icon": "layers", "text": f"Sector: {sector}", "type": "sector"})

    # Themes
    for theme in themes[:2]:
        drivers.append({"icon": "flame", "text": theme, "type": "theme"})

    return drivers[:6]


def _build_track_record(symbol: str, db) -> dict | None:
    """Pull alert history + performance for this ticker from sent_alerts."""
    try:
        alerts_res = (
            db.table("sent_alerts")
            .select("alert_price, breakout_score, setup_label, sent_at, detected_pattern")
            .eq("ticker", symbol)
            .order("sent_at", desc=True)
            .limit(5)
            .execute()
        )
        alerts = alerts_res.data or []
        if not alerts:
            return None

        # Pull performance for these alerts
        perf_res = (
            db.table("alert_performance")
            .select("alert_price, max_gain_pct, status, trade_result")
            .eq("ticker", symbol)
            .order("last_updated", desc=True)
            .limit(10)
            .execute()
        )
        perf = perf_res.data or []
        wins = sum(1 for p in perf if (p.get("max_gain_pct") or 0) > 2)
        total_tracked = len([p for p in perf if p.get("trade_result") != "pending"])

        formatted_alerts = []
        for a in alerts[:3]:
            formatted_alerts.append({
                "date": (a.get("sent_at") or "")[:10],
                "price": float(a.get("alert_price") or 0),
                "score": int(a.get("breakout_score") or 0),
                "pattern": a.get("detected_pattern") or a.get("setup_label"),
            })

        # Find best gain
        best = max((p.get("max_gain_pct") or 0) for p in perf) if perf else None

        return {
            "alerts": formatted_alerts,
            "total_alerts": len(alerts),
            "setup_win_rate": round(wins / total_tracked * 100) if total_tracked > 0 else None,
            "best_gain_pct": round(best, 1) if best and best > 0 else None,
        }
    except Exception as e:
        log.warning("track_record fetch failed for %s: %s", symbol, e)
        return None


def _build_earnings(symbol: str, db) -> dict | None:
    """Pull earnings data from vault_store (Kai earnings intel)."""
    try:
        res = maybe_one(
            db.table("vault_store")
            .select("value")
            .eq("key", f"earnings:{symbol}")
        )
        if not res.data:
            return None
        val = res.data.get("value")
        if not isinstance(val, dict):
            return None

        return {
            "next_date": val.get("next_earnings_date"),
            "timing": val.get("timing"),
            "last_signal": val.get("signal"),
            "tone": val.get("tone"),
            "tone_score": val.get("tone_score"),
            "flags": val.get("flags", [])[:6],
        }
    except Exception as e:
        log.warning("earnings fetch failed for %s: %s", symbol, e)
        return None


def _fill_from_raw_data(data: dict) -> None:
    """Fill direction, convergence_score, timeframe, and key_levels from raw
    EODHD data when the brain hasn't scored this ticker. Mutates in-place.

    Every ticker in the 33K universe gets a populated page — zero AI.
    """
    price = float(data.get("last_price") or 0)
    chg = float(data.get("price_change_pct") or 0)
    vol = float(data.get("last_volume") or 0)
    avg_vol = float(data.get("volume_avg_20d") or 1) or 1
    vol_ratio = vol / avg_vol

    # Direction — derive from price action if brain hasn't set it
    if not data.get("direction"):
        if chg >= 3:
            data["direction"] = "bullish"
        elif chg <= -3:
            data["direction"] = "bearish"
        elif chg >= 1:
            data["direction"] = "bullish"
        elif chg <= -1:
            data["direction"] = "bearish"
        else:
            data["direction"] = "neutral"

    # Convergence score — derive from trending_score + price/volume if 0
    if not data.get("convergence_score"):
        ts = float(data.get("trending_score") or 0)
        # Simple composite: trending weight + volume spike + momentum
        raw = ts * 0.4 + min(30, abs(chg) * 3) + min(30, max(0, (vol_ratio - 1) * 15))
        data["convergence_score"] = min(100, round(raw))

    # Timeframe — infer from move magnitude
    if not data.get("timeframe"):
        if abs(chg) >= 5:
            data["timeframe"] = "day_trade"
        elif abs(chg) >= 2:
            data["timeframe"] = "swing"
        else:
            data["timeframe"] = "position"

    # Key levels — compute from price if empty
    if not data.get("key_levels") or data["key_levels"] == {}:
        if price > 0:
            data["key_levels"] = {
                "support": round(price * 0.97, 2),
                "resistance": round(price * 1.03, 2),
                "invalidation": round(price * 0.93, 2),
            }


@router.get("/ticker/{symbol}", response_model=TickerDetail)
async def ticker_lookup(symbol: str, user: dict | None = Depends(get_current_user)):
    """Ticker intelligence lookup. Returns full detail for all users during testing."""
    db = get_supabase()
    t = maybe_one(db.table("tickers").select("*").eq("symbol", symbol.upper()))
    if not t.data:
        raise HTTPException(status_code=404, detail=f"No data for {symbol.upper()}")

    data = t.data

    # Enrich with live price from EODHD
    from app.services.market_data import fetch_bulk_quotes
    quotes = await fetch_bulk_quotes([symbol.upper()])
    live = quotes.get(symbol.upper())
    if live:
        data["last_price"] = live["price"]
        data["price_change_pct"] = live["change_pct"]

    # Fill direction/convergence/timeframe/key_levels from raw data when
    # the brain hasn't scored this ticker. Every ticker gets a populated
    # page — zero AI required.
    _fill_from_raw_data(data)
    # TODO: Re-gate evidence_chain + related_content behind pro tier once
    # testing is complete. For now, return full TickerDetail for everyone.
    # is_pro = user and user.get("tier") in ("pro", "elite", "admin")

    # Related content
    mentions = db.table("content_tickers").select("content_id").eq("ticker", symbol.upper()).limit(5).execute()
    content_ids = [m["content_id"] for m in (mentions.data or [])]
    related_content = None
    if content_ids:
        rows = db.table("content").select(
            "id, title, content_type, external_url, thumbnail_url, duration_seconds, "
            "quick_take, relevance_score, topics, themes, skill_level, published_at, curated_at, "
            "creators:creator_id(name, slug)"
        ).in_("id", content_ids).eq("is_published", True).execute()
        related_content = []
        for r in (rows.data or []):
            creator = r.pop("creators", None) or {}
            related_content.append(ContentCard(
                id=r["id"], title=r["title"], content_type=r["content_type"],
                external_url=r["external_url"], thumbnail_url=r.get("thumbnail_url"),
                duration_seconds=r.get("duration_seconds"),
                creator_name=creator.get("name"), creator_slug=creator.get("slug"),
                quick_take=r.get("quick_take"), relevance_score=r.get("relevance_score", 0),
                topics=r.get("topics", []), themes=r.get("themes", []),
                skill_level=r.get("skill_level", "intermediate"),
                published_at=r.get("published_at"), curated_at=r["curated_at"],
            ))

    # V2 enrichments — visual components for ticker page
    ev_chain = data.get("evidence_chain", [])
    score_breakdown = _build_score_breakdown(data, ev_chain)
    drivers = _build_drivers(data)
    track_record = _build_track_record(symbol.upper(), db)
    earnings = _build_earnings(symbol.upper(), db)

    return TickerDetail(
        symbol=data["symbol"], name=data.get("name"),
        convergence_score=data["convergence_score"],
        direction=data.get("direction"), timeframe=data.get("timeframe"),
        confidence=data.get("confidence"),
        last_price=data.get("last_price"), price_change_pct=data.get("price_change_pct"),
        evidence_chain=ev_chain,
        source_count=data.get("source_count", 0),
        catalyst=data.get("catalyst"), invalidation=data.get("invalidation"),
        themes=data.get("themes", []),
        related_content=related_content,
        related_tickers=None,
        daily_analysis=data.get("daily_analysis"),
        analysis_date=data.get("analysis_date"),
        key_levels=data.get("key_levels"),
        catalysts=data.get("catalysts"),
        risks=data.get("risks"),
        score_breakdown=score_breakdown,
        drivers=drivers,
        track_record=track_record,
        earnings=earnings,
    )


@router.post("/ticker/{symbol}/analyze")
async def ticker_dossier(symbol: str, user: dict | None = Depends(get_current_user)):
    """Full dossier: aggregates ALL data sources into structured JSON for
    the analysis page. Runs on-demand, caches AI analysis for 24h.

    Data sources (all fetched in parallel):
      - EODHD live quote + fundamentals + news (instant, $0)
      - sent_alerts + alert_performance (instant, $0)
      - vault_store themes + earnings + intel connections (instant, $0)
      - content_tickers → curated videos (instant, $0)
      - community feed posts about this ticker (instant, $0)
      - Kai synthesis (Claude Haiku, ~$0.02, cached 24h)
    """
    import asyncio
    from app.services.market_data import (
        fetch_bulk_quotes, fetch_ticker_news, fetch_ticker_fundamentals,
        fetch_ohlcv_history,
    )
    from app.services.ticker_analysis import analyze_ticker

    sym = symbol.upper()
    db = get_supabase()

    # 1. Check ticker exists
    t = maybe_one(db.table("tickers").select("*").eq("symbol", sym))
    if not t.data:
        raise HTTPException(404, f"Unknown ticker {sym}")
    ticker_data = t.data
    _fill_from_raw_data(ticker_data)

    # 2. Parallel fetch: quote, fundamentals, news, price history, analysis
    quote_task = fetch_bulk_quotes([sym])
    fund_task = fetch_ticker_fundamentals(sym)
    news_task = fetch_ticker_news(sym, limit=10)
    history_task = fetch_ohlcv_history(sym, days=60)

    # Only call Claude if no cached analysis from today
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    needs_analysis = ticker_data.get("analysis_date") != today or not ticker_data.get("daily_analysis")
    analysis_task = analyze_ticker(sym) if needs_analysis else asyncio.sleep(0)

    quote_result, fundamentals, news, price_history, analysis_result = await asyncio.gather(
        quote_task, fund_task, news_task, history_task, analysis_task,
        return_exceptions=True,
    )

    # Process quote
    live_quote = {}
    if isinstance(quote_result, dict):
        live_quote = quote_result.get(sym, {})

    # Process analysis
    kai_analysis = None
    if needs_analysis and isinstance(analysis_result, dict):
        kai_analysis = analysis_result
    elif not needs_analysis:
        kai_analysis = {
            "analysis": ticker_data.get("daily_analysis"),
            "key_levels": ticker_data.get("key_levels"),
            "catalysts": ticker_data.get("catalysts"),
            "risks": ticker_data.get("risks"),
            "tldr": ticker_data.get("catalyst"),
        }

    if isinstance(fundamentals, Exception):
        fundamentals = None
    if isinstance(news, Exception):
        news = []

    # 3. DB lookups (sync, fast)

    # Track record
    track_record = _build_track_record(sym, db)

    # Earnings from vault
    earnings = _build_earnings(sym, db)

    # Related videos
    videos = []
    try:
        mentions = db.table("content_tickers").select("content_id, mention_context, sentiment").eq("ticker", sym).order("created_at", desc=True).limit(8).execute()
        cids = list({m["content_id"] for m in (mentions.data or [])})
        if cids:
            vrows = db.table("content").select(
                "id, title, thumbnail_url, duration_seconds, quick_take, published_at, topics, "
                "creators:creator_id(name, slug)"
            ).in_("id", cids).eq("is_published", True).order("published_at", desc=True).limit(6).execute()
            for v in (vrows.data or []):
                cr = v.pop("creators", None) or {}
                # Find the mention context for this video
                mention = next((m for m in (mentions.data or []) if m["content_id"] == v["id"]), {})
                videos.append({
                    "id": v["id"], "title": v["title"],
                    "thumbnail_url": v.get("thumbnail_url"),
                    "duration_seconds": v.get("duration_seconds"),
                    "quick_take": v.get("quick_take"),
                    "creator_name": cr.get("name"),
                    "published_at": v.get("published_at"),
                    "mention_context": mention.get("mention_context"),
                    "sentiment": mention.get("sentiment"),
                })
    except Exception:
        pass

    # Community posts about this ticker
    community_posts = []
    try:
        posts_res = db.table("feed_posts").select(
            "id, post_type, body, sentiment, created_at, likes_count, "
            "profiles:user_id(display_name, handle, is_agent)"
        ).eq("ticker", sym).order("created_at", desc=True).limit(5).execute()
        for p in (posts_res.data or []):
            prof = p.pop("profiles", None) or {}
            community_posts.append({
                "body": (p.get("body") or "")[:200],
                "sentiment": p.get("sentiment"),
                "post_type": p.get("post_type"),
                "author": prof.get("display_name") or prof.get("handle") or "Trader",
                "is_agent": bool(prof.get("is_agent")),
                "likes": p.get("likes_count", 0),
                "created_at": p.get("created_at"),
            })
    except Exception:
        pass

    # Vault intel connections
    intel_connections = []
    try:
        vault_intel = maybe_one(db.table("vault_store").select("value").eq("key", f"intel:{sym}"))
        if vault_intel.data:
            val = vault_intel.data.get("value")
            if isinstance(val, dict):
                for conn in (val.get("connections") or [])[:8]:
                    intel_connections.append({
                        "headline": conn.get("headline"),
                        "direction": conn.get("direction"),
                        "chain": (conn.get("chain") or "")[:200],
                        "other_tickers": conn.get("tickers_affected", [])[:5],
                    })
    except Exception:
        pass

    # Score breakdown + drivers from raw data
    ev_chain = ticker_data.get("evidence_chain", [])
    score_breakdown = _build_score_breakdown(ticker_data, ev_chain)
    drivers = _build_drivers(ticker_data)

    # Process price history for chart — fetch_ohlcv_history already returns
    # the right shape {date, open, high, low, close, volume}
    chart_data = price_history if isinstance(price_history, list) else []

    # Derive sentiment from NEWS (not price action) — more accurate
    # Derive direction: PRICE ACTION primary, news secondary.
    # A stock up 5% is bullish regardless of fear-laden news headlines.
    safe_news = news if isinstance(news, list) else []
    news_pos = sum(1 for n in safe_news if isinstance(n.get("sentiment"), (int, float)) and n["sentiment"] > 0)
    news_neg = sum(1 for n in safe_news if isinstance(n.get("sentiment"), (int, float)) and n["sentiment"] < 0)

    chg_val = float(live_quote.get("change_pct") or ticker_data.get("price_change_pct") or 0)
    # Price action is the truth — big moves override everything
    if chg_val >= 3:
        derived_direction = "bullish"
    elif chg_val <= -3:
        derived_direction = "bearish"
    elif chg_val >= 1:
        derived_direction = "bullish"
    elif chg_val <= -1:
        derived_direction = "bearish"
    else:
        # Small move — defer to news if we have enough
        news_total = news_pos + news_neg
        if news_total >= 3 and news_pos > news_neg * 2:
            derived_direction = "bullish"
        elif news_total >= 3 and news_neg > news_pos * 2:
            derived_direction = "bearish"
        else:
            derived_direction = "neutral"

    news_sentiment = {
        "positive": news_pos,
        "negative": news_neg,
        "neutral": len(safe_news) - news_pos - news_neg,
        "direction": derived_direction,
    }

    # If no vault intel_connections, build from news cross-references
    if not intel_connections and safe_news:
        # EODHD news articles include "symbols" field with related tickers
        seen_tickers: set[str] = set()
        for article in safe_news:
            title = article.get("title") or ""
            sentiment_val = article.get("sentiment")
            direction_str = "bullish" if isinstance(sentiment_val, (int, float)) and sentiment_val > 0 else "bearish" if isinstance(sentiment_val, (int, float)) and sentiment_val < 0 else "neutral"
            # Extract $TICKER cashtags from title as connections
            import re
            mentioned = re.findall(r'\$([A-Z]{1,5})', title)
            others = [t for t in mentioned if t != sym and t not in seen_tickers]
            if others:
                intel_connections.append({
                    "headline": title[:120],
                    "direction": direction_str,
                    "chain": "",
                    "other_tickers": others[:3],
                })
                seen_tickers.update(others)
                if len(intel_connections) >= 6:
                    break

    # 4. Build response — comprehensive structured JSON
    return {
        # Header
        "symbol": sym,
        "name": ticker_data.get("name") or (fundamentals or {}).get("name"),
        "last_price": live_quote.get("price") or ticker_data.get("last_price"),
        "price_change_pct": live_quote.get("change_pct") or ticker_data.get("price_change_pct"),
        "convergence_score": ticker_data.get("convergence_score"),
        "direction": derived_direction,
        "timeframe": ticker_data.get("timeframe"),
        "sector": ticker_data.get("sector") or (fundamentals or {}).get("sector"),
        "themes": ticker_data.get("themes", []),

        # Score + drivers
        "score_breakdown": score_breakdown,
        "drivers": drivers,

        # Fundamentals (visual cards)
        "fundamentals": fundamentals if not isinstance(fundamentals, Exception) else None,

        # News (card scroll) + aggregate sentiment
        "news": safe_news[:6],
        "news_sentiment": news_sentiment,

        # Price history for chart (60 days OHLCV)
        "price_history": chart_data,

        # Kai synthesis (cached 24h)
        "kai_analysis": {
            "tldr": (kai_analysis or {}).get("tldr") or (kai_analysis or {}).get("catalyst"),
            "analysis": (kai_analysis or {}).get("analysis") or (kai_analysis or {}).get("daily_analysis"),
            "key_levels": (kai_analysis or {}).get("key_levels"),
            "catalysts": (kai_analysis or {}).get("catalysts"),
            "risks": (kai_analysis or {}).get("risks"),
        } if kai_analysis else None,

        # Track record
        "track_record": track_record,

        # Earnings
        "earnings": earnings,

        # Related videos
        "videos": videos,

        # Community
        "community_posts": community_posts,

        # Intel connections (cross-ticker relationship graph)
        "intel_connections": intel_connections,

        # Audio dossier URL (generated locally via Chatterbox, cached in storage)
        "audio_url": _get_cached_audio_url(sym, db),
    }


def _get_cached_audio_url(symbol: str, db) -> str | None:
    """Check if we have a cached audio brief for this ticker in Supabase storage."""
    try:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        res = db.storage.from_("dossier-audio").get_public_url(f"{symbol}_{today}.wav")
        # Verify the file actually exists by checking the URL
        if res:
            return res
    except Exception:
        pass
    return None


@router.get("/radar", response_model=RadarSnapshot)
async def get_radar(date: str | None = None):
    """Get radar snapshot with live prices. Defaults to today."""
    db = get_supabase()
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    r = maybe_one(db.table("radar_snapshots").select("*").eq("date", target_date))
    if not r.data:
        raise HTTPException(status_code=404, detail=f"No radar for {target_date}")

    # Enrich radar tickers with live prices
    from app.services.market_data import fetch_bulk_quotes
    all_symbols = set()
    for bucket in ["critical", "high_conviction", "watch", "contested"]:
        for t in r.data.get(bucket, []):
            all_symbols.add(t.get("symbol", ""))
    all_symbols.discard("")

    quotes = await fetch_bulk_quotes(list(all_symbols)) if all_symbols else {}

    def enrich(tickers):
        for t in tickers:
            q = quotes.get(t.get("symbol", ""))
            if q:
                t["price"] = q["price"]
                t["change"] = q["change"]
                t["change_pct"] = q["change_pct"]
        return tickers

    return RadarSnapshot(
        date=r.data["date"], market_sentiment=r.data["market_sentiment"],
        sentiment_summary=r.data.get("sentiment_summary"),
        critical=enrich(r.data.get("critical", [])),
        high_conviction=enrich(r.data.get("high_conviction", [])),
        watch=enrich(r.data.get("watch", [])),
        contested=enrich(r.data.get("contested", [])),
        theme_heatmap=r.data.get("theme_heatmap", []),
        sector_rotation=r.data.get("sector_rotation", {}),
    )


@router.get("/predictions", response_model=list[PredictionCard])
async def list_predictions(
    min_score: int = Query(60, ge=0, le=100),
    user: dict = Depends(require_pro),
):
    """Get active prediction cards (Pro+ only)."""
    db = get_supabase()
    results = db.table("predictions").select("*").eq("status", "active").gte(
        "convergence_score", min_score
    ).order("convergence_score", desc=True).limit(50).execute()

    return [PredictionCard(
        id=p["id"], ticker=p["ticker"], direction=p["direction"],
        convergence_score=p["convergence_score"], timeframe=p["timeframe"],
        confidence=p["confidence"], evidence_chain=p.get("evidence_chain", []),
        catalyst=p.get("catalyst"), invalidation=p.get("invalidation"),
        related_tickers=p.get("related_tickers", []),
        theme=p.get("theme"), created_at=p["created_at"],
    ) for p in (results.data or [])]


@router.get("/themes", response_model=list[ThemeDetail])
async def list_themes(status: str | None = None):
    db = get_supabase()
    q = db.table("themes").select("*").order("escalation_score", desc=True)
    if status:
        q = q.eq("status", status)
    else:
        q = q.in_("status", ["emerging", "active", "escalating"])
    result = q.execute()

    return [ThemeDetail(
        id=t["id"], name=t["name"], slug=t["slug"], description=t.get("description"),
        status=t["status"], tickers=t.get("tickers", []),
        escalation_score=t.get("escalation_score", 0),
    ) for t in (result.data or [])]


@router.get("/themes/{slug}", response_model=ThemeDetail)
async def get_theme(slug: str):
    db = get_supabase()
    t = maybe_one(db.table("themes").select("*").eq("slug", slug))
    if not t.data:
        raise HTTPException(status_code=404, detail="Theme not found")

    # Get content tagged with this theme
    content_rows = db.table("content").select(
        "id, title, content_type, external_url, thumbnail_url, duration_seconds, "
        "quick_take, relevance_score, topics, themes, skill_level, published_at, curated_at, "
        "creators:creator_id(name, slug)"
    ).eq("is_published", True).contains("themes", [t.data["name"]]).order("curated_at", desc=True).limit(10).execute()

    content_cards = []
    for r in (content_rows.data or []):
        creator = r.pop("creators", None) or {}
        content_cards.append(ContentCard(
            id=r["id"], title=r["title"], content_type=r["content_type"],
            external_url=r["external_url"], thumbnail_url=r.get("thumbnail_url"),
            duration_seconds=r.get("duration_seconds"),
            creator_name=creator.get("name"), creator_slug=creator.get("slug"),
            quick_take=r.get("quick_take"), relevance_score=r.get("relevance_score", 0),
            topics=r.get("topics", []), themes=r.get("themes", []),
            skill_level=r.get("skill_level", "intermediate"),
            published_at=r.get("published_at"), curated_at=r["curated_at"],
        ))

    return ThemeDetail(
        id=t.data["id"], name=t.data["name"], slug=t.data["slug"],
        description=t.data.get("description"), status=t.data["status"],
        tickers=t.data.get("tickers", []),
        escalation_score=t.data.get("escalation_score", 0),
        content=content_cards,
    )
