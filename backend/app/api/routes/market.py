"""Market Data API — live quotes, market summary, ticker prices."""

from fastapi import APIRouter, Query
from app.services.market_data import fetch_bulk_quotes, get_market_summary, sync_ticker_prices, fetch_price_history

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
    """Get real-time quote for a single ticker."""
    quotes = await fetch_bulk_quotes([symbol.upper()])
    q = quotes.get(symbol.upper())
    if not q:
        return {"error": f"No data for {symbol.upper()}"}
    return q


@router.get("/sparkline/{symbol}")
async def get_sparkline(symbol: str, days: int = Query(30, ge=5, le=90)):
    """Get daily close prices for sparkline charts. Returns list of {t, v} objects."""
    data = await fetch_price_history(symbol.upper(), days=days)
    return data
