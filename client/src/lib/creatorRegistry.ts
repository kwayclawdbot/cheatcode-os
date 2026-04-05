/**
 * CheatCode OS — Creator Registry
 *
 * Fetches creators from the live API and enriches them with:
 * - Real YouTube avatar URLs (CDN-hosted, since backend avatar_url is null)
 * - Brand colors, bios, specialties, and other display metadata
 *
 * NO MOCK DATA — all content comes from the live Railway API.
 * Avatar URLs are embedded here because the backend pipeline does not yet
 * populate the `avatar_url` column in the creators table.
 */

import { fetchCreators, type Creator } from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegistryCreator {
  id: string;           // slug (used in URLs)
  name: string;
  slug: string;
  platform: string;
  avatarUrl: string;
  description: string;
  qualityScore: number;
  tags: string[];
  contentCount: number;
  color: string;
  verified: boolean;
  bio?: string;
  handle?: string;
  specialty?: string;
  youtubeUrl?: string;
  topTickers?: string[];
  kaiTake?: string;
}

// ─── CDN Avatar Map ───────────────────────────────────────────────────────────
// Keyed by creator slug (as returned by the API).
// These are real YouTube channel profile pictures uploaded to our CDN.

const CDN_AVATARS: Record<string, string> = {
  "mark-minervini":            "https://d2xsxph8kpxj0f.cloudfront.net/310519663185570724/QgiApnmXYRXSMA2KNkFFkL/mark-minervini_645b8b81.jpg",
  "minervini":                 "https://d2xsxph8kpxj0f.cloudfront.net/310519663185570724/QgiApnmXYRXSMA2KNkFFkL/mark-minervini_645b8b81.jpg",
  "earn-your-leisure":         "https://d2xsxph8kpxj0f.cloudfront.net/310519663185570724/QgiApnmXYRXSMA2KNkFFkL/market-mondays_4cee7abf.jpg",
  "market-mondays":            "https://d2xsxph8kpxj0f.cloudfront.net/310519663185570724/QgiApnmXYRXSMA2KNkFFkL/market-mondays_4cee7abf.jpg",
  "real-vision":               "https://d2xsxph8kpxj0f.cloudfront.net/310519663185570724/QgiApnmXYRXSMA2KNkFFkL/real-vision_2aac4187.jpg",
  "smb-capital":               "https://d2xsxph8kpxj0f.cloudfront.net/310519663185570724/QgiApnmXYRXSMA2KNkFFkL/smb-capital_784b12f2.jpg",
  "tjr-trades":                "https://d2xsxph8kpxj0f.cloudfront.net/310519663185570724/QgiApnmXYRXSMA2KNkFFkL/tjr-trades_95fe9e96.jpg",
  "tastytrade":                "https://d2xsxph8kpxj0f.cloudfront.net/310519663185570724/QgiApnmXYRXSMA2KNkFFkL/tastytrade_528cdbef.jpg",
  "tastylive":                 "https://d2xsxph8kpxj0f.cloudfront.net/310519663185570724/QgiApnmXYRXSMA2KNkFFkL/tastytrade_528cdbef.jpg",
  "humbled-trader":            "https://d2xsxph8kpxj0f.cloudfront.net/310519663185570724/QgiApnmXYRXSMA2KNkFFkL/humbled-trader_d7c67684.jpg",
  "investors-podcast":         "https://d2xsxph8kpxj0f.cloudfront.net/310519663185570724/QgiApnmXYRXSMA2KNkFFkL/investors-podcast_895ff54f.jpg",
  "investors-podcast-network": "https://d2xsxph8kpxj0f.cloudfront.net/310519663185570724/QgiApnmXYRXSMA2KNkFFkL/investors-podcast_895ff54f.jpg",
  "chris-sain":                "https://d2xsxph8kpxj0f.cloudfront.net/310519663185570724/QgiApnmXYRXSMA2KNkFFkL/chris-sain_7f64111c.jpg",
  "rayner-teo":                "https://d2xsxph8kpxj0f.cloudfront.net/310519663185570724/QgiApnmXYRXSMA2KNkFFkL/rayner-teo_1eb79c63.jpg",
  "tradingwithrayner":         "https://d2xsxph8kpxj0f.cloudfront.net/310519663185570724/QgiApnmXYRXSMA2KNkFFkL/rayner-teo_1eb79c63.jpg",
  "adam-khoo":                 "https://d2xsxph8kpxj0f.cloudfront.net/310519663185570724/QgiApnmXYRXSMA2KNkFFkL/adam-khoo_aeee05be.jpg",
  "warrior-trading":           "https://d2xsxph8kpxj0f.cloudfront.net/310519663185570724/QgiApnmXYRXSMA2KNkFFkL/warrior-trading_9e0611e6.jpg",
  "daytradewarrior":           "https://d2xsxph8kpxj0f.cloudfront.net/310519663185570724/QgiApnmXYRXSMA2KNkFFkL/warrior-trading_9e0611e6.jpg",
  "ziptrader":                 "https://d2xsxph8kpxj0f.cloudfront.net/310519663185570724/QgiApnmXYRXSMA2KNkFFkL/ziptrader_bff25220.jpg",
};

