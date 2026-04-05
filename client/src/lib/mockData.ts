// CheatCode OS — Mock Data
// All data is illustrative for UI/design purposes.
// Replace with real API calls when building out the backend.

export const marketSentiment = {
  label: "Bullish",
  description: "S&P 500 holding above 50-day MA. Breadth improving. Rotation into growth.",
  type: "bullish" as const,
  date: "Monday, April 7, 2025",
};

export const todaysPicks = [
  {
    id: "v1",
    type: "video" as const,
    title: "Minervini's VCP Setup: Why AMD and NFLX Are On My Radar Right Now",
    creator: { name: "Mark Minervini", avatar: "MM", color: "#12B76A" },
    thumbnail: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=640&q=80",
    duration: "18:42",
    quickTake: "Minervini breaks down VCP patterns. Relevant this week with XLK cooling and stock-picking outperforming sector bets. AMD and NFLX both on Kai's radar with convergence scores above 75.",
    tags: ["Technical Analysis", "Swing Trading"],
    relevanceBadge: "High Relevance",
    tickers: ["AMD", "NFLX"],
    convergenceScore: 78,
    publishedAt: "2h ago",
  },
  {
    id: "v2",
    type: "video" as const,
    title: "The Private Credit Stress Signal Nobody Is Talking About",
    creator: { name: "Real Vision", avatar: "RV", color: "#2E90FA" },
    thumbnail: "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=640&q=80",
    duration: "34:15",
    quickTake: "Deep dive into private credit stress indicators. KKR and Ares Capital showing diverging signals. Part of Kai's 'Private-Credit-Stress' theme, escalating for 3 weeks.",
    tags: ["Macro", "Credit Markets"],
    relevanceBadge: "Critical",
    tickers: ["KKR", "ARCC", "BX"],
    convergenceScore: 91,
    publishedAt: "4h ago",
  },
  {
    id: "v3",
    type: "video" as const,
    title: "Options Flow Alert: Unusual Activity in Semis — What Smart Money Is Doing",
    creator: { name: "tastytrade", avatar: "TT", color: "#F79009" },
    thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=640&q=80",
    duration: "22:08",
    quickTake: "Unusual call buying in NVDA and SMCI ahead of earnings. Dark pool prints confirming institutional accumulation. Kai's Flow agent flagged this 6 hours before the video.",
    tags: ["Options", "Flow Analysis"],
    relevanceBadge: "High Relevance",
    tickers: ["NVDA", "SMCI", "AMD"],
    convergenceScore: 85,
    publishedAt: "6h ago",
  },
  {
    id: "v4",
    type: "video" as const,
    title: "Humbled Trader: My Exact Day Trading Setup for Volatile Markets",
    creator: { name: "Humbled Trader", avatar: "HT", color: "#F04438" },
    thumbnail: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=640&q=80",
    duration: "28:33",
    quickTake: "Practical day trading framework for high-volatility environments. Specific setups for TSLA and SPY. Beginner-friendly but packed with actionable levels.",
    tags: ["Day Trading", "Psychology"],
    relevanceBadge: "Watch",
    tickers: ["TSLA", "SPY"],
    convergenceScore: 62,
    publishedAt: "8h ago",
  },
  {
    id: "v5",
    type: "video" as const,
    title: "Nuclear Renaissance: The Energy Trade of the Decade — Deep Dive",
    creator: { name: "Macro Voices", avatar: "MV", color: "#7C3AED" },
    thumbnail: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=640&q=80",
    duration: "52:17",
    quickTake: "Comprehensive breakdown of the nuclear energy thesis. CCJ, NNE, and SMR all mentioned with specific price targets. Kai's 'Nuclear Renaissance' theme at escalation level 4.",
    tags: ["Macro", "Energy", "Sectors"],
    relevanceBadge: "Critical",
    tickers: ["CCJ", "NNE", "SMR", "CEG"],
    convergenceScore: 93,
    publishedAt: "Yesterday",
  },
  {
    id: "p1",
    type: "podcast" as const,
    title: "All-In E172: Tariff Shock, Rate Cuts, and the AI Infrastructure Supercycle",
    creator: { name: "All-In Podcast", avatar: "AI", color: "#101828" },
    thumbnail: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=640&q=80",
    duration: "1:24:00",
    quickTake: "Chamath, Sacks, Friedberg, and Levchin debate tariff impacts on tech supply chains. Consensus: AI infrastructure spending is immune. MSFT, GOOGL, META all mentioned as beneficiaries.",
    tags: ["Macro", "Tech", "AI"],
    relevanceBadge: "High Relevance",
    tickers: ["MSFT", "GOOGL", "META", "AMZN"],
    convergenceScore: 80,
    publishedAt: "Yesterday",
  },
];

