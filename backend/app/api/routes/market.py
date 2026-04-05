"""Market Data API — live quotes, market summary, ticker prices."""

from fastapi import APIRouter, Query
from app.services.market_data import fetch_bulk_quotes, get_market_summary, sync_ticker_prices

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
