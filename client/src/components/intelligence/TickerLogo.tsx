// TickerLogo — displays company logos, crypto icons, or symbolic icons for all ticker types
// Sources (in priority order):
//   1. Crypto: CoinGecko (most reliable for crypto)
//   2. Stocks/ETFs: Finnhub static CDN (covers SOFI, BYD, most US stocks)
//   3. Stocks/ETFs: Parqet CDN fallback
//   4. Forex: flag emoji pairs rendered as SVG text
//   5. Futures/Commodities: custom inline SVG icons
//   6. Fallback: colored initials badge

import { useState } from "react";

// ─── Forex flag map ────────────────────────────────────────────────────────────
const CURRENCY_FLAGS: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵",
  AUD: "🇦🇺", CAD: "🇨🇦", CHF: "🇨🇭", NZD: "🇳🇿",
  CNY: "🇨🇳", HKD: "🇭🇰", SGD: "🇸🇬", SEK: "🇸🇪",
  NOK: "🇳🇴", MXN: "🇲🇽", INR: "🇮🇳", BRL: "🇧🇷",
  ZAR: "🇿🇦", TRY: "🇹🇷", KRW: "🇰🇷",
};

// ─── Futures / commodity icon map ─────────────────────────────────────────────
const FUTURES_ICONS: Record<string, { icon: string; label: string; bg: string }> = {
  ES:  { icon: "📈", label: "S&P 500", bg: "#1a56db" },
  NQ:  { icon: "💻", label: "Nasdaq",  bg: "#7c3aed" },
  YM:  { icon: "🏛️", label: "Dow",     bg: "#0369a1" },
  RTY: { icon: "📊", label: "Russell", bg: "#0891b2" },
  CL:  { icon: "🛢️", label: "Oil",     bg: "#92400e" },
  NG:  { icon: "🔥", label: "Nat Gas", bg: "#b45309" },
  GC:  { icon: "🥇", label: "Gold",    bg: "#b45309" },
  SI:  { icon: "🥈", label: "Silver",  bg: "#6b7280" },
  HG:  { icon: "⚙️", label: "Copper",  bg: "#92400e" },
  ZB:  { icon: "📋", label: "T-Bond",  bg: "#1e40af" },
  ZN:  { icon: "📋", label: "10Y",     bg: "#1d4ed8" },
  ZF:  { icon: "📋", label: "5Y",      bg: "#2563eb" },
  ZW:  { icon: "🌾", label: "Wheat",   bg: "#d97706" },
  ZC:  { icon: "🌽", label: "Corn",    bg: "#f59e0b" },
  ZS:  { icon: "🫘", label: "Soy",     bg: "#65a30d" },
  VX:  { icon: "⚡", label: "VIX",     bg: "#dc2626" },
};

// ─── Crypto: CoinGecko URLs ───────────────────────────────────────────────────
const CRYPTO_COINGECKO: Record<string, string> = {
  BTC:  "https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png",
  ETH:  "https://assets.coingecko.com/coins/images/279/thumb/ethereum.png",
  SOL:  "https://assets.coingecko.com/coins/images/4128/thumb/solana.png",
  BNB:  "https://assets.coingecko.com/coins/images/825/thumb/bnb-icon2_2x.png",
  XRP:  "https://assets.coingecko.com/coins/images/44/thumb/xrp-symbol-white-128.png",
  DOGE: "https://assets.coingecko.com/coins/images/5/thumb/dogecoin.png",
  ADA:  "https://assets.coingecko.com/coins/images/975/thumb/cardano.png",
  AVAX: "https://assets.coingecko.com/coins/images/12559/thumb/Avalanche_Circle_RedWhite_Trans.png",
  DOT:  "https://assets.coingecko.com/coins/images/12171/thumb/polkadot.png",
  LINK: "https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png",
  MATIC:"https://assets.coingecko.com/coins/images/4713/thumb/matic-token-icon.png",
  LTC:  "https://assets.coingecko.com/coins/images/2/thumb/litecoin.png",
};

