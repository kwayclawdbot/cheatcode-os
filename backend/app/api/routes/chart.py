"""CheatCode Chart API — serves algo-computed chart data for lightweight-charts."""

from fastapi import APIRouter, Query
from app.services.cheatcode_algo import run_algo

router = APIRouter(prefix="/chart", tags=["chart"])


@router.get("/{symbol}")
async def get_chart_data(
    symbol: str,
    sensitivity: str = Query("medium", description="low, medium, high"),
    period: str = Query("d", description="d=daily, w=weekly, m=monthly"),
    limit: int = Query(200, ge=50, le=500),
    colors: str = Query("heatmap", description="heatmap or skittlez"),
):
    """Get full CheatCode ALGO chart data for a symbol.

    Returns candles with RSI heatmap colors, SuperTrend line + cloud,
    buy/sell signals, trade levels, reversal bands, EMA clouds.
    """
    return await run_algo(symbol, sensitivity, period, limit, colors)
