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

def _build_score_breakdown(evidence_chain: list[dict]) -> dict:
    """Derive a visual score breakdown from evidence sources.

    Each source type in the evidence chain contributes to a category.
    Max per category = 25 points (capped).
    """
    category_map = {
        "news": "momentum",
        "earnings": "catalyst",
        "content": "content",
        "flow": "flow",
        "macro": "macro",
        "insider": "flow",
    }
    scores: dict[str, float] = {
        "technical": 0, "momentum": 0, "volume": 0,
        "catalyst": 0, "content": 0, "flow": 0,
    }
    for ev in (evidence_chain or []):
        src = ev.get("source", "").lower()
        cat = category_map.get(src, "momentum")
        strength = float(ev.get("strength", 0.6))
        scores[cat] = min(25, scores[cat] + strength * 15)

    # Round to ints
    return {k: round(v) for k, v in scores.items()}


def _build_drivers(evidence_chain: list[dict], themes: list[str], catalyst: str | None) -> list[dict]:
    """Build driver pills from evidence + themes + catalyst text."""
    drivers: list[dict] = []
    icon_map = {
        "news": "newspaper", "earnings": "dollar-sign", "content": "play",
        "flow": "activity", "macro": "globe", "insider": "eye",
    }
    seen: set[str] = set()

    # From themes
    for theme in (themes or [])[:2]:
        key = f"theme:{theme}"
        if key not in seen:
            drivers.append({"icon": "flame", "text": theme, "type": "theme"})
            seen.add(key)

    # From evidence chain (deduplicate by signal text)
    for ev in (evidence_chain or [])[:8]:
        signal = (ev.get("signal") or "")[:80]
        if not signal or signal in seen:
            continue
        src = ev.get("source", "news").lower()
        drivers.append({
            "icon": icon_map.get(src, "zap"),
            "text": signal,
            "type": src,
        })
        seen.add(signal)
        if len(drivers) >= 6:
            break

    # From catalyst
    if catalyst and catalyst not in seen and len(drivers) < 6:
        drivers.append({"icon": "zap", "text": catalyst[:80], "type": "catalyst"})

    return drivers


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


@router.get("/ticker/{symbol}", response_model=TickerLookup | TickerDetail)
async def ticker_lookup(symbol: str, user: dict | None = Depends(get_current_user)):
    """Ticker intelligence lookup. Free: score + direction. Pro: full breakdown."""
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
    is_pro = user and user.get("tier") in ("pro", "elite", "admin")

    if is_pro:
        # Get related content
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
        score_breakdown = _build_score_breakdown(ev_chain)
        drivers = _build_drivers(ev_chain, data.get("themes", []), data.get("catalyst"))
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
    else:
        # Free: score + direction + analysis (evidence chain is pro-gated)
        return TickerLookup(
            symbol=data["symbol"], name=data.get("name"),
            convergence_score=data["convergence_score"],
            direction=data.get("direction"), timeframe=data.get("timeframe"),
            confidence=data.get("confidence"),
            last_price=data.get("last_price"), price_change_pct=data.get("price_change_pct"),
            daily_analysis=data.get("daily_analysis"),
            analysis_date=data.get("analysis_date"),
            key_levels=data.get("key_levels"),
            catalysts=data.get("catalysts"),
            risks=data.get("risks"),
        )


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
