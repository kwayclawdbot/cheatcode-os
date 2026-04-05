// CheatCode OS — Coaches Data
// Shared data source for CoachesCornerPage and CoachProfilePage
// All coach profiles, products, curriculum, reviews

export interface CoachProduct {
  id: string;
  type: "course" | "1on1" | "community" | "alerts";
  title: string;
  tagline: string;
  price: number;
  originalPrice?: number;
  students?: number;
  duration?: string;
  lessonCount?: number;
  rating: number;
  reviews: number;
  description: string;
  longDescription: string;
  whatYouLearn: string[];
  curriculum?: { section: string; lessons: string[] }[];
  includes: string[];
  level: "Beginner" | "Intermediate" | "Advanced";
  badge?: string;
}

export interface CoachReview {
  id: string;
  author: string;
  initials: string;
  rating: number;
  date: string;
  product: string;
  text: string;
}

export interface Coach {
  id: string;
  name: string;
  handle: string;
  initials: string;
  avatarColor: string;
  avatarUrl?: string;
  specialty: string[];
  style: string;
  tagline: string;
  bio: string;
  longBio: string;
  rating: number;
  reviews: number;
  students: number;
  experience: string;
  verified: boolean;
  featured: boolean;
  products: CoachProduct[];
  tags: string[];
  youtubeUrl?: string;
  twitterUrl?: string;
  topTickers: string[];
  achievements: string[];
  reviews_list: CoachReview[];
}