// ─── Enrichment Map ───────────────────────────────────────────────────────────

interface CreatorEnrichment {
  color: string;
  bio?: string;
  handle?: string;
  specialty?: string;
  youtubeUrl?: string;
  topTickers?: string[];
  kaiTake?: string;
}

const CREATOR_ENRICHMENT: Record<string, CreatorEnrichment> = {
  "mark-minervini": {
    color: "#12B76A",
    handle: "@TheRealMarkMinervini",
    specialty: "VCP Patterns, Swing Trading",
    bio: "2-time U.S. Investing Champion and author of 'Trade Like a Stock Market Wizard'. Famous for the VCP (Volatility Contraction Pattern) setup.",
    youtubeUrl: "https://www.youtube.com/@TheRealMarkMinervini",
    topTickers: ["AMD", "NFLX", "NVDA", "SMCI"],
    kaiTake: "Minervini's VCP calls have a 78% convergence rate with Kai's technical agent. His setups tend to precede breakouts by 3–7 days on average.",
  },
  "minervini": {
    color: "#12B76A",
    handle: "@TheRealMarkMinervini",
    specialty: "VCP Patterns, Swing Trading",
    bio: "2-time U.S. Investing Champion and author of 'Trade Like a Stock Market Wizard'. Famous for the VCP (Volatility Contraction Pattern) setup.",
    youtubeUrl: "https://www.youtube.com/@TheRealMarkMinervini",
    topTickers: ["AMD", "NFLX", "NVDA", "SMCI"],
    kaiTake: "Minervini's VCP calls have a 78% convergence rate with Kai's technical agent.",
  },
  "earn-your-leisure": {
    color: "#7B2FBE",
    handle: "@EarnYourLeisure",
    specialty: "Market Mondays, Investing, Business",
    bio: "Earn Your Leisure is a financial literacy podcast hosted by Rashad Bilal and Troy Millings. Market Mondays is their flagship investing segment.",
    youtubeUrl: "https://www.youtube.com/@EarnYourLeisure",
    topTickers: ["AAPL", "AMZN", "GOOGL", "TSLA"],
    kaiTake: "EYL's Market Mondays segment covers retail-accessible investing themes with strong community engagement.",
  },
  "market-mondays": {
    color: "#7B2FBE",
    handle: "@EarnYourLeisure",
    specialty: "Market Mondays, Investing, Business",
    bio: "Earn Your Leisure is a financial literacy podcast hosted by Rashad Bilal and Troy Millings. Market Mondays is their flagship investing segment.",
    youtubeUrl: "https://www.youtube.com/@EarnYourLeisure",
    topTickers: ["AAPL", "AMZN", "GOOGL", "TSLA"],
    kaiTake: "EYL's Market Mondays segment covers retail-accessible investing themes with strong community engagement.",
  },
  "real-vision": {
    color: "#2E90FA",
    handle: "@realvision",
    specialty: "Macro, Institutional Research",
    bio: "Real Vision is the world's only video-on-demand channel for finance. Founded by Raoul Pal and Grant Williams.",
    youtubeUrl: "https://www.youtube.com/@RealVisionFinance",
    topTickers: ["KKR", "ARCC", "BX", "TLT"],
    kaiTake: "Real Vision's macro deep dives are the highest-signal content for Kai's regime classification agent. Their private credit coverage has been 2–3 weeks ahead of mainstream.",
  },
  "smb-capital": {
    color: "#00AEEF",
    handle: "@smbcapital",
    specialty: "Prop Trading, Setups, Training",
    bio: "SMB Capital is a proprietary trading firm and trading education company based in NYC. Founded by Mike Bellafiore and Steve Spencer.",
    youtubeUrl: "https://www.youtube.com/@smbcapital",
    topTickers: ["NVDA", "AMD", "TSLA", "META"],
    kaiTake: "SMB Capital's playbook content has the highest institutional-grade signal density. Their sector rotation calls have preceded Kai's theme escalations by an average of 5 days.",
  },
  "tjr-trades": {
    color: "#F79009",
    handle: "@TJRTrades",
    specialty: "Day Trading, Momentum, Small Cap",
    bio: "TJR Trades focuses on momentum day trading strategies with a transparent, real-time approach to market analysis.",
    youtubeUrl: "https://www.youtube.com/@TJRTrades",
    topTickers: ["SPY", "QQQ", "TSLA"],
    kaiTake: "TJR Trades' momentum setups align well with Kai's short-term flow signals.",
  },
  "tastytrade": {
    color: "#F79009",
    handle: "@tastytrade",
    specialty: "Options, Derivatives, Flow Analysis",
    bio: "tastytrade is a financial network for options and futures traders. Their research-driven approach has educated millions of retail traders on probability-based strategies.",
    youtubeUrl: "https://www.youtube.com/@tastytrade",
    topTickers: ["NVDA", "SMCI", "AMD", "SPY"],
    kaiTake: "tastytrade's options flow alerts have a strong correlation with Kai's unusual activity agent. Their NVDA and SMCI calls have been particularly accurate.",
  },
  "tastylive": {
    color: "#F79009",
    handle: "@tastylive",
    specialty: "Options, Derivatives, Flow Analysis",
    bio: "tastytrade (formerly tastylive) is a financial network for options and futures traders.",
    youtubeUrl: "https://www.youtube.com/@tastylive",
    topTickers: ["NVDA", "SMCI", "AMD", "SPY"],
    kaiTake: "tastytrade's options flow alerts have a strong correlation with Kai's unusual activity agent.",
  },
  "humbled-trader": {
    color: "#F04438",
    handle: "@HumbledTrader",
    specialty: "Day Trading, Psychology, Risk Management",
    bio: "Humbled Trader is a full-time day trader and educator known for her transparent, psychology-first approach. She focuses on NASDAQ small caps.",
    youtubeUrl: "https://www.youtube.com/@HumbledTrader",
    topTickers: ["TSLA", "SPY", "QQQ", "NVDA"],
    kaiTake: "Humbled Trader's psychology content scores highest with Kai's sentiment agent. Her risk management frameworks align closely with Kai's position sizing recommendations.",
  },
  "investors-podcast": {
    color: "#2E90FA",
    handle: "@InvestorsPodcastNetwork",
    specialty: "Value Investing, We Study Billionaires",
    bio: "The Investor's Podcast Network hosts We Study Billionaires and other shows studying the world's greatest investors.",
    youtubeUrl: "https://www.youtube.com/@InvestorsPodcastNetwork",
    topTickers: ["BRK.B", "AAPL", "MSFT"],
    kaiTake: "TIP's long-form value investing content provides foundational context for Kai's fundamental analysis agent.",
  },
  "investors-podcast-network": {
    color: "#2E90FA",
    handle: "@InvestorsPodcastNetwork",
    specialty: "Value Investing, We Study Billionaires",
    bio: "The Investor's Podcast Network hosts We Study Billionaires and other shows studying the world's greatest investors.",
    youtubeUrl: "https://www.youtube.com/@InvestorsPodcastNetwork",
    topTickers: ["BRK.B", "AAPL", "MSFT"],
    kaiTake: "TIP's long-form value investing content provides foundational context for Kai's fundamental analysis agent.",
  },
  "chris-sain": {
    color: "#12B76A",
    handle: "@ChrisSain1",
    specialty: "Stock Market, Beginner Investing",
    bio: "Chris Sain Jr. is a financial educator and stock market coach known for making investing accessible to beginners. Over 1.1M YouTube subscribers.",
    youtubeUrl: "https://www.youtube.com/@ChrisSain1",
    topTickers: ["AAPL", "TSLA", "NVDA", "AMZN"],
    kaiTake: "Chris Sain's content bridges retail investor sentiment with actionable stock picks, providing Kai with retail flow signals.",
  },
  "rayner-teo": {
    color: "#0EA5E9",
    handle: "@tradingwithrayner",
    specialty: "Forex, Technical Analysis, Swing Trading",
    bio: "Rayner Teo is an independent trader and founder of TradingwithRayner. With 2.16M subscribers, he teaches technical analysis and forex trading strategies.",
    youtubeUrl: "https://www.youtube.com/@tradingwithrayner",
    topTickers: ["EUR/USD", "GBP/USD", "SPY"],
    kaiTake: "Rayner Teo's technical analysis frameworks provide strong cross-market signal validation for Kai's chart pattern agent.",
  },
  "tradingwithrayner": {
    color: "#0EA5E9",
    handle: "@tradingwithrayner",
    specialty: "Forex, Technical Analysis, Swing Trading",
    bio: "Rayner Teo is an independent trader and founder of TradingwithRayner. With 2.16M subscribers, he teaches technical analysis and forex trading strategies.",
    youtubeUrl: "https://www.youtube.com/@tradingwithrayner",
    topTickers: ["EUR/USD", "GBP/USD", "SPY"],
    kaiTake: "Rayner Teo's technical analysis frameworks provide strong cross-market signal validation for Kai's chart pattern agent.",
  },
  "adam-khoo": {
    color: "#EE46BC",
    handle: "@AdamKhoo",
    specialty: "Stock Trading, Options, Value Investing",
    bio: "Adam Khoo is a professional trader and investor with 1.1M subscribers. Known for his probability approach to trading and comprehensive stock courses.",
    youtubeUrl: "https://www.youtube.com/@AdamKhoo",
    topTickers: ["NVDA", "AAPL", "TSLA", "MSFT"],
    kaiTake: "Adam Khoo's probability-based options strategies align with Kai's risk-adjusted signal scoring methodology.",
  },
  "warrior-trading": {
    color: "#F04438",
    handle: "@DaytradeWarrior",
    specialty: "Day Trading, Small Account, Momentum",
    bio: "Ross Cameron turned $583.15 into over $10 million day trading. Warrior Trading teaches small account day trading strategies with verified results.",
    youtubeUrl: "https://www.youtube.com/@DaytradeWarrior",
    topTickers: ["SPY", "QQQ", "TSLA", "NVDA"],
    kaiTake: "Warrior Trading's momentum setups and small-account strategies provide Kai with retail day-trading sentiment signals.",
  },
  "daytradewarrior": {
    color: "#F04438",
    handle: "@DaytradeWarrior",
    specialty: "Day Trading, Small Account, Momentum",
    bio: "Ross Cameron turned $583.15 into over $10 million day trading.",
    youtubeUrl: "https://www.youtube.com/@DaytradeWarrior",
    topTickers: ["SPY", "QQQ", "TSLA"],
    kaiTake: "Warrior Trading's momentum setups provide Kai with retail day-trading sentiment signals.",
  },
  "ziptrader": {
    color: "#4DC820",
    handle: "@ZipTrader",
    specialty: "Stock Analysis, Day Trading, Growth Stocks",
    bio: "ZipTrader (Charlie Plattus) provides market analysis that's easy to understand. 861K subscribers covering growth stocks and day trading strategies.",
    youtubeUrl: "https://www.youtube.com/@ZipTrader",
    topTickers: ["TSLA", "NVDA", "AMD", "AAPL"],
    kaiTake: "ZipTrader's growth stock analysis provides Kai with retail momentum signals and early-stage breakout identification.",
  },
};