// ─── Tickers that Finnhub does NOT have (use Parqet directly) ─────────────────
const SKIP_FINNHUB = new Set(["META", "GOOGL", "GOOG", "AMZN"]);

interface TickerLogoProps {
  symbol: string;
  size?: number;
  className?: string;
}

/** Parse a forex pair like "EURUSD" → ["EUR", "USD"] */
function parseForexPair(symbol: string): [string, string] | null {
  const s = symbol.toUpperCase().replace("/", "");
  if (s.length === 6) {
    const base = s.slice(0, 3);
    const quote = s.slice(3, 6);
    if (CURRENCY_FLAGS[base] && CURRENCY_FLAGS[quote]) return [base, quote];
  }
  return null;
}

/** Consistent hue from ticker string for fallback badge */
function tickerHue(sym: string) {
  return sym.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
}

export function TickerLogo({ symbol, size = 28, className = "" }: TickerLogoProps) {
  const [finnhubError, setFinnhubError] = useState(false);
  const [parqetError, setParqetError] = useState(false);
  const [cgError, setCgError] = useState(false);

  const sym = symbol.toUpperCase();

  // ── Forex pair: two overlapping flag emojis ──────────────────────────────
  const forexPair = parseForexPair(sym);
  if (forexPair) {
    const [base, quote] = forexPair;
    return (
      <div
        className={`flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 ${className}`}
        style={{ width: size, height: size, background: "var(--muted)", fontSize: size * 0.38 }}
        title={symbol}
      >
        <span style={{ lineHeight: 1 }}>{CURRENCY_FLAGS[base]}</span>
        <span style={{ lineHeight: 1, marginLeft: -size * 0.12 }}>{CURRENCY_FLAGS[quote]}</span>
      </div>
    );
  }

  // ── Futures / commodity: emoji icon in colored circle ────────────────────
  const futuresInfo = FUTURES_ICONS[sym];
  if (futuresInfo) {
    return (
      <div
        className={`flex items-center justify-center rounded-full flex-shrink-0 ${className}`}
        style={{ width: size, height: size, background: futuresInfo.bg, fontSize: size * 0.45 }}
        title={futuresInfo.label}
      >
        <span style={{ lineHeight: 1 }}>{futuresInfo.icon}</span>
      </div>
    );
  }

  // ── Crypto: try CoinGecko URL ─────────────────────────────────────────────
  const cgUrl = CRYPTO_COINGECKO[sym];
  if (cgUrl && !cgError) {
    return (
      <img
        src={cgUrl}
        alt={sym}
        width={size}
        height={size}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        onError={() => setCgError(true)}
        style={{ width: size, height: size }}
      />
    );
  }

  // ── Stocks/ETFs: try Finnhub CDN first (covers SOFI, BYD, most US stocks) ─
  const finnhubUrl = `https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/${encodeURIComponent(sym)}.png`;
  if (!SKIP_FINNHUB.has(sym) && !finnhubError) {
    return (
      <img
        src={finnhubUrl}
        alt={sym}
        width={size}
        height={size}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        onError={() => setFinnhubError(true)}
        style={{ width: size, height: size }}
      />
    );
  }

  // ── Stocks/ETFs: try Parqet CDN as fallback ───────────────────────────────
  const parqetUrl = `https://assets.parqet.com/logos/symbol/${encodeURIComponent(sym)}?format=jpg`;
  if (!parqetError) {
    return (
      <img
        src={parqetUrl}
        alt={sym}
        width={size}
        height={size}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        onError={() => setParqetError(true)}
        style={{ width: size, height: size }}
      />
    );
  }

  // ── Fallback: colored initials badge ─────────────────────────────────────
  const initials = sym.slice(0, 2);
  const hue = tickerHue(sym);
  return (
    <div
      className={`flex items-center justify-center rounded-full font-black flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: `hsl(${hue}, 65%, 45%)`,
        color: "#fff",
        fontSize: size * 0.32,
        letterSpacing: "-0.5px",
      }}
      title={sym}
    >
      {initials}
    </div>
  );
}