export const topicGrid = [
  { id: "technical-analysis", label: "Technical Analysis", icon: "📈", count: 284, color: "#ECFDF3" },
  { id: "options", label: "Options", icon: "⚡", count: 156, color: "#EFF8FF" },
  { id: "swing-trading", label: "Swing Trading", icon: "🎯", count: 198, color: "#FFFAEB" },
  { id: "day-trading", label: "Day Trading", icon: "⏱️", count: 143, color: "#FEF3F2" },
  { id: "macro", label: "Macro", icon: "🌍", count: 211, color: "#F5F3FF" },
  { id: "sectors", label: "Sectors", icon: "🏭", count: 167, color: "#FFF7ED" },
  { id: "crypto", label: "Crypto", icon: "₿", count: 89, color: "#ECFDF3" },
  { id: "fundamentals", label: "Fundamentals", icon: "📊", count: 134, color: "#EFF8FF" },
  { id: "psychology", label: "Psychology", icon: "🧠", count: 76, color: "#FFFAEB" },
];

export const hotThemes = [
  { id: "nuclear-renaissance", label: "Nuclear Renaissance", status: "Escalating", level: 4, tickers: ["CCJ", "NNE", "SMR"], score: 93, color: "#F79009" },
  { id: "private-credit-stress", label: "Private Credit Stress", status: "Escalating", level: 3, tickers: ["KKR", "ARCC", "BX"], score: 88, color: "#F04438" },
  { id: "ai-infrastructure", label: "AI Infrastructure Supercycle", status: "Active", level: 5, tickers: ["NVDA", "MSFT", "GOOGL"], score: 95, color: "#12B76A" },
  { id: "rate-cut-rotation", label: "Rate Cut Rotation", status: "Watch", level: 2, tickers: ["IWM", "XLF", "TLT"], score: 67, color: "#2E90FA" },
  { id: "china-tariff-impact", label: "China Tariff Impact", status: "New", level: 1, tickers: ["AAPL", "TSLA", "NKE"], score: 71, color: "#F79009" },
];

export const radarTickers = [
  { ticker: "NVDA", score: 95, direction: "Bullish", timeframe: "Swing", confidence: "Critical", change: "+2.4%" },
  { ticker: "CCJ", score: 93, direction: "Bullish", timeframe: "Position", confidence: "Critical", change: "+1.8%" },
  { ticker: "KKR", score: 88, direction: "Bearish", timeframe: "Swing", confidence: "High", change: "-1.2%" },
  { ticker: "AMD", score: 78, direction: "Bullish", timeframe: "Swing", confidence: "High", change: "+0.9%" },
  { ticker: "NFLX", score: 75, direction: "Bullish", timeframe: "Swing", confidence: "High", change: "+1.1%" },
  { ticker: "TSLA", score: 62, direction: "Bearish", timeframe: "Day", confidence: "Watch", change: "-2.1%" },
];

export const creators = [
  { id: "minervini", name: "Mark Minervini", handle: "@minervini", specialty: "VCP Patterns, Swing Trading", videoCount: 47, avatar: "MM", color: "#12B76A", verified: true },
  { id: "real-vision", name: "Real Vision", handle: "@realvision", specialty: "Macro, Institutional", videoCount: 89, avatar: "RV", color: "#2E90FA", verified: true },
  { id: "tastytrade", name: "tastytrade", handle: "@tastytrade", specialty: "Options, Derivatives", videoCount: 134, avatar: "TT", color: "#F79009", verified: true },
  { id: "humbled-trader", name: "Humbled Trader", handle: "@humbledtrader", specialty: "Day Trading, Psychology", videoCount: 62, avatar: "HT", color: "#F04438", verified: true },
  { id: "smb-capital", name: "SMB Capital", handle: "@smbcapital", specialty: "Prop Trading, Setups", videoCount: 78, avatar: "SC", color: "#7C3AED", verified: true },
  { id: "macro-voices", name: "Macro Voices", handle: "@macrovoices", specialty: "Macro, Commodities", videoCount: 56, avatar: "MV", color: "#0EA5E9", verified: true },
];

export const learningPaths = [
  {
    id: "beginner-foundations",
    title: "Market Foundations",
    level: "Beginner",
    lessonCount: 12,
    duration: "4h 30m",
    description: "Start here. Understand how markets work, what moves prices, and the vocabulary every trader needs.",
    topics: ["How Markets Work", "Reading Charts", "Order Types", "Risk Management Basics"],
    completionRate: 0,
    free: true,
  },
  {
    id: "technical-analysis-core",
    title: "Technical Analysis Core",
    level: "Intermediate",
    lessonCount: 18,
    duration: "7h 15m",
    description: "Master the chart patterns, indicators, and setups used by professional traders.",
    topics: ["Support & Resistance", "Moving Averages", "VCP Patterns", "Volume Analysis"],
    completionRate: 0,
    free: true,
  },
  {
    id: "options-fundamentals",
    title: "Options Fundamentals",
    level: "Intermediate",
    lessonCount: 15,
    duration: "6h 00m",
    description: "Understand options from first principles — Greeks, strategies, and how pros use them.",
    topics: ["Calls & Puts", "The Greeks", "Vertical Spreads", "Iron Condors"],
    completionRate: 0,
    free: false,
  },
  {
    id: "advanced-macro",
    title: "Advanced Macro Trading",
    level: "Advanced",
    lessonCount: 20,
    duration: "9h 45m",
    description: "Trade macro themes like an institutional investor. Yield curves, regime classification, cross-asset signals.",
    topics: ["Yield Curve Analysis", "Regime Classification", "Cross-Asset Signals", "Sector Rotation"],
    completionRate: 0,
    free: false,
  },
];

