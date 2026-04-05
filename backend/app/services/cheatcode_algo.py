"""CheatCode ALGO — Pine Script converted to Python.

Core features:
1. SuperTrend cloud (buy/sell signals, trend direction)
2. RSI heatmap candle colors (gradient from bearish red to bullish blue/green)
3. Trade management (entry, SL, TP1-4)
4. Reversal bands (TMA + ATR deviation)
5. EMA clouds (5/12 + 34/50)

Fetches OHLCV from EODHD, computes all indicators, returns structured output
for lightweight-charts rendering.
"""

import logging
import math
from datetime import datetime, timedelta

import httpx
import numpy as np
import pandas as pd

from app.core.config import get_settings

log = logging.getLogger("cheatcode_algo")

# ── Color gradients (RSI heatmap) ────────────────────────────────────────────

HEATMAP_COLORS = [
    "#0080ff", "#0e89cb", "#189daf", "#1ea780", "#1fa237",
    "#86e600", "#97dd00", "#a6d400", "#b3ca00", "#bfc000",
    "#c9b600", "#d3ac00", "#dca100", "#e39600", "#ea8a00",
    "#f07e00", "#f57000", "#f96200", "#fc3700", "#fe1e00",
    "#ff0d00", "#ff0000",
]

SKITTLEZ_COLORS = [
    "#FFF938", "#CDFD35", "#96FC32", "#5DFA2F", "#2CF933",
    "#28F867", "#25F69C", "#22F5D2", "#1FDFF4", "#1CA4F2",
    "#1969F1", "#162DEF", "#3613EE", "#6E10ED", "#A70DEB",
    "#E00BEA", "#E908B7", "#E70579", "#E6023B", "#E50000",
]


def _rsi_to_color(rsi_val: float, scheme: str = "heatmap") -> str:
    colors = HEATMAP_COLORS if scheme == "heatmap" else SKITTLEZ_COLORS
    idx = int((len(colors) - 1) * max(0, min(1, (rsi_val - 20) / 60)))
    return colors[idx]


# ── OHLCV Data Fetching ─────────────────────────────────────────────────────

async def fetch_ohlcv(symbol: str, period: str = "d", limit: int = 300) -> pd.DataFrame:
    """Fetch OHLCV data from EODHD."""
    s = get_settings()
    suffix = ".US" if "." not in symbol and "-" not in symbol else ""

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://eodhistoricaldata.com/api/eod/{symbol}{suffix}",
            params={
                "api_token": s.eodhd_api_key,
                "fmt": "json",
                "period": period,
                "order": "a",
                "from": (datetime.now() - timedelta(days=limit * 2)).strftime("%Y-%m-%d"),
            },
            timeout=15,
        )
        if resp.status_code != 200:
            return pd.DataFrame()
        data = resp.json()

    if not data:
        return pd.DataFrame()

    df = pd.DataFrame(data)
    df = df.rename(columns={
        "date": "time", "open": "open", "high": "high",
        "low": "low", "close": "close", "volume": "volume",
    })
    df = df[["time", "open", "high", "low", "close", "volume"]].tail(limit)
    df = df.reset_index(drop=True)
    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.dropna()
    return df


# ── Technical Indicators ─────────────────────────────────────────────────────

def _true_range(df: pd.DataFrame) -> pd.Series:
    h = df["high"]
    l = df["low"]
    pc = df["close"].shift(1)
    return pd.concat([h - l, (h - pc).abs(), (l - pc).abs()], axis=1).max(axis=1)


def _ema(series: pd.Series, period: int) -> pd.Series:
    return series.ewm(span=period, adjust=False).mean()


def _sma(series: pd.Series, period: int) -> pd.Series:
    return series.rolling(period).mean()


def _rma(series: pd.Series, period: int) -> pd.Series:
    """Pine's ta.rma — same as Wilder's smoothing / EMA with alpha=1/period."""
    return series.ewm(alpha=1.0 / period, adjust=False).mean()