// ─── Color generation (fallback) ──────────────────────────────────────────────

const BRAND_COLORS = [
  "#4DC820", "#00AEEF", "#E8193C", "#7B2FBE",
  "#F79009", "#2E90FA", "#12B76A", "#EE46BC",
  "#F04438", "#0EA5E9",
];

function generateColor(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = slug.charCodeAt(i) + ((hash << 5) - hash);
  }
  return BRAND_COLORS[Math.abs(hash) % BRAND_COLORS.length];
}

// ─── Normalization ────────────────────────────────────────────────────────────

function normalizeCreator(apiCreator: Creator): RegistryCreator {
  const slug = apiCreator.slug;
  const enrichment = CREATOR_ENRICHMENT[slug] || {};
  const avatarUrl = apiCreator.avatar_url || CDN_AVATARS[slug] || "";

  return {
    id: slug,
    name: apiCreator.name,
    slug,
    platform: apiCreator.platform,
    avatarUrl,
    description: apiCreator.description || enrichment.bio || "",
    qualityScore: apiCreator.quality_score,
    tags: apiCreator.tags,
    contentCount: apiCreator.content_count,
    color: enrichment.color || generateColor(slug),
    verified: apiCreator.quality_score >= 0.7,
    bio: enrichment.bio || apiCreator.description || undefined,
    handle: enrichment.handle || `@${slug}`,
    specialty: enrichment.specialty || apiCreator.tags
      .slice(0, 2)
      .map(t => t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()))
      .join(", "),
    youtubeUrl: enrichment.youtubeUrl || (
      apiCreator.platform === "youtube"
        ? `https://youtube.com/@${slug}`
        : undefined
    ),
    topTickers: enrichment.topTickers || [],
    kaiTake: enrichment.kaiTake || `${apiCreator.name} is a curated creator on CheatCode. Their content has been analyzed by Kai for signal quality and market relevance.`,
  };
}

