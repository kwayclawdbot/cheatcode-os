"""Market Data API — live quotes, market summary, ticker prices, trending."""

from fastapi import APIRouter, HTTPException, Query

from app.core.supabase import get_supabase
from app.services.market_data import (
    fetch_bulk_quotes,
    fetch_price_history,
    get_market_summary,
    normalise_symbol,
)

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/summary")
async def market_summary():
    """Market overview: indices, top movers, sentiment. 30s cached."""
    return await get_market_summary()


@router.get("/quotes")
async def get_quotes(symbols: str = Query(None, description="Comma-separated symbols")):
    """Get real-time quotes. Pass symbols or get all tracked tickers."""
    symbol_list = symbols.split(",") if symbols else None
    quotes = await fetch_bulk_quotes(symbol_list)
    return list(quotes.values())


@router.get("/quote/{symbol}")
async def get_single_quote(symbol: str):
    """Get real-time quote for a single ticker.

    Handles raw input like "eth", "BTC", "EURUSD", "AAPL" — normalises
    to the canonical display key before lookup so "ETH" correctly
    returns the ETH-USD quote even though internally it was fetched
    as ETH-USD.CC.
    """
    _eodhd, display = normalise_symbol(symbol)
    if not display:
        raise HTTPException(400, "Invalid symbol")
    quotes = await fetch_bulk_quotes([symbol])
    q = quotes.get(display)
    if not q:
        raise HTTPException(404, f"No data for {display}")
    return q


@router.get("/sparkline/{symbol}")
async def get_sparkline(symbol: str, days: int = Query(30, ge=5, le=90)):
    """Get daily close prices for sparkline charts. Returns list of {t, v} objects."""
    data = await fetch_price_history(symbol, days=days)
    return data


# ── Trending ─────────────────────────────────────────────────────────────────

@router.get("/trending")
async def get_trending(
    asset_class: str | None = Query(None, description="Filter: stocks|crypto|forex|etf|index|futures"),
    limit: int = Query(20, ge=1, le=100),
):
    """StockTwits-style trending tickers.

    Ranked by the composite trending_score (precomputed every 15 min by
    the update_trending_scores scheduler job). Zero traffic at launch is
    fine — rankings are driven by price/volume/content activity, with
    social weighting kicking in once posts flow.

    Asset class filter corresponds to the tickers.asset_class column:
        stocks   → US common stocks
        crypto   → cryptocurrencies
        forex    → forex pairs
        etf      → ETFs
        index    → market indices
        futures  → futures (stored as 'futures' when seeded)
    """
    valid_classes = {"stocks", "crypto", "forex", "etf", "index", "futures", "other"}
    if asset_class and asset_class not in valid_classes:
        raise HTTPException(400, f"asset_class must be one of {sorted(valid_classes)}")

    db = get_supabase()
    q = (
        db.table("tickers")
        .select(
            "symbol, name, asset_class, sector, market_cap, market_cap_tier, "
            "last_price, price_change_pct, last_volume, volume_avg_20d, "
            "trending_score, content_mentions_48h, social_mentions_24h, social_comments_24h, "
            "convergence_score, direction, themes"
        )
        .gt("trending_score", 0)
        .order("trending_score", desc=True)
        .limit(limit)
    )
    if asset_class:
        q = q.eq("asset_class", asset_class)

    # For stocks and ETFs, filter to mid-cap and above ($2B+) so we don't
    # surface penny stocks / shell companies. Crypto/forex/index don't
    # have meaningful market caps so we don't filter them.
    if asset_class in ("stocks", "etf") or asset_class is None:
        q = q.in_("market_cap_tier", ["mid", "large", "mega"])

    result = q.execute()
    return {
        "asset_class": asset_class or "all",
        "count": len(result.data or []),
        "tickers": result.data or [],
    }


# ── Cashtag validation ───────────────────────────────────────────────────────

@router.get("/cashtag/{symbol}")
async def validate_cashtag(symbol: str):
    """Check whether a $cashtag resolves to a real ticker in the universe.

    Used by the frontend to decide whether to render a $SYMBOL as a
    clickable link or plain text. Fast single-row lookup, no API calls.
    """
    db = get_supabase()
    result = (
        db.table("tickers")
        .select("symbol, name, asset_class, last_price, price_change_pct")
        .eq("symbol", symbol.upper())
        .limit(1)
        .execute()
    )
    if not result.data:
        return {"valid": False, "symbol": symbol.upper()}
    return {"valid": True, **result.data[0]}