export const newsletterArchive = [
  {
    id: "nl-2025-04-07",
    date: "April 7, 2025",
    subject: "Nuclear Renaissance hits Level 4 — CCJ, NNE in focus",
    sentiment: "Bullish",
    topVideos: ["Macro Voices Nuclear Deep Dive", "Minervini VCP on CCJ", "Real Vision Energy Supercycle"],
    themeChanges: ["Nuclear Renaissance: Level 3 → 4", "Private Credit Stress: Escalating"],
    previewText: "The nuclear energy thesis is accelerating. Three new congressional trades in uranium names. Kai's convergence score on CCJ hit 93 this morning...",
  },
  {
    id: "nl-2025-04-06",
    date: "April 6, 2025",
    subject: "Tariff shock creates rotation opportunity — what the smart money is doing",
    sentiment: "Choppy",
    topVideos: ["All-In E172 Tariff Breakdown", "tastytrade Options Flow Alert", "SMB Capital Setups"],
    themeChanges: ["China Tariff Impact: New theme added", "Rate Cut Rotation: Watch → Active"],
    previewText: "Friday's tariff announcement created unusual options activity across tech. Dark pool prints suggest institutional buyers stepping in at key levels...",
  },
];

export const tickerData: Record<string, {
  ticker: string;
  score: number;
  direction: "Bullish" | "Bearish" | "Neutral";
  timeframe: string;
  confidence: string;
  price: string;
  change: string;
  changePercent: string;
  evidenceChain: { source: string; signal: string; detail: string; date: string }[];
  videosMentioning: typeof todaysPicks;
  relatedTickers: string[];
  theme: string;
  catalysts: string[];
  invalidationLevel: string;
}> = {
  NVDA: {
    ticker: "NVDA",
    score: 95,
    direction: "Bullish",
    timeframe: "Swing Trade",
    confidence: "Critical",
    price: "$875.40",
    change: "+21.10",
    changePercent: "+2.47%",
    evidenceChain: [
      { source: "Flow Agent", signal: "Unusual call buying", detail: "5,000 NVDA $900 calls purchased at open. Dark pool print of $2.1M at $870.", date: "Today" },
      { source: "News Agent", signal: "Positive catalyst", detail: "TSMC reported record AI chip orders. Blackwell demand exceeding supply estimates.", date: "Today" },
      { source: "Curated Content", signal: "Expert coverage", detail: "tastytrade covered unusual options activity. Minervini flagged VCP breakout setup on weekly chart.", date: "Yesterday" },
      { source: "Earnings Agent", signal: "Beat + raise", detail: "Last quarter: Revenue beat by 8%. Data center guidance raised 15%. Margins expanding.", date: "3 weeks ago" },
      { source: "Macro Agent", signal: "Regime tailwind", detail: "AI Infrastructure Supercycle theme at Level 5. Capex spending from hyperscalers accelerating.", date: "This week" },
    ],
    videosMentioning: [todaysPicks[2]],
    relatedTickers: ["AMD", "SMCI", "AVGO", "TSM"],
    theme: "AI Infrastructure Supercycle",
    catalysts: ["Blackwell ramp", "Hyperscaler capex", "Sovereign AI demand"],
    invalidationLevel: "Close below $840 on volume",
  },
  KKR: {
    ticker: "KKR",
    score: 88,
    direction: "Bearish",
    timeframe: "Swing Trade",
    confidence: "High",
    price: "$112.30",
    change: "-1.35",
    changePercent: "-1.19%",
    evidenceChain: [
      { source: "Insider Agent", signal: "Congressional trade", detail: "Senator on Banking Committee sold $250K KKR. Cross-referenced with committee hearing schedule.", date: "2 days ago" },
      { source: "Curated Content", signal: "Expert analysis", detail: "Real Vision covered private credit stress. Minervini noted supply zone at $92 based on demand theory.", date: "Today" },
      { source: "Flow Agent", signal: "Put buying", detail: "Elevated put/call ratio. $500K in $105 puts purchased. Institutional hedging activity.", date: "Today" },
      { source: "News Agent", signal: "Theme escalation", detail: "Private Credit Stress theme escalating for 3 weeks. 15 news signals in last 48 hours.", date: "This week" },
    ],
    videosMentioning: [todaysPicks[1]],
    relatedTickers: ["ARCC", "BX", "APO", "CG"],
    theme: "Private Credit Stress",
    catalysts: ["Credit spread widening", "Congressional scrutiny", "Rate environment"],
    invalidationLevel: "Close above $120 on volume",
  },
};