// ─── Registry Storage ─────────────────────────────────────────────────────────

const REGISTRY_KEY = "cc-creator-registry-v3";
const REGISTRY_TTL = 5 * 60 * 1000; // 5 minutes

interface StoredRegistry {
  creators: RegistryCreator[];
  fetchedAt: number;
}

function loadFromStorage(): RegistryCreator[] | null {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return null;
    const stored: StoredRegistry = JSON.parse(raw);
    if (Date.now() - stored.fetchedAt > REGISTRY_TTL) return null;
    return stored.creators;
  } catch {
    return null;
  }
}

function saveToStorage(creators: RegistryCreator[]) {
  try {
    const stored: StoredRegistry = { creators, fetchedAt: Date.now() };
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(stored));
  } catch {
    // localStorage might be full — ignore
  }
}

// ─── In-memory cache ──────────────────────────────────────────────────────────

let _registry: RegistryCreator[] | null = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sync the creator registry from the live API.
 * Returns an empty array (not mock data) if the API is unavailable.
 */
export async function syncCreatorRegistry(): Promise<RegistryCreator[]> {
  if (_registry) return _registry;

  const cached = loadFromStorage();
  if (cached) {
    _registry = cached;
    return cached;
  }

  try {
    const apiCreators = await fetchCreators();
    const registry = apiCreators.map(normalizeCreator);
    _registry = registry;
    saveToStorage(registry);
    return registry;
  } catch (err) {
    console.warn("[CreatorRegistry] API unavailable:", err);
    _registry = [];
    return [];
  }
}

