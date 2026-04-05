// TerminalPage — /terminal
// Design: Bloomberg-lite meets Discord x TradingView
// - Full-width dark terminal layout (overrides light theme locally)
// - Market mode tabs: Stocks | Futures | Forex | Crypto
// - Left: TradingView chart (iframe embed, full-height)
// - Center-right: Dynamic instrument panel per mode
// - Far right: Community chat sidebar with per-feed channels
// - Each mode switch changes: default symbol, watchlist, order types, chat feed

import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Send, Hash, TrendingUp, TrendingDown,
  ChevronDown, Circle, Users, Zap, Globe, Bitcoin,
  BarChart2, Lock, LogIn, RefreshCw, Star, Bell
} from "lucide-react";
import { Nav } from "@/components/layout/Nav";
import { TickerLogo } from "@/components/intelligence/TickerLogo";
import { CheatCodeChart } from "@/components/CheatCodeChart";

// ─── Types ────────────────────────────────────────────────────────────────────
type MarketMode = "stocks" | "futures" | "forex" | "crypto";
type ChatChannel = { id: string; label: string; icon: string; unread?: number };

// ─── Market Mode Config ───────────────────────────────────────────────────────
const MARKET_MODES: Record<MarketMode, {
  label: string;
  icon: React.ReactNode;
  color: string;
  defaultSymbol: string;
  watchlist: { symbol: string; name: string; price: string; change: string; pct: string; up: boolean }[];
  orderTypes: string[];
  chatChannels: ChatChannel[];
  tvTheme: "light" | "dark";
  tvInterval: string;
}> = {
  stocks: {
    label: "Stocks",
    icon: <TrendingUp size={14} />,
    color: "#4DC820",
    defaultSymbol: "NASDAQ:NVDA",
    watchlist: [
      { symbol: "NVDA", name: "NVIDIA Corp", price: "875.40", change: "+21.30", pct: "+2.49%", up: true },
      { symbol: "TSLA", name: "Tesla Inc", price: "182.63", change: "-4.21", pct: "-2.25%", up: false },
      { symbol: "AMD", name: "Advanced Micro", price: "158.92", change: "+3.17", pct: "+2.03%", up: true },
      { symbol: "AAPL", name: "Apple Inc", price: "189.30", change: "+0.85", pct: "+0.45%", up: true },
      { symbol: "META", name: "Meta Platforms", price: "512.44", change: "-8.10", pct: "-1.56%", up: false },
      { symbol: "MSFT", name: "Microsoft Corp", price: "415.20", change: "+2.40", pct: "+0.58%", up: true },
      { symbol: "NFLX", name: "Netflix Inc", price: "628.75", change: "+11.20", pct: "+1.81%", up: true },
      { symbol: "SMCI", name: "Super Micro", price: "94.18", change: "+4.50", pct: "+5.02%", up: true },
    ],
    orderTypes: ["Market", "Limit", "Stop", "Stop Limit", "Trailing Stop"],
    chatChannels: [
      { id: "stocks-general", label: "general", icon: "#", unread: 3 },
      { id: "stocks-flow", label: "options-flow", icon: "⚡", unread: 12 },
      { id: "stocks-setups", label: "setups", icon: "📈" },
      { id: "stocks-earnings", label: "earnings", icon: "📊" },
      { id: "stocks-news", label: "breaking-news", icon: "🔴", unread: 1 },
    ],
    tvTheme: "dark",
    tvInterval: "D",
  },
  futures: {
    label: "Futures",
    icon: <BarChart2 size={14} />,
    color: "#F79009",
    defaultSymbol: "CME_MINI:ES1!",
    watchlist: [
      { symbol: "ES1!", name: "S&P 500 E-mini", price: "5,248.50", change: "+12.25", pct: "+0.23%", up: true },
      { symbol: "NQ1!", name: "Nasdaq E-mini", price: "18,342.00", change: "-45.50", pct: "-0.25%", up: false },
      { symbol: "YM1!", name: "Dow Jones Mini", price: "39,120.00", change: "+85.00", pct: "+0.22%", up: true },
      { symbol: "RTY1!", name: "Russell 2000", price: "2,048.30", change: "-8.70", pct: "-0.42%", up: false },
      { symbol: "CL1!", name: "Crude Oil WTI", price: "81.42", change: "+0.68", pct: "+0.84%", up: true },
      { symbol: "GC1!", name: "Gold", price: "2,318.40", change: "+14.20", pct: "+0.62%", up: true },
      { symbol: "ZB1!", name: "30Y T-Bond", price: "118.22", change: "-0.31", pct: "-0.26%", up: false },
      { symbol: "VX1!", name: "VIX Futures", price: "18.45", change: "+0.92", pct: "+5.25%", up: true },
    ],
    orderTypes: ["Market", "Limit", "Stop Market", "Stop Limit", "MIT"],
    chatChannels: [
      { id: "futures-general", label: "general", icon: "#", unread: 5 },
      { id: "futures-es-nq", label: "es-nq", icon: "📊", unread: 8 },
      { id: "futures-commodities", label: "commodities", icon: "🛢️" },
      { id: "futures-bonds", label: "bonds-rates", icon: "📉" },
      { id: "futures-levels", label: "key-levels", icon: "🎯", unread: 2 },
    ],
    tvTheme: "dark",
    tvInterval: "5",
  },
  forex: {
    label: "Forex",
    icon: <Globe size={14} />,
    color: "#00AEEF",
    defaultSymbol: "FX:EURUSD",
    watchlist: [
      { symbol: "EUR/USD", name: "Euro / US Dollar", price: "1.0842", change: "+0.0018", pct: "+0.17%", up: true },
      { symbol: "GBP/USD", name: "Pound / US Dollar", price: "1.2634", change: "-0.0024", pct: "-0.19%", up: false },
      { symbol: "USD/JPY", name: "US Dollar / Yen", price: "151.82", change: "+0.34", pct: "+0.22%", up: true },
      { symbol: "AUD/USD", name: "Aussie / US Dollar", price: "0.6512", change: "+0.0008", pct: "+0.12%", up: true },
      { symbol: "USD/CAD", name: "US Dollar / CAD", price: "1.3624", change: "-0.0012", pct: "-0.09%", up: false },
      { symbol: "USD/CHF", name: "US Dollar / CHF", price: "0.9048", change: "+0.0005", pct: "+0.06%", up: true },
      { symbol: "NZD/USD", name: "Kiwi / US Dollar", price: "0.5982", change: "-0.0014", pct: "-0.23%", up: false },
      { symbol: "EUR/GBP", name: "Euro / Pound", price: "0.8582", change: "+0.0011", pct: "+0.13%", up: true },
    ],
    orderTypes: ["Market", "Limit", "Stop", "OCO", "Trailing Stop"],
    chatChannels: [
      { id: "forex-general", label: "general", icon: "#", unread: 2 },
      { id: "forex-majors", label: "majors", icon: "💱", unread: 6 },
      { id: "forex-analysis", label: "analysis", icon: "📐" },
      { id: "forex-central-banks", label: "central-banks", icon: "🏦", unread: 1 },
      { id: "forex-signals", label: "signals", icon: "📡" },
    ],
    tvTheme: "dark",
    tvInterval: "60",
  },
  crypto: {
    label: "Crypto",
    icon: <Bitcoin size={14} />,
    color: "#7B2FBE",
    defaultSymbol: "BINANCE:BTCUSDT",
    watchlist: [
      { symbol: "BTC/USDT", name: "Bitcoin", price: "68,420.00", change: "+1,240.00", pct: "+1.85%", up: true },
      { symbol: "ETH/USDT", name: "Ethereum", price: "3,482.50", change: "-48.20", pct: "-1.37%", up: false },
      { symbol: "SOL/USDT", name: "Solana", price: "172.40", change: "+8.30", pct: "+5.06%", up: true },
      { symbol: "BNB/USDT", name: "BNB", price: "584.20", change: "+4.10", pct: "+0.71%", up: true },
      { symbol: "XRP/USDT", name: "XRP", price: "0.5824", change: "-0.0124", pct: "-2.09%", up: false },
      { symbol: "AVAX/USDT", name: "Avalanche", price: "38.42", change: "+1.84", pct: "+5.03%", up: true },
      { symbol: "DOGE/USDT", name: "Dogecoin", price: "0.1624", change: "+0.0048", pct: "+3.05%", up: true },
      { symbol: "LINK/USDT", name: "Chainlink", price: "14.82", change: "-0.38", pct: "-2.50%", up: false },
    ],
    orderTypes: ["Market", "Limit", "Stop Limit", "Trailing Stop", "Post Only"],
    chatChannels: [
      { id: "crypto-general", label: "general", icon: "#", unread: 14 },
      { id: "crypto-btc", label: "bitcoin", icon: "₿", unread: 7 },
      { id: "crypto-alts", label: "altcoins", icon: "🪙", unread: 3 },
      { id: "crypto-defi", label: "defi", icon: "🔗" },
      { id: "crypto-nfts", label: "on-chain", icon: "⛓️" },
    ],
    tvTheme: "dark",
    tvInterval: "15",
  },
};