def _linreg(series: pd.Series, period: int) -> pd.Series:
    """Linear regression value (LSMA)."""
    return series.rolling(period).apply(
        lambda x: np.polyval(np.polyfit(range(len(x)), x, 1), len(x) - 1),
        raw=True,
    )


def _hma(series: pd.Series, period: int) -> pd.Series:
    """Hull Moving Average."""
    half = int(period / 2)
    sqrt_p = int(math.sqrt(period))
    wma_half = series.rolling(half).apply(lambda x: np.average(x, weights=range(1, len(x) + 1)), raw=True)
    wma_full = series.rolling(period).apply(lambda x: np.average(x, weights=range(1, len(x) + 1)), raw=True)
    diff = 2 * wma_half - wma_full
    return diff.rolling(sqrt_p).apply(lambda x: np.average(x, weights=range(1, len(x) + 1)), raw=True)


def _swma(series: pd.Series) -> pd.Series:
    """Symmetrically Weighted Moving Average (4-bar)."""
    return (series.shift(3) * 1 + series.shift(2) * 3 + series.shift(1) * 3 + series * 1) / 8


def _rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.where(delta > 0, 0)
    loss = (-delta).where(delta < 0, 0)
    avg_gain = _rma(gain, period)
    avg_loss = _rma(loss, period)
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


# ── SuperTrend ───────────────────────────────────────────────────────────────

def compute_supertrend(df: pd.DataFrame, src: pd.Series, periods: int = 20, multiplier: float = 1.5):
    """Core SuperTrend calculation — the heart of CheatCode ALGO."""
    tr = _true_range(df)
    atr = _ema(tr, periods)

    up = src - multiplier * atr
    dn = src + multiplier * atr

    trend = pd.Series(1, index=df.index)
    final_up = up.copy()
    final_dn = dn.copy()

    for i in range(1, len(df)):
        # Trailing stop logic
        if df["close"].iloc[i - 1] > final_up.iloc[i - 1]:
            final_up.iloc[i] = max(up.iloc[i], final_up.iloc[i - 1])
        else:
            final_up.iloc[i] = up.iloc[i]

        if df["close"].iloc[i - 1] < final_dn.iloc[i - 1]:
            final_dn.iloc[i] = min(dn.iloc[i], final_dn.iloc[i - 1])
        else:
            final_dn.iloc[i] = dn.iloc[i]

        # Trend direction
        if trend.iloc[i - 1] == -1 and df["close"].iloc[i] > final_dn.iloc[i - 1]:
            trend.iloc[i] = 1
        elif trend.iloc[i - 1] == 1 and df["close"].iloc[i] < final_up.iloc[i - 1]:
            trend.iloc[i] = -1
        else:
            trend.iloc[i] = trend.iloc[i - 1]

    # SuperTrend line
    st_line = pd.Series(index=df.index, dtype=float)
    for i in range(len(df)):
        st_line.iloc[i] = final_up.iloc[i] if trend.iloc[i] == 1 else final_dn.iloc[i]

    return st_line, trend


# ── Reversal Bands ───────────────────────────────────────────────────────────

def compute_reversal_bands(df: pd.DataFrame):
    """TMA + ATR deviation bands for reversal zones."""
    log_close = np.log(df["close"])
    log_hl = np.log(df["high"]) - np.log(df["low"])

    tma_period = 25
    atr_period = 45
    atr_mult = 2.4

    ssi = _rma(log_close, tma_period)
    tma = _swma(ssi)
    atr_rb = _rma(log_hl, atr_period)

    bands = {}
    for label, mult in [("upper_2", atr_mult + 2), ("upper_3", atr_mult + 4),
                         ("lower_0", atr_mult), ("lower_1", atr_mult + 2)]:
        if "upper" in label:
            bands[label] = np.exp(tma + atr_rb * mult)
        else:
            bands[label] = np.exp(tma - atr_rb * mult)

    return bands