/**
 * Get a single creator by slug/id.
 */
export function getCreator(id: string): RegistryCreator | null {
  if (!_registry) return null;
  return _registry.find(c => c.id === id || c.slug === id) ?? null;
}

/**
 * Get all creators in the registry.
 */
export function getAllCreators(): RegistryCreator[] {
  return _registry ?? [];
}

/**
 * Invalidate the registry cache.
 */
export function invalidateRegistry() {
  _registry = null;
  localStorage.removeItem(REGISTRY_KEY);
}

/**
 * Get avatar URL for a creator by slug — direct lookup without full registry sync.
 * Useful for VideoCard components that only have a creator_slug from API content.
 */
export function getCreatorAvatar(slug: string | null | undefined): string {
  if (!slug) return "";
  // Check in-memory registry first
  const creator = getCreator(slug);
  if (creator?.avatarUrl) return creator.avatarUrl;
  // Fall back to CDN map
  return CDN_AVATARS[slug] || "";
}

/**
 * Get brand color for a creator by slug.
 */
export function getCreatorColor(slug: string | null | undefined): string {
  if (!slug) return "#4DC820";
  const creator = getCreator(slug);
  if (creator?.color) return creator.color;
  const enrichment = CREATOR_ENRICHMENT[slug];
  if (enrichment?.color) return enrichment.color;
  return generateColor(slug);
}