// ─── Mock Chat Messages ───────────────────────────────────────────────────────
const MOCK_MESSAGES: Record<string, { user: string; avatar: string; color: string; time: string; text: string; badge?: string }[]> = {
  "stocks-general": [
    { user: "TraderKai", avatar: "TK", color: "#4DC820", time: "9:32 AM", text: "NVDA breaking out of the wedge right now 👀 volume confirming", badge: "Pro" },
    { user: "SwingKing", avatar: "SK", color: "#00AEEF", time: "9:34 AM", text: "I've been in since 840, adding here on the break" },
    { user: "OptionsFlow", avatar: "OF", color: "#F79009", time: "9:35 AM", text: "Seeing heavy call buying in NVDA 900 strikes for next week. Someone knows something 🔥", badge: "Elite" },
    { user: "MarketMaven", avatar: "MM", color: "#7B2FBE", time: "9:37 AM", text: "AMD following NVDA as expected. Semi sector rotation is real" },
    { user: "DayTrader99", avatar: "DT", color: "#E8193C", time: "9:38 AM", text: "TSLA looking weak, holding below VWAP. Short bias for now" },
    { user: "TraderKai", avatar: "TK", color: "#4DC820", time: "9:41 AM", text: "NVDA 880 is the key level. If it holds, next target 900+", badge: "Pro" },
    { user: "AlgoTrader", avatar: "AT", color: "#00AEEF", time: "9:42 AM", text: "My algo just triggered a buy signal on SMCI. Unusual volume spike" },
    { user: "ValueHunter", avatar: "VH", color: "#F79009", time: "9:44 AM", text: "Anyone watching META? Looks like a clean setup forming on the daily" },
  ],
  "stocks-flow": [
    { user: "FlowBot", avatar: "FB", color: "#4DC820", time: "9:30 AM", text: "🚨 UNUSUAL ACTIVITY: NVDA 900C 04/19 — $2.4M sweep, ask side, 3x avg volume", badge: "Bot" },
    { user: "FlowBot", avatar: "FB", color: "#4DC820", time: "9:31 AM", text: "🚨 UNUSUAL ACTIVITY: AMD 165C 04/26 — $840K sweep, ask side", badge: "Bot" },
    { user: "OptionsFlow", avatar: "OF", color: "#F79009", time: "9:33 AM", text: "That NVDA sweep is institutional. Not retail. Watch for follow-through", badge: "Elite" },
    { user: "FlowBot", avatar: "FB", color: "#4DC820", time: "9:35 AM", text: "🚨 BEARISH: TSLA 175P 04/12 — $1.1M block, bid side", badge: "Bot" },
    { user: "TraderKai", avatar: "TK", color: "#4DC820", time: "9:38 AM", text: "TSLA puts are stacking up. Someone is hedging hard into earnings", badge: "Pro" },
  ],
  "futures-general": [
    { user: "FuturesKing", avatar: "FK", color: "#F79009", time: "9:29 AM", text: "ES holding 5240 support. Bulls need to reclaim 5260 for continuation", badge: "Elite" },
    { user: "ScalpMaster", avatar: "SM", color: "#00AEEF", time: "9:31 AM", text: "NQ lagging ES today. Divergence worth watching", },
    { user: "MacroTrader", avatar: "MT", color: "#7B2FBE", time: "9:33 AM", text: "CPI print tomorrow could be the catalyst. Positioning light until then", badge: "Pro" },
    { user: "FuturesKing", avatar: "FK", color: "#F79009", time: "9:35 AM", text: "Gold breaking out above 2300. Flight to safety bid is real", badge: "Elite" },
    { user: "OilTrader", avatar: "OT", color: "#E8193C", time: "9:37 AM", text: "CL testing 82 resistance. Supply data at 10:30 AM will be key" },
  ],
  "forex-general": [
    { user: "FXPro", avatar: "FX", color: "#00AEEF", time: "9:28 AM", text: "EUR/USD bouncing off 1.0820 support. Long scalp setup", badge: "Pro" },
    { user: "PipHunter", avatar: "PH", color: "#4DC820", time: "9:30 AM", text: "DXY showing weakness. Risk-on pairs should benefit today" },
    { user: "CentralBankWatch", avatar: "CB", color: "#F79009", time: "9:32 AM", text: "Fed speakers today at 2pm. USD could get volatile", badge: "Elite" },
    { user: "FXPro", avatar: "FX", color: "#00AEEF", time: "9:35 AM", text: "GBP/USD breaking down — UK data miss. Watching 1.2600 as next support", badge: "Pro" },
  ],
  "crypto-general": [
    { user: "CryptoWhale", avatar: "CW", color: "#7B2FBE", time: "9:25 AM", text: "BTC holding 68k. ETF inflows still strong. Bullish structure intact 🚀", badge: "Elite" },
    { user: "AltSeason", avatar: "AS", color: "#4DC820", time: "9:27 AM", text: "SOL ripping +5% today. Ecosystem activity is insane right now" },
    { user: "OnChainAnalyst", avatar: "OC", color: "#00AEEF", time: "9:29 AM", text: "BTC exchange outflows at 3-month high. Supply shock incoming?", badge: "Pro" },
    { user: "CryptoWhale", avatar: "CW", color: "#7B2FBE", time: "9:31 AM", text: "Watching 70k as the next resistance. Break above = price discovery mode", badge: "Elite" },
    { user: "DeFiDegen", avatar: "DD", color: "#F79009", time: "9:33 AM", text: "AVAX pumping on ecosystem news. Check the TVL growth 📊" },
    { user: "AltSeason", avatar: "AS", color: "#4DC820", time: "9:35 AM", text: "XRP lagging the market. SEC news overhang still weighing on it" },
    { user: "CryptoWhale", avatar: "CW", color: "#7B2FBE", time: "9:38 AM", text: "LINK breaking out of a 3-month consolidation on the daily. Watching closely 👀", badge: "Elite" },
  ],
  "crypto-btc": [
    { user: "BitcoinMaxi", avatar: "BM", color: "#F79009", time: "9:20 AM", text: "Halving in 12 days. Historically price peaks 6-12 months after. We're early.", badge: "Elite" },
    { user: "OnChainAnalyst", avatar: "OC", color: "#00AEEF", time: "9:22 AM", text: "MVRV ratio at 2.1 — historically mid-bull territory. Not overheated yet", badge: "Pro" },
    { user: "BitcoinMaxi", avatar: "BM", color: "#F79009", time: "9:25 AM", text: "Blackrock IBIT had $400M inflows yesterday. Institutional demand is relentless", badge: "Elite" },
    { user: "CryptoWhale", avatar: "CW", color: "#7B2FBE", time: "9:28 AM", text: "Key levels: 68k support, 70k resistance, 72k ATH. Clean range.", badge: "Elite" },
  ],
};