# ── EMA Clouds ───────────────────────────────────────────────────────────────

def compute_ema_clouds(df: pd.DataFrame):
    """EMA 5/12 fast cloud + 34/50 slow cloud."""
    return {
        "ema5": _ema(df["close"], 5),
        "ema12": _ema(df["close"], 12),
        "ema34": _ema(df["close"], 34),
        "ema50": _ema(df["close"], 50),
    }


# ── Trade Management ─────────────────────────────────────────────────────────

def compute_trade_levels(df: pd.DataFrame, trend: pd.Series, st_line: pd.Series,
                         periods: int = 20, multiplier: float = 1.5):
    """Calculate entry, SL, TP1-4 on each signal."""
    tr = _true_range(df)
    atr = _ema(tr, periods).fillna(0)

    signals = []
    buy_signals = (trend == 1) & (trend.shift(1) == -1)
    sell_signals = (trend == -1) & (trend.shift(1) == 1)

    # Track state for "only one label" logic
    state = 0  # 1 = last was buy, -1 = last was sell

    for i in range(1, len(df)):
        is_buy = buy_signals.iloc[i]
        is_sell = sell_signals.iloc[i]

        if not is_buy and not is_sell:
            continue

        # Only one label logic
        if is_buy and state == 1:
            continue
        if is_sell and state == -1:
            continue

        entry = df["close"].iloc[i]
        atr_val = atr.iloc[i]
        tr_val = tr.iloc[i] if not np.isnan(tr.iloc[i]) else atr_val

        risk = max(atr_val * multiplier, tr_val * multiplier)
        low20 = df["low"].iloc[max(0, i - 20):i + 1].min()
        high20 = df["high"].iloc[max(0, i - 20):i + 1].max()

        if is_buy:
            sl_atr = entry - risk
            sl_atr2 = entry - max(atr_val * (multiplier + 1), tr_val * (multiplier + 1))
            sl_lh = low20
            # Medium risk: middle value
            candidates = sorted([sl_atr, sl_atr2, sl_lh])
            sl = candidates[1]  # Medium risk
            direction = "long"
            state = 1
        else:
            sl_atr = entry + risk
            sl_atr2 = entry + max(atr_val * (multiplier + 1), tr_val * (multiplier + 1))
            sl_lh = high20
            candidates = sorted([sl_atr, sl_atr2, sl_lh], reverse=True)
            sl = candidates[1]
            direction = "short"
            state = -1

        risk_amount = abs(entry - sl)
        if risk_amount == 0:
            continue

        sign = 1 if direction == "long" else -1
        tp1 = entry + sign * 1.0 * risk_amount
        tp2 = entry + sign * 1.5 * risk_amount
        tp3 = entry + sign * 2.0 * risk_amount
        tp4 = entry + sign * 3.0 * risk_amount

        signals.append({
            "index": i,
            "time": str(df["time"].iloc[i]),
            "direction": direction,
            "entry": float(round(entry, 4)),
            "sl": float(round(sl, 4)),
            "tp1": float(round(tp1, 4)),
            "tp2": float(round(tp2, 4)),
            "tp3": float(round(tp3, 4)),
            "tp4": float(round(tp4, 4)),
            "st_value": float(round(st_line.iloc[i], 4)),
        })

    return signals


# ── Full Algo Pipeline ───────────────────────────────────────────────────────

