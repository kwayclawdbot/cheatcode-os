"""Market Data API — live quotes, market summary, ticker prices."""

from fastapi import APIRouter, HTTPException, Query

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