// ─── CheatCode ALGO Signal Panel ─────────────────────────────────────────────
function AlgoSignalPanel({ symbol }: { symbol: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    import("@/lib/api").then(({ fetchChartData }) => {
      fetchChartData(symbol, "medium", "d", 100, "heatmap")
        .then((d: any) => { setData(d); setLoading(false); })
        .catch(() => setLoading(false));
    });
  }, [symbol]);

  if (loading) {
    return (
      <div className="px-3 py-4 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[#00AEEF] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="px-3 py-3">
        <p className="text-[10px]" style={{ color: "#667085" }}>No algo data for {symbol}</p>
      </div>
    );
  }

  const meta = data.metadata || {};
  const trade = data.active_trade;
  const isBull = meta.current_trend === 1;
  const signals = data.signals || [];
  const lastSignal = signals[signals.length - 1];

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b flex-shrink-0" style={{ borderColor: "#1e2a3a" }}>
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: "#00AEEF" }} />
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#00AEEF" }}>
            CheatCode ALGO
          </p>
        </div>
      </div>

      {/* Signal badge */}
      <div className="px-3 py-2.5 border-b" style={{ borderColor: "#1e2a3a" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#667085" }}>Signal</span>
          <span className="text-[11px] font-black px-2 py-0.5 rounded"
                style={{
                  background: isBull ? "#00FF0018" : "#FF000018",
                  color: isBull ? "#00FF00" : "#FF0000",
                  fontFamily: "var(--font-mono)",
                }}>
            {isBull ? "▲ BULL" : "▼ BEAR"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: "#667085" }}>RSI</span>
          <span className="text-[11px] font-semibold" style={{ color: "#e2e8f0", fontFamily: "var(--font-mono)" }}>
            {meta.current_rsi}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px]" style={{ color: "#667085" }}>Signals</span>
          <span className="text-[11px] font-semibold" style={{ color: "#e2e8f0", fontFamily: "var(--font-mono)" }}>
            {meta.total_signals}
          </span>
        </div>
      </div>

      {/* Active trade levels */}
      {trade && (
        <div className="px-3 py-2.5 border-b" style={{ borderColor: "#1e2a3a" }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#667085" }}>
            Active Trade
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00AEEF" }} />
                <span style={{ color: "#667085" }}>Entry</span>
              </span>
              <span className="text-[11px] font-bold" style={{ color: "#00AEEF", fontFamily: "var(--font-mono)" }}>
                ${trade.entry}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#FF0000" }} />
                <span style={{ color: "#667085" }}>Stop Loss</span>
              </span>
              <span className="text-[11px] font-bold" style={{ color: "#FF0000", fontFamily: "var(--font-mono)" }}>
                ${trade.sl}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00FF00" }} />
                <span style={{ color: "#667085" }}>TP1</span>
              </span>
              <span className="text-[11px] font-bold" style={{ color: "#00FF00", fontFamily: "var(--font-mono)" }}>
                ${trade.tp1}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00FF0088" }} />
                <span style={{ color: "#667085" }}>TP2</span>
              </span>
              <span className="text-[11px] font-bold" style={{ color: "#00FF0088", fontFamily: "var(--font-mono)" }}>
                ${trade.tp2}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00FF0055" }} />
                <span style={{ color: "#667085" }}>TP3</span>
              </span>
              <span className="text-[11px] font-bold" style={{ color: "#00FF0055", fontFamily: "var(--font-mono)" }}>
                ${trade.tp3}
              </span>
            </div>
          </div>

          {/* R:R visual */}
          <div className="mt-2 pt-2 border-t" style={{ borderColor: "#1e2a3a22" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#667085" }}>Direction</span>
              <span className="text-[10px] font-bold" style={{ color: trade.direction === "long" ? "#00FF00" : "#FF0000" }}>
                {trade.direction.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Last 3 signals */}
      {signals.length > 0 && (
        <div className="px-3 py-2.5" style={{ borderColor: "#1e2a3a" }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#667085" }}>
            Recent Signals
          </p>
          <div className="space-y-1">
            {signals.slice(-3).reverse().map((sig: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold px-1 rounded"
                        style={{
                          background: sig.direction === "long" ? "#00FF0020" : "#FF000020",
                          color: sig.direction === "long" ? "#00FF00" : "#FF0000",
                        }}>
                    {sig.direction === "long" ? "B" : "S"}
                  </span>
                  <span className="text-[10px]" style={{ color: "#667085" }}>{sig.time}</span>
                </div>
                <span className="text-[10px] font-semibold" style={{ color: "#e2e8f0", fontFamily: "var(--font-mono)" }}>
                  ${sig.entry}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TradingView Chart (official JS widget) ──────────────────────────────────
// TradingView blocks cross-origin iframes (X-Frame-Options: SAMEORIGIN).
// The correct approach is their official "Advanced Chart" JS widget which
// injects its own sandboxed iframe via their CDN script — this always works.
function TradingViewChart({ symbol, mode }: {
  symbol: string;
  mode: MarketMode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<unknown>(null);
  const config = MARKET_MODES[mode];
  const containerId = "tv_advanced_chart";

  useEffect(() => {
    if (!containerRef.current) return;

    // Remove any previous widget
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      // @ts-ignore — TradingView widget is loaded dynamically
      if (typeof window.TradingView !== "undefined") {
        // @ts-ignore
        widgetRef.current = new window.TradingView.widget({
          autosize: true,
          symbol: symbol,
          interval: config.tvInterval,
          timezone: "exchange",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "#000000",
          enable_publishing: false,
          allow_symbol_change: true,
          save_image: true,
          container_id: containerId,
          hide_side_toolbar: false,
          studies: [],
          show_popup_button: true,
          popup_width: "1000",
          popup_height: "650",
          // Force black background via overrides
          overrides: {
            "paneProperties.background": "#000000",
            "paneProperties.backgroundType": "solid",
            "paneProperties.vertGridProperties.color": "#111111",
            "paneProperties.horzGridProperties.color": "#111111",
            "scalesProperties.backgroundColor": "#000000",
            "scalesProperties.lineColor": "#1a1a1a",
            "scalesProperties.textColor": "#667085",
          },
          studies_overrides: {},
        });
      }
    };
    containerRef.current.appendChild(script);

    return () => {
      // Cleanup on unmount / symbol change
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, mode]);

  const tvChartUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}&interval=${config.tvInterval}&theme=dark`;

  return (
    <div className="w-full h-full min-h-0 relative" style={{ background: "#0d1117" }}>
      {/* TradingView widget mounts here */}
      <div
        ref={containerRef}
        id={containerId}
        className="w-full h-full"
        style={{ minHeight: 0 }}
      />
      {/* Open in TradingView escape hatch */}
      <a
        href={tvChartUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity z-10"
        style={{ background: "#1a2035", color: "#e2e8f0", border: "1px solid #1e2a3a" }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 9L9 1M9 1H4M9 1V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Open in TradingView
      </a>
    </div>
  );
}

// ─── Watchlist Panel ──────────────────────────────────────────────────────────
function WatchlistPanel({ mode, onSelectSymbol, activeSymbol }: {
  mode: MarketMode;
  onSelectSymbol: (s: string) => void;
  activeSymbol: string;
}) {
  const config = MARKET_MODES[mode];
  const [search, setSearch] = useState("");
  const [liveWatchlist, setLiveWatchlist] = useState(config.watchlist);

  // Fetch live prices for stocks mode
  useEffect(() => {
    if (mode !== "stocks") { setLiveWatchlist(config.watchlist); return; }
    const symbols = config.watchlist.map(w => w.symbol).join(",");
    import("@/lib/api").then(({ fetchQuotes }) => {
      fetchQuotes(symbols).then((quotes: any[]) => {
        if (!quotes?.length) return;
        const qmap = Object.fromEntries(quotes.map(q => [q.symbol, q]));
        setLiveWatchlist(config.watchlist.map(w => {
          const q = qmap[w.symbol];
          if (!q) return w;
          return {
            ...w,
            price: `$${q.price.toFixed(2)}`,
            change: q.change >= 0 ? `+${q.change.toFixed(2)}` : q.change.toFixed(2),
            pct: q.change_pct >= 0 ? `+${q.change_pct.toFixed(2)}%` : `${q.change_pct.toFixed(2)}%`,
            up: q.change_pct >= 0,
          };
        }));
      }).catch(() => {});
    });
    // Refresh every 30s
    const interval = setInterval(() => {
      import("@/lib/api").then(({ fetchQuotes }) => {
        fetchQuotes(symbols).then((quotes: any[]) => {
          if (!quotes?.length) return;
          const qmap = Object.fromEntries(quotes.map(q => [q.symbol, q]));
          setLiveWatchlist(prev => prev.map(w => {
            const q = qmap[w.symbol];
            if (!q) return w;
            return { ...w, price: `$${q.price.toFixed(2)}`, change: q.change >= 0 ? `+${q.change.toFixed(2)}` : q.change.toFixed(2), pct: q.change_pct >= 0 ? `+${q.change_pct.toFixed(2)}%` : `${q.change_pct.toFixed(2)}%`, up: q.change_pct >= 0 };
          }));
        }).catch(() => {});
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [mode]);

  const filtered = liveWatchlist.filter(w =>
    w.symbol.toLowerCase().includes(search.toLowerCase()) ||
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full" style={{ background: "#0d1117" }}>
      <div className="px-3 py-2.5 border-b" style={{ borderColor: "#1e2a3a" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#667085" }}>Watchlist</p>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full text-xs px-2.5 py-1.5 rounded-lg outline-none"
          style={{ background: "#1a2035", color: "#e2e8f0", border: "1px solid #1e2a3a" }}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map(item => {
          const isActive = activeSymbol.includes(item.symbol.replace("/", ""));
          return (
            <button
              key={item.symbol}
              onClick={() => onSelectSymbol(item.symbol)}
              className="w-full px-3 py-2 flex items-center gap-2 hover:opacity-80 transition-all text-left"
              style={{
                background: isActive ? `${config.color}15` : "transparent",
                borderLeft: isActive ? `2px solid ${config.color}` : "2px solid transparent",
              }}
            >
              <TickerLogo symbol={item.symbol} size={24} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold" style={{ color: "#e2e8f0", fontFamily: "var(--font-mono)" }}>
                  {item.symbol}
                </p>
                <p className="text-[9px] truncate max-w-[90px]" style={{ color: "#667085" }}>{item.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold" style={{ color: "#e2e8f0", fontFamily: "var(--font-mono)" }}>
                  {item.price}
                </p>
                <p className="text-[10px] font-semibold" style={{ color: item.up ? "#4DC820" : "#E8193C", fontFamily: "var(--font-mono)" }}>
                  {item.pct}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Order Panel ──────────────────────────────────────────────────────────────
function OrderPanel({ mode, isLoggedIn }: { mode: MarketMode; isLoggedIn: boolean }) {
  const config = MARKET_MODES[mode];
  const [orderType, setOrderType] = useState(config.orderTypes[0]);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [qty, setQty] = useState("100");
  const [price, setPrice] = useState("");

  return (
    <div className="flex flex-col h-full p-3 gap-3" style={{ background: "#0d1117" }}>
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#667085" }}>Place Order</p>

      {/* Buy / Sell toggle */}
      <div className="grid grid-cols-2 gap-1 rounded-lg p-0.5" style={{ background: "#1a2035" }}>
        <button onClick={() => setSide("buy")}
                className="py-1.5 rounded-md text-xs font-bold transition-all"
                style={{ background: side === "buy" ? "#4DC820" : "transparent", color: side === "buy" ? "#101828" : "#667085" }}>
          Buy
        </button>
        <button onClick={() => setSide("sell")}
                className="py-1.5 rounded-md text-xs font-bold transition-all"
                style={{ background: side === "sell" ? "#E8193C" : "transparent", color: side === "sell" ? "#fff" : "#667085" }}>
          Sell
        </button>
      </div>

      {/* Order type */}
      <div>
        <label className="text-[10px] font-semibold block mb-1" style={{ color: "#667085" }}>Order Type</label>
        <select value={orderType} onChange={e => setOrderType(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg outline-none appearance-none"
                style={{ background: "#1a2035", color: "#e2e8f0", border: "1px solid #1e2a3a" }}>
          {config.orderTypes.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* Quantity */}
      <div>
        <label className="text-[10px] font-semibold block mb-1" style={{ color: "#667085" }}>Quantity</label>
        <input value={qty} onChange={e => setQty(e.target.value)}
               className="w-full text-xs px-2.5 py-1.5 rounded-lg outline-none"
               style={{ background: "#1a2035", color: "#e2e8f0", border: "1px solid #1e2a3a", fontFamily: "var(--font-mono)" }} />
      </div>

      {/* Price (for limit orders) */}
      {orderType !== "Market" && (
        <div>
          <label className="text-[10px] font-semibold block mb-1" style={{ color: "#667085" }}>Limit Price</label>
          <input value={price} onChange={e => setPrice(e.target.value)}
                 placeholder="0.00"
                 className="w-full text-xs px-2.5 py-1.5 rounded-lg outline-none"
                 style={{ background: "#1a2035", color: "#e2e8f0", border: "1px solid #1e2a3a", fontFamily: "var(--font-mono)" }} />
        </div>
      )}

      {/* Submit */}
      <button className="w-full py-2.5 rounded-xl text-xs font-bold mt-auto transition-opacity hover:opacity-90"
              style={{
                background: side === "buy" ? "#4DC820" : "#E8193C",
                color: side === "buy" ? "#101828" : "#fff",
              }}>
        {side === "buy" ? "Buy" : "Sell"} {orderType}
      </button>

      {/* Disclaimer */}
      <p className="text-[9px] text-center leading-tight" style={{ color: "#3d4f6a" }}>
        Paper trading only. Not connected to a live broker.
      </p>
    </div>
  );
}

// ─── Community Chat Sidebar ───────────────────────────────────────────────────
function ChatSidebar({ mode }: { mode: MarketMode }) {
  const config = MARKET_MODES[mode];
  const [activeChannel, setActiveChannel] = useState(config.chatChannels[0].id);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(MOCK_MESSAGES[activeChannel] || MOCK_MESSAGES["stocks-general"]);
  const [onlineCount] = useState(Math.floor(Math.random() * 800) + 200);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Update messages when channel changes
  useEffect(() => {
    setMessages(MOCK_MESSAGES[activeChannel] || MOCK_MESSAGES[config.chatChannels[0].id] || []);
  }, [activeChannel, config.chatChannels]);

  // Update active channel when mode changes
  useEffect(() => {
    setActiveChannel(config.chatChannels[0].id);
  }, [mode]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!message.trim()) return;
    setMessages(prev => [...prev, {
      user: "You",
      avatar: "YO",
      color: config.color,
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      text: message,
    }]);
    setMessage("");
  };

  const currentChannel = config.chatChannels.find(c => c.id === activeChannel);

  return (
    <div className="flex h-full" style={{ background: "#0d1117" }}>
      {/* Channel list — narrow strip */}
      <div className="w-10 flex flex-col items-center py-3 gap-1 border-r flex-shrink-0"
           style={{ borderColor: "#1e2a3a", background: "#080d14" }}>
        {config.chatChannels.map(ch => (
          <button
            key={ch.id}
            onClick={() => setActiveChannel(ch.id)}
            title={ch.label}
            className="relative w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all hover:opacity-90"
            style={{
              background: activeChannel === ch.id ? `${config.color}25` : "#1a2035",
              border: activeChannel === ch.id ? `1px solid ${config.color}60` : "1px solid transparent",
            }}
          >
            <span>{ch.icon}</span>
            {ch.unread && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center text-white"
                    style={{ background: "#E8193C" }}>
                {ch.unread > 9 ? "9+" : ch.unread}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Chat header */}
        <div className="px-3 py-2 border-b flex items-center justify-between flex-shrink-0"
             style={{ borderColor: "#1e2a3a" }}>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm">{currentChannel?.icon}</span>
            <span className="text-xs font-bold text-white truncate">{currentChannel?.label}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Circle size={6} fill="#4DC820" color="#4DC820" />
            <span className="text-[10px]" style={{ color: "#667085" }}>{onlineCount}</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2 min-h-0">
          {messages.map((msg, i) => (
            <div key={i} className="flex gap-2 group hover:bg-white/5 rounded-lg px-1 py-0.5 transition-colors">
              {/* Avatar */}
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 mt-0.5"
                   style={{ background: msg.color + "33", color: msg.color, border: `1px solid ${msg.color}44` }}>
                {msg.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[11px] font-bold" style={{ color: msg.color }}>{msg.user}</span>
                  {msg.badge && (
                    <span className="text-[8px] font-bold px-1 py-0.5 rounded"
                          style={{ background: config.color + "22", color: config.color }}>
                      {msg.badge}
                    </span>
                  )}
                  <span className="text-[9px]" style={{ color: "#3d4f6a" }}>{msg.time}</span>
                </div>
                <p className="text-[11px] leading-relaxed break-words" style={{ color: "#94a3b8" }}>
                  {msg.text}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        <div className="px-2 pb-2 pt-1 flex-shrink-0">
          <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
               style={{ background: "#1a2035", border: "1px solid #1e2a3a" }}>
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder={`Message #${currentChannel?.label}...`}
              className="flex-1 text-xs bg-transparent outline-none min-w-0"
              style={{ color: "#e2e8f0" }}
            />
            <button onClick={sendMessage}
                    className="flex-shrink-0 p-1 rounded transition-opacity hover:opacity-80"
                    style={{ color: message.trim() ? config.color : "#3d4f6a" }}>
              <Send size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mobile Terminal Tabs ────────────────────────────────────────────────────
function MobileTerminalTabs({ mode, onSelectSymbol, activeSymbol, isLoggedIn }: {
  mode: MarketMode;
  onSelectSymbol: (s: string) => void;
  activeSymbol: string;
  isLoggedIn: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"watchlist" | "chat" | "order">("watchlist");
  const config = MARKET_MODES[mode];

  return (
    <div className="lg:hidden flex flex-col border-t" style={{ borderColor: "#1e2a3a", background: "#0d1117", maxHeight: "45vh" }}>
      {/* Tab bar */}
      <div className="flex border-b flex-shrink-0" style={{ borderColor: "#1e2a3a" }}>
        {(["watchlist", "chat", "order"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2 text-xs font-bold capitalize transition-all"
            style={{
              color: activeTab === tab ? config.color : "#667085",
              borderBottom: activeTab === tab ? `2px solid ${config.color}` : "2px solid transparent",
              background: "transparent",
            }}
          >
            {tab === "watchlist" ? "📋 Watchlist" : tab === "chat" ? "💬 Chat" : "📊 Order"}
          </button>
        ))}
      </div>
      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "watchlist" && (
          <WatchlistPanel mode={mode} onSelectSymbol={onSelectSymbol} activeSymbol={activeSymbol} />
        )}
        {activeTab === "chat" && <ChatSidebar mode={mode} />}
        {activeTab === "order" && <OrderPanel mode={mode} isLoggedIn={isLoggedIn} />}
      </div>
    </div>
  );
}

// ─── Main Terminal Page ───────────────────────────────────────────────────────
export default function TerminalPage() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<MarketMode>("stocks");
  const [symbol, setSymbol] = useState(MARKET_MODES.stocks.defaultSymbol);
  const [isLoggedIn] = useState(false); // Would come from auth context
  // tvLoggedIn: persisted in localStorage so the user only needs to confirm once
  const [tvLoggedIn, setTvLoggedIn] = useState<boolean>(() => {
    try { return localStorage.getItem("cc-tv-logged-in") === "true"; } catch { return false; }
  });
  const handleTvLoginConfirmed = () => {
    setTvLoggedIn(true);
    try { localStorage.setItem("cc-tv-logged-in", "true"); } catch {}
  };
  const handleTvLogout = () => {
    setTvLoggedIn(false);
    try { localStorage.removeItem("cc-tv-logged-in"); } catch {}
  };
  const config = MARKET_MODES[mode];

  // When mode changes, update default symbol
  const handleModeChange = (newMode: MarketMode) => {
    setMode(newMode);
    setSymbol(MARKET_MODES[newMode].defaultSymbol);
  };

  const handleSelectSymbol = (sym: string) => {
    const tvMap: Record<string, string> = {
      "NVDA": "NASDAQ:NVDA", "TSLA": "NASDAQ:TSLA", "AMD": "NASDAQ:AMD",
      "AAPL": "NASDAQ:AAPL", "META": "NASDAQ:META", "MSFT": "NASDAQ:MSFT",
      "NFLX": "NASDAQ:NFLX", "SMCI": "NASDAQ:SMCI",
      "ES1!": "CME_MINI:ES1!", "NQ1!": "CME_MINI:NQ1!", "CL1!": "NYMEX:CL1!",
      "GC1!": "COMEX:GC1!", "BTC/USDT": "BINANCE:BTCUSDT", "ETH/USDT": "BINANCE:ETHUSDT",
      "SOL/USDT": "BINANCE:SOLUSDT", "EUR/USD": "FX:EURUSD", "GBP/USD": "FX:GBPUSD",
    };
    setSymbol(tvMap[sym] || sym);
  };

  const modeIcons: Record<MarketMode, React.ReactNode> = {
    stocks: <TrendingUp size={13} />,
    futures: <BarChart2 size={13} />,
    forex: <Globe size={13} />,
    crypto: <Bitcoin size={13} />,
  };

  return (
    // Force dark terminal theme regardless of global theme
    <div className="dark" style={{ colorScheme: "dark" }}>
      <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#080d14" }}>

        {/* ── Terminal Top Bar ── */}
        <div className="flex items-center gap-3 px-4 py-2 border-b flex-shrink-0 z-10"
             style={{ background: "#0d1117", borderColor: "#1e2a3a" }}>

          {/* Back + Logo */}
          <button onClick={() => setLocation("/")}
                  className="flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity flex-shrink-0"
                  style={{ color: "#667085" }}>
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Home</span>
          </button>

          <div className="w-px h-5 flex-shrink-0" style={{ background: "#1e2a3a" }} />

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {(["stocks", "futures", "forex", "crypto"] as MarketMode[]).map(m => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: mode === m ? `${MARKET_MODES[m].color}20` : "transparent",
                  color: mode === m ? MARKET_MODES[m].color : "#667085",
                  border: mode === m ? `1px solid ${MARKET_MODES[m].color}40` : "1px solid transparent",
                }}
              >
                {modeIcons[m]}
                <span className="hidden sm:inline capitalize">{m}</span>
              </button>
            ))}
          </div>

          <div className="w-px h-5 flex-shrink-0" style={{ background: "#1e2a3a" }} />

          {/* Current symbol display */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-black truncate" style={{ color: "#e2e8f0", fontFamily: "var(--font-mono)" }}>
              {symbol.split(":")[1] || symbol}
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: config.color + "20", color: config.color }}>
              {mode.toUpperCase()}
            </span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <Circle size={6} fill="#4DC820" color="#4DC820" />
              <span className="text-[10px]" style={{ color: "#667085" }}>Live</span>
            </div>
            <button className="p-1.5 rounded-lg hover:opacity-80 transition-opacity"
                    style={{ background: "#1a2035", color: "#667085" }}>
              <Bell size={13} />
            </button>
            {tvLoggedIn ? (
              <button
                onClick={handleTvLogout}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: "#1a2035", color: "#4DC820", border: "1px solid #4DC82040" }}
              >
                <Circle size={6} fill="#4DC820" color="#4DC820" />
                <span className="hidden sm:inline">TV Connected</span>
              </button>
            ) : (
              <button
                onClick={() => window.open("https://www.tradingview.com/accounts/signin/", "_blank")}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90"
                style={{ background: "#2962FF", color: "#fff" }}
              >
                <LogIn size={12} />
                <span className="hidden sm:inline">Connect TV</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Terminal Body ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Watchlist — left panel (hidden on mobile) */}
          <div className="hidden lg:block w-56 flex-shrink-0 border-r overflow-hidden" style={{ borderColor: "#1e2a3a" }}>
            <WatchlistPanel mode={mode} onSelectSymbol={handleSelectSymbol} activeSymbol={symbol} />
          </div>

          {/* Chart — TradingView */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <TradingViewChart symbol={symbol} mode={mode} />
          </div>

          {/* Right panel: CheatCode ALGO signals + stats */}
          <div className="hidden lg:flex w-52 flex-shrink-0 border-l flex-col overflow-y-auto" style={{ borderColor: "#1e2a3a" }}>
            {/* <AlgoSignalPanel symbol={symbol.includes(":") ? symbol.split(":")[1].replace("1!", "") : symbol} /> */}

            <div className="px-3 py-2 border-t flex-shrink-0" style={{ borderColor: "#1e2a3a" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#667085" }}>
                Market Stats
              </p>
              <div className="space-y-1.5">
                {[
                  { label: "Open", value: mode === "stocks" ? "5,218.40" : mode === "crypto" ? "67,180" : "1.0824" },
                  { label: "High", value: mode === "stocks" ? "5,261.20" : mode === "crypto" ? "68,920" : "1.0868" },
                  { label: "Low", value: mode === "stocks" ? "5,198.80" : mode === "crypto" ? "67,040" : "1.0812" },
                  { label: "Volume", value: mode === "stocks" ? "2.4B" : mode === "crypto" ? "28.4B" : "142K" },
                ].map(stat => (
                  <div key={stat.label} className="flex justify-between">
                    <span className="text-[10px]" style={{ color: "#667085" }}>{stat.label}</span>
                    <span className="text-[10px] font-semibold" style={{ color: "#e2e8f0", fontFamily: "var(--font-mono)" }}>
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              <OrderPanel mode={mode} isLoggedIn={isLoggedIn} />
            </div>
          </div>

          {/* Community Chat — far right (hidden on mobile) */}
          <div className="hidden lg:block w-64 flex-shrink-0 border-l overflow-hidden" style={{ borderColor: "#1e2a3a" }}>
            <ChatSidebar mode={mode} />
          </div>
        </div>

        {/* ── Mobile Panel Tabs (lg: hidden) ── */}
        <MobileTerminalTabs mode={mode} onSelectSymbol={handleSelectSymbol} activeSymbol={symbol} isLoggedIn={isLoggedIn} />

        {/* ── Bottom Status Bar ── */}
        <div className="flex items-center justify-between px-4 py-1 border-t flex-shrink-0"
             style={{ background: "#080d14", borderColor: "#1e2a3a" }}>
          <div className="flex items-center gap-4">
            <span className="text-[10px]" style={{ color: "#3d4f6a" }}>
              CheatCode Terminal v1.0
            </span>
            <span className="text-[10px]" style={{ color: "#3d4f6a" }}>
              Data: TradingView
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Circle size={5} fill="#4DC820" color="#4DC820" />
              <span className="text-[10px]" style={{ color: "#4DC820" }}>Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