async def run_algo(symbol: str, sensitivity: str = "medium", period: str = "d",
                   limit: int = 200, color_scheme: str = "heatmap") -> dict:
    """Run the full CheatCode ALGO on a symbol.

    Returns structured data for lightweight-charts rendering:
    - candles with RSI heatmap colors
    - supertrend line + cloud fill
    - buy/sell signals
    - trade management levels
    - reversal bands
    - EMA clouds
    """
    df = await fetch_ohlcv(symbol, period, limit)
    if df.empty:
        return {"error": f"No data for {symbol}"}

    # Source based on sensitivity
    ohlc4 = (df["open"] + df["high"] + df["low"] + df["close"]) / 4
    if sensitivity == "low":
        src = df["close"]  # Heikin Ashi approximation — just use close for simplicity
    elif sensitivity == "high":
        src = _hma(ohlc4, 10)
    else:
        src = _linreg(df["close"], 12)

    src = src.fillna(df["close"])

    # Core SuperTrend
    periods = 20
    multiplier = 1.5
    st_line, trend = compute_supertrend(df, src, periods, multiplier)

    # RSI heatmap colors
    rsi = _rsi(df["close"], 14).fillna(50)

    # Trade signals + levels
    signals = compute_trade_levels(df, trend, st_line, periods, multiplier)

    # Reversal bands
    rev_bands = compute_reversal_bands(df)

    # EMA clouds
    emas = compute_ema_clouds(df)

    # Build output
    candles = []
    supertrend_data = []
    cloud_fill = []

    def R(v):
        return float(round(v, 4))

    for i in range(len(df)):
        t = str(df["time"].iloc[i])
        rsi_val = float(rsi.iloc[i]) if not np.isnan(rsi.iloc[i]) else 50.0

        candles.append({
            "time": t,
            "open": R(df["open"].iloc[i]),
            "high": R(df["high"].iloc[i]),
            "low": R(df["low"].iloc[i]),
            "close": R(df["close"].iloc[i]),
            "volume": int(df["volume"].iloc[i]),
            "color": _rsi_to_color(rsi_val, color_scheme),
            "borderColor": _rsi_to_color(rsi_val, color_scheme),
            "wickColor": _rsi_to_color(rsi_val, color_scheme),
        })

        if not np.isnan(st_line.iloc[i]):
            st_val = R(st_line.iloc[i])
            t_dir = int(trend.iloc[i])
            supertrend_data.append({
                "time": t,
                "value": st_val,
                "color": "#00FF00" if t_dir == 1 else "#FF0000",
            })
            cloud_fill.append({
                "time": t,
                "value": st_val,
                "ohlc4": R(ohlc4.iloc[i]),
                "trend": t_dir,
            })

    # Reversal band series
    reversal_bands = {}
    for key, series in rev_bands.items():
        reversal_bands[key] = [
            {"time": str(df["time"].iloc[i]), "value": R(v)}
            for i, v in enumerate(series) if not np.isnan(v)
        ]

    # EMA cloud series
    ema_clouds = {}
    for key, series in emas.items():
        ema_clouds[key] = [
            {"time": str(df["time"].iloc[i]), "value": R(v)}
            for i, v in enumerate(series) if not np.isnan(v)
        ]

    # Buy/sell markers
    markers = []
    for sig in signals:
        markers.append({
            "time": sig["time"],
            "position": "belowBar" if sig["direction"] == "long" else "aboveBar",
            "color": "#00FF00" if sig["direction"] == "long" else "#FF0000",
            "shape": "arrowUp" if sig["direction"] == "long" else "arrowDown",
            "text": "B" if sig["direction"] == "long" else "S",
        })

    # Latest active trade levels (last signal)
    active_trade = signals[-1] if signals else None

    return {
        "symbol": symbol.upper(),
        "period": period,
        "sensitivity": sensitivity,
        "candles": candles,
        "supertrend": supertrend_data,
        "cloud_fill": cloud_fill,
        "markers": markers,
        "signals": signals,
        "active_trade": active_trade,
        "reversal_bands": reversal_bands,
        "ema_clouds": ema_clouds,
        "metadata": {
            "total_bars": len(candles),
            "total_signals": len(signals),
            "current_trend": int(trend.iloc[-1]) if len(trend) > 0 else 0,
            "current_rsi": round(rsi.iloc[-1], 1) if len(rsi) > 0 else 50,
        },
    }