export const COACHES: Coach[] = [
  {
    id: "james-okafor",
    name: "James Okafor",
    handle: "@jamesokafor",
    initials: "JO",
    avatarColor: "linear-gradient(135deg, #4DC820, #C8D400)",
    specialty: ["Day Trading", "Options Flow", "Momentum"],
    style: "Day Trading",
    tagline: "Momentum day trader. Former SMB Capital prop trader. 8+ years.",
    bio: "Prop trader with 8+ years experience. Former SMB Capital trader. Specializing in momentum setups and options flow.",
    longBio: "James Okafor spent 5 years as a prop trader at SMB Capital before going independent. He now runs a full-time trading education business focused on momentum day trading and options flow analysis. His students have gone on to trade professionally at prop firms across the US. James is known for his no-nonsense approach — he teaches exactly what he trades, with live examples from his own brokerage account.",
    rating: 4.9,
    reviews: 284,
    students: 445,
    experience: "8+ years",
    verified: true,
    featured: true,
    tags: ["Momentum", "Options", "Prop Trading", "Day Trading", "SMB Capital"],
    topTickers: ["NVDA", "AMD", "TSLA", "SPY"],
    achievements: ["Former SMB Capital Prop Trader", "445+ Students Taught", "4.9★ Average Rating", "Top Coach 2025"],
    youtubeUrl: "https://youtube.com",
    twitterUrl: "https://twitter.com",
    products: [
      {
        id: "momentum-masterclass",
        type: "course",
        title: "Momentum Day Trading Masterclass",
        tagline: "The complete system for trading momentum stocks profitably",
        price: 197,
        originalPrice: 297,
        students: 84,
        duration: "12h 30m",
        lessonCount: 42,
        rating: 4.9,
        reviews: 156,
        level: "Intermediate",
        badge: "Best Seller",
        description: "Complete A-to-Z system for momentum day trading. From scanner setup to execution to risk management.",
        longDescription: "This is the exact system James uses every single day to trade momentum stocks. You'll learn how to build a pre-market routine, identify the highest-probability setups before the open, execute with precision, and manage risk like a professional. No theory — just the real playbook.",
        whatYouLearn: [
          "Build a pre-market routine that identifies the top 3 stocks to watch every day",
          "Read Level 2 and time & sales to time your entries with precision",
          "Use options flow to confirm momentum before entering a position",
          "Size positions correctly based on your account and risk tolerance",
          "Manage open positions in real time — when to add, when to cut",
          "Build a trading journal that actually improves your performance",
        ],
        curriculum: [
          { section: "Module 1: The Momentum Framework", lessons: ["What is momentum trading?", "The pre-market routine", "Scanner setup (TC2000 & Finviz)", "Reading the market open"] },
          { section: "Module 2: Entry Patterns", lessons: ["The breakout setup", "The VWAP reclaim", "The first pullback", "Gap & go strategy"] },
          { section: "Module 3: Options Flow", lessons: ["Reading the options tape", "Unusual activity signals", "Dark pool prints", "Flow vs. price divergence"] },
          { section: "Module 4: Risk & Execution", lessons: ["Position sizing formula", "Stop loss placement", "Scaling in and out", "End-of-day review process"] },
        ],
        includes: ["42 video lessons", "Downloadable scanner templates", "Private Discord access", "Live Q&A replays", "Lifetime access"],
      },
      {
        id: "1on1-coaching",
        type: "1on1",
        title: "1-on-1 Coaching Session (60 min)",
        tagline: "Bring your charts. Get direct feedback from a prop trader.",
        price: 149,
        rating: 5.0,
        reviews: 62,
        level: "Intermediate",
        description: "60-minute live coaching call. Bring your charts, your questions, and your trade journal.",
        longDescription: "This is a private 60-minute Zoom session with James. Come prepared with your recent trades, your biggest questions, and your charts. James will review your setups, identify patterns in your mistakes, and give you a specific action plan to improve. Sessions are recorded and sent to you afterward.",
        whatYouLearn: [
          "Personalized feedback on your specific trading setups",
          "Identification of recurring mistakes in your trade journal",
          "A specific 30-day improvement plan tailored to your style",
          "Direct access to James's scanner and watchlist methodology",
        ],
        includes: ["60-minute Zoom session", "Session recording", "Follow-up email with action plan", "One-week email support after session"],
      },
      {
        id: "elite-circle",
        type: "community",
        title: "Elite Traders Inner Circle",
        tagline: "Daily watchlists, live alerts, and weekly group coaching",
        price: 49,
        students: 127,
        rating: 4.8,
        reviews: 66,
        level: "Intermediate",
        description: "Private Discord with daily watchlists, live trade alerts, and weekly group coaching calls.",
        longDescription: "The Inner Circle is James's private community for serious traders. Every morning before the open, James posts his top 3 watchlist stocks with entry levels, targets, and stops. During market hours, he sends real-time alerts when he's entering or exiting positions. Every Sunday evening, there's a live group coaching call reviewing the week's trades.",
        whatYouLearn: [
          "Daily pre-market watchlist with specific levels",
          "Real-time trade alerts during market hours",
          "Weekly group coaching call (Sundays 7pm ET)",
          "Access to the full trade alert archive",
        ],
        includes: ["Private Discord server", "Daily watchlist posts", "Real-time trade alerts", "Weekly group call", "Monthly performance review"],
      },
    ],
    reviews_list: [
      { id: "r1", author: "Marcus Williams", initials: "MW", rating: 5, date: "Mar 28, 2026", product: "Momentum Day Trading Masterclass", text: "James's course completely changed how I approach the open. The pre-market routine alone was worth 10x the price. I went from losing $200/day to consistently making $300-500 on good days within 6 weeks." },
      { id: "r2", author: "Sarah Chen", initials: "SC", rating: 5, date: "Mar 15, 2026", product: "1-on-1 Coaching Session", text: "Best investment I've made in my trading career. James identified a pattern in my trades I never noticed — I was always entering too early on breakouts. One session saved me months of losses." },
      { id: "r3", author: "Tyler Ross", initials: "TR", rating: 5, date: "Feb 20, 2026", product: "Elite Traders Inner Circle", text: "The daily watchlist is incredibly accurate. James called NVDA's breakout two days before it happened. The community is also really supportive — no toxic energy, just serious traders." },
    ],
  },
  {
    id: "carlos-rivera",
    name: "Carlos Rivera",
    handle: "@carlosrivera",
    initials: "CR",
    avatarColor: "linear-gradient(135deg, #7B2FBE, #00AEEF)",
    specialty: ["Crypto", "Macro", "On-Chain Analysis"],
    style: "Position Trading",
    tagline: "Macro & crypto analyst. Former institutional research. 45K followers.",
    bio: "Macro and crypto analyst with 45K Twitter followers. Former institutional research analyst covering digital assets.",
    longBio: "Carlos Rivera spent 6 years as a digital assets research analyst at a multi-billion dollar family office before building his independent research platform. He covers the intersection of macro economics and crypto markets, with a focus on on-chain data and institutional flow. His macro framework has helped hundreds of traders navigate the 2022 bear market and the 2024 bull run.",
    rating: 4.8,
    reviews: 198,
    students: 312,
    experience: "6+ years",
    verified: true,
    featured: false,
    tags: ["Crypto", "Macro", "On-Chain", "Bitcoin", "DeFi", "Institutional"],
    topTickers: ["BTC", "ETH", "SOL", "MSTR"],
    achievements: ["Former Family Office Analyst", "45K Twitter Followers", "312+ Students", "Called 2024 BTC Bottom"],
    products: [
      {
        id: "crypto-macro",
        type: "course",
        title: "Crypto Macro Framework",
        tagline: "Analyze crypto markets through the lens of macro economics",
        price: 147,
        students: 203,
        duration: "8h 45m",
        lessonCount: 34,
        rating: 4.8,
        reviews: 134,
        level: "Intermediate",
        badge: "Top Rated",
        description: "Learn to analyze crypto markets through a macro lens. Interest rates, dollar cycles, and institutional positioning.",
        longDescription: "Most crypto traders are flying blind on macro. This course teaches you the exact framework Carlos uses to position for major crypto moves weeks before they happen — using interest rate cycles, dollar strength, and on-chain data to build a high-conviction thesis.",
        whatYouLearn: [
          "Understand how interest rate cycles drive crypto bull and bear markets",
          "Read on-chain metrics like MVRV, NVT, and exchange flows",
          "Track institutional positioning through CME futures and ETF flows",
          "Build a macro thesis and translate it into specific trade ideas",
          "Identify cycle tops and bottoms using a multi-factor model",
        ],
        curriculum: [
          { section: "Module 1: Macro Foundations", lessons: ["The dollar cycle and crypto", "Interest rates 101 for crypto traders", "Risk-on / risk-off framework", "Reading the Fed"] },
          { section: "Module 2: On-Chain Analysis", lessons: ["MVRV ratio explained", "Exchange inflows & outflows", "Long-term holder behavior", "Miner capitulation signals"] },
          { section: "Module 3: Institutional Flow", lessons: ["CME futures basis", "ETF flow analysis", "Grayscale premium/discount", "Options market structure"] },
        ],
        includes: ["34 video lessons", "On-chain dashboard templates", "Weekly macro update emails", "Private Telegram group", "Lifetime access"],
      },
      {
        id: "crypto-alerts",
        type: "alerts",
        title: "Crypto Intelligence Alerts",
        tagline: "Daily on-chain signals and macro-driven trade setups",
        price: 29,
        students: 109,
        rating: 4.7,
        reviews: 64,
        level: "Beginner",
        description: "Daily on-chain alerts, macro signals, and high-conviction trade setups delivered to your inbox.",
        longDescription: "Every morning, Carlos sends a concise briefing covering: (1) overnight macro developments, (2) key on-chain metrics that moved, and (3) 1-2 specific trade setups with entry, target, and stop. Clean, actionable, no noise.",
        whatYouLearn: [
          "Daily macro briefing before the US open",
          "On-chain metric alerts when key thresholds are crossed",
          "1-2 specific trade setups per week with full thesis",
          "Monthly portfolio positioning review",
        ],
        includes: ["Daily email briefing", "Telegram alert channel", "Weekly video update", "Trade setup archive"],
      },
    ],
    reviews_list: [
      { id: "r4", author: "Kevin Zhang", initials: "KZ", rating: 5, date: "Mar 10, 2026", product: "Crypto Macro Framework", text: "Carlos's framework is the most rigorous crypto education I've found. He doesn't just teach you to chase price — he teaches you to understand WHY price moves. Completely changed my approach." },
      { id: "r5", author: "Amanda Flores", initials: "AF", rating: 5, date: "Feb 28, 2026", product: "Crypto Intelligence Alerts", text: "The daily briefings are incredibly concise and actionable. Carlos called the BTC pullback in January 2026 three days early based on exchange inflow data. Worth every penny." },
    ],
  },
  {
    id: "jordan-mills",
    name: "Jordan Mills",
    handle: "@jordanmills",
    initials: "JM",
    avatarColor: "linear-gradient(135deg, #F79009, #E8193C)",
    specialty: ["Options Flow", "Day Trading", "Unusual Activity"],
    style: "Day Trading",
    tagline: "7-year prop trader. Options flow specialist. 12K YouTube subscribers.",
    bio: "7-year prop trader turned educator. Known for reading unusual options activity before big moves.",
    longBio: "Jordan Mills spent 7 years trading at a proprietary options firm in Chicago before launching his education platform. He's known for his ability to read unusual options activity and dark pool prints to front-run institutional moves. His YouTube channel has 12K subscribers and his options flow alerts have called some of the biggest single-day moves of the past two years.",
    rating: 4.7,
    reviews: 142,
    students: 287,
    experience: "7+ years",
    verified: true,
    featured: false,
    tags: ["Options Flow", "Dark Pool", "Unusual Activity", "Day Trading", "Prop Trading"],
    topTickers: ["SPY", "QQQ", "NVDA", "AAPL"],
    achievements: ["7 Years Prop Trading", "287+ Students", "12K YouTube Subscribers", "Options Flow Specialist"],
    products: [
      {
        id: "options-flow",
        type: "course",
        title: "Options Flow Mastery",
        tagline: "Read the tape like the institutions do",
        price: 127,
        students: 178,
        duration: "9h 15m",
        lessonCount: 38,
        rating: 4.7,
        reviews: 98,
        level: "Intermediate",
        description: "Learn to read options flow, dark pool prints, and unusual activity to identify institutional positioning.",
        longDescription: "The options market is where the smart money moves first. This course teaches you to read the tape like a prop trader — identifying unusual activity, dark pool prints, and sweep orders that signal where institutions are positioning before the move happens in the stock.",
        whatYouLearn: [
          "Understand the options market microstructure and how flow works",
          "Identify unusual options activity and what it signals",
          "Read dark pool prints and block trades on Time & Sales",
          "Use sweep orders to identify directional institutional bets",
          "Build a real-time flow monitoring setup using free and paid tools",
          "Filter signal from noise — not all unusual activity is actionable",
        ],
        curriculum: [
          { section: "Module 1: Options Market Structure", lessons: ["How options flow works", "Market makers and their role", "The options chain explained", "Greeks for flow traders"] },
          { section: "Module 2: Reading Unusual Activity", lessons: ["What counts as unusual", "Sweep vs. split orders", "OTM vs. ITM activity", "Timing the signal"] },
          { section: "Module 3: Dark Pool Prints", lessons: ["What dark pools are", "Reading block trades", "Dark pool vs. lit market divergence", "Case studies: NVDA, AAPL, SPY"] },
        ],
        includes: ["38 video lessons", "Flow scanner setup guide", "Case study library (50+ trades)", "Private Discord", "Lifetime access"],
      },
      {
        id: "flow-session",
        type: "1on1",
        title: "Flow Analysis Session (45 min)",
        tagline: "Build your personal options flow monitoring system",
        price: 99,
        rating: 4.9,
        reviews: 44,
        level: "Intermediate",
        description: "45-minute session focused on reading the options tape and building your flow-based trading system.",
        longDescription: "In this 45-minute session, Jordan will walk through your current setup, help you configure your flow scanner, and review 2-3 recent flow signals you've identified. You'll leave with a clear system for monitoring and acting on options flow.",
        whatYouLearn: [
          "Personalized flow scanner configuration",
          "Review of your recent flow signal reads",
          "A specific watchlist of tickers to monitor for flow",
          "Recommended tools and data sources for your budget",
        ],
        includes: ["45-minute Zoom session", "Session recording", "Personalized scanner config file", "Follow-up email"],
      },
    ],
    reviews_list: [
      { id: "r6", author: "Priya Patel", initials: "PP", rating: 5, date: "Mar 5, 2026", product: "Options Flow Mastery", text: "Jordan's course is the best resource on options flow I've found anywhere. He explains the microstructure in a way that actually makes sense, and the case studies are incredibly detailed." },
      { id: "r7", author: "Derek Johnson", initials: "DJ", rating: 4, date: "Feb 15, 2026", product: "Flow Analysis Session", text: "Really valuable session. Jordan helped me set up my scanner correctly and identified that I was confusing split orders with sweeps — a mistake that was causing me to chase bad signals." },
    ],
  },
  {
    id: "nia-thompson",
    name: "Nia Thompson",
    handle: "@niathompson",
    initials: "NT",
    avatarColor: "linear-gradient(135deg, #2E90FA, #7B2FBE)",
    specialty: ["Swing Trading", "VCP", "Fundamental + Technical"],
    style: "Swing Trading",
    tagline: "Former hedge fund analyst. Swing trader. Minervini-style VCP setups.",
    bio: "Former hedge fund analyst turned swing trader. Combines fundamental research with Minervini-style VCP setups.",
    longBio: "Nia Thompson spent 5 years as an equity research analyst at a long/short hedge fund before transitioning to independent swing trading. She combines deep fundamental research with technical VCP setups to find high-conviction multi-week trades. Her approach bridges the gap between institutional fundamental analysis and retail technical trading.",
    rating: 4.8,
    reviews: 89,
    students: 156,
    experience: "5+ years",
    verified: true,
    featured: false,
    tags: ["Swing Trading", "VCP", "Fundamental Analysis", "Growth Stocks", "Hedge Fund"],
    topTickers: ["NVDA", "META", "GOOGL", "SMCI"],
    achievements: ["Former Hedge Fund Analyst", "156+ Students", "VCP Specialist", "4.8★ Average Rating"],
    products: [
      {
        id: "fundamental-technical",
        type: "course",
        title: "Fundamental + Technical Swing Trading",
        tagline: "Combine earnings quality with VCP setups for high-conviction trades",
        price: 167,
        students: 89,
        duration: "10h 00m",
        lessonCount: 40,
        rating: 4.8,
        reviews: 67,
        level: "Advanced",
        description: "Combine earnings quality analysis with VCP chart setups to find the highest-conviction swing trades.",
        longDescription: "Most traders are either pure technicians or pure fundamentalists. Nia teaches you to be both. You'll learn how to screen for earnings quality, identify the stocks with the strongest fundamental tailwinds, and then wait for the perfect VCP technical setup before entering. The result: fewer trades, higher conviction, better outcomes.",
        whatYouLearn: [
          "Screen for earnings quality using revenue growth, margin expansion, and EPS acceleration",
          "Identify the VCP (Volatility Contraction Pattern) on a daily and weekly chart",
          "Time your entry on the breakout from the VCP pivot point",
          "Size positions using the Minervini position sizing formula",
          "Build a watchlist of 10-15 high-conviction candidates at all times",
          "Manage multi-week swing trades through earnings and market volatility",
        ],
        curriculum: [
          { section: "Module 1: Fundamental Screening", lessons: ["What makes a great growth stock", "EPS and revenue acceleration", "Margin expansion signals", "Institutional ownership trends"] },
          { section: "Module 2: The VCP Pattern", lessons: ["VCP anatomy explained", "Identifying contractions", "Volume dry-up signals", "The pivot point entry"] },
          { section: "Module 3: Trade Management", lessons: ["Position sizing for swing trades", "Stop placement below the pivot", "Adding to winners", "Selling into strength"] },
        ],
        includes: ["40 video lessons", "Fundamental screening template (Excel)", "VCP pattern recognition guide", "Private community access", "Lifetime access"],
      },
      {
        id: "swing-circle",
        type: "community",
        title: "Swing Trader's Circle",
        tagline: "Weekly watchlist, trade alerts, and Sunday group analysis",
        price: 39,
        students: 67,
        rating: 4.7,
        reviews: 22,
        level: "Intermediate",
        description: "Weekly watchlist, trade alerts, and group analysis calls every Sunday evening.",
        longDescription: "Every Sunday evening, Nia hosts a live group analysis call reviewing the week's market action and presenting her top 5 swing trade candidates for the coming week. Members also get access to her fundamental screening results and VCP watchlist updates throughout the week.",
        whatYouLearn: [
          "Weekly top 5 swing trade candidates with full thesis",
          "Sunday evening live group call (7pm ET)",
          "Fundamental screening results shared weekly",
          "Real-time alerts when Nia enters or exits positions",
        ],
        includes: ["Private Discord server", "Weekly watchlist", "Sunday group call", "Real-time trade alerts", "Monthly performance review"],
      },
    ],
    reviews_list: [
      { id: "r8", author: "Lisa Park", initials: "LP", rating: 5, date: "Mar 20, 2026", product: "Fundamental + Technical Swing Trading", text: "Nia's course is exceptional. The combination of fundamental screening and VCP setups is incredibly powerful. I've been swing trading for 3 years and this completely elevated my game." },
      { id: "r9", author: "Michael Torres", initials: "MT", rating: 5, date: "Mar 1, 2026", product: "Swing Trader's Circle", text: "The Sunday calls are worth the subscription alone. Nia is incredibly thorough in her analysis and always explains the 'why' behind each trade candidate. Highly recommend." },
    ],
  },
];

export function getCoachById(id: string): Coach | undefined {
  return COACHES.find(c => c.id === id);
}

export const PRODUCT_TYPE_CONFIG: Record<string, { icon: string; label: string; color: string; bg: string; border: string }> = {
  course:    { icon: "📚", label: "Course", color: "#005F8A", bg: "#E8F8FF", border: "#7FDBF8" },
  "1on1":    { icon: "🎯", label: "1-on-1", color: "#5B1FA0", bg: "#F5EEFF", border: "#C4A0F0" },
  community: { icon: "👥", label: "Community", color: "#7A6800", bg: "#FAFDE8", border: "#E8F08A" },
  alerts:    { icon: "⚡", label: "Alerts", color: "#A8001F", bg: "#FFF0F3", border: "#F8A3B1" },
};
