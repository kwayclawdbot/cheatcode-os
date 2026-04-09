// CheatCode OS — API Client
// Fetches from FastAPI backend, falls back to mock data when backend unavailable

// ── YouTube ID Extraction ────────────────────────────────────────────────────

/**
 * Extracts the YouTube video ID from any YouTube URL format:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * Returns null if no valid ID found.
 */
export function extractYoutubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  // Standard watch URL: ?v=ID or &v=ID
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  // Short URL: youtu.be/ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  // Embed URL: /embed/ID or /shorts/ID
  const embedMatch = url.match(/\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  return null;
}

/**
 * Returns the best available thumbnail URL for a content card.
 * Prefers maxresdefault from YouTube, falls back to hqdefault, then thumbnail_url.
 */
export function getYoutubeThumbnail(youtubeId: string | null, fallback?: string | null): string {
  if (youtubeId) return `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
  return fallback || "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=640&q=80";
}

const API_BASE = import.meta.env.VITE_API_URL || "https://cheatcode-os-api-production.up.railway.app/api/v1";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("sb-access-token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

// ── Home ────────────────────────────────────────────────────────────────────

export interface HomeData {
  market_sentiment: string;
  sentiment_summary: string | null;
  todays_picks: ContentCard[];
  continue_learning: ContentCard[] | null;
  topics: { slug: string; label: string; icon: string }[];
  themes: { name: string; slug: string; status: string; score: number }[];
}

export async function fetchHome(): Promise<HomeData> {
  return apiFetch("/home");
}

// ── Content ─────────────────────────────────────────────────────────────────

export interface ContentCard {
  id: string;
  title: string;
  content_type: string;
  external_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  creator_name: string | null;
  creator_slug: string | null;
  quick_take: string | null;
  relevance_score: number;
  topics: string[];
  themes: string[];
  skill_level: string;
  published_at: string | null;
  curated_at: string;
  // Derived fields (populated by normalizeContentCard)
  youtubeId?: string | null;
  thumbnailUrl?: string;
  durationLabel?: string;
  publishedLabel?: string;
  relevanceLabel?: string;
}

/**
 * Normalizes a raw ContentCard from the API into a display-ready card.
 * Extracts YouTube ID, generates thumbnail URL, formats duration and date.
 * Defends against missing array fields (`topics`, `themes`) and missing
 * scalars so consumers can call `.map()` / arithmetic without null checks.
 * Always call this before rendering API content.
 */
export function normalizeContentCard(card: ContentCard): ContentCard {
  const safeCard: ContentCard = {
    ...card,
    // Filter out null/undefined entries — some legacy content rows have
    // nulls inside the topics/themes arrays which crash any downstream
    // `.map(t => t.replace(...))` consumer.
    topics: Array.isArray(card.topics)
      ? card.topics.filter((t): t is string => typeof t === "string" && t.length > 0)
      : [],
    themes: Array.isArray(card.themes)
      ? card.themes.filter((t): t is string => typeof t === "string" && t.length > 0)
      : [],
    relevance_score: typeof card.relevance_score === "number" ? card.relevance_score : 0,
    skill_level: card.skill_level || "intermediate",
  };
  const youtubeId = extractYoutubeId(safeCard.external_url);
  const thumbnailUrl = getYoutubeThumbnail(youtubeId, safeCard.thumbnail_url);
  const durationLabel = safeCard.duration_seconds
    ? `${Math.floor(safeCard.duration_seconds / 60)}:${String(safeCard.duration_seconds % 60).padStart(2, "0")}`
    : "";
  const publishedLabel = safeCard.published_at
    ? (() => {
        const diff = Date.now() - new Date(safeCard.published_at).getTime();
        const h = Math.floor(diff / 3600000);
        const d = Math.floor(diff / 86400000);
        if (h < 1) return "Just now";
        if (h < 24) return `${h}h ago`;
        if (d === 1) return "Yesterday";
        if (d < 7) return `${d}d ago`;
        return new Date(safeCard.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      })()
    : "";
  const relevanceLabel =
    safeCard.relevance_score >= 0.8 ? "Critical" :
    safeCard.relevance_score >= 0.6 ? "High Relevance" : "Watch";
  return { ...safeCard, youtubeId, thumbnailUrl, durationLabel, publishedLabel, relevanceLabel };
}

export interface ContentDetail extends ContentCard {
  description: string | null;
  key_insights: { insight: string; category: string }[] | null;
  timestamps: { seconds: number; label: string }[] | null;
  tickers: {
    ticker: string;
    mention_context: string;
    sentiment: string;
    is_primary: boolean;
    convergence_score?: number;
    convergence_direction?: string;
  }[] | null;
  related: ContentCard[] | null;
  transcript: string | null;
}

export async function fetchContent(params?: {
  content_type?: string;
  topic?: string;
  theme?: string;
  skill_level?: string;
  creator_slug?: string;
  asset_class?: string;
  ticker?: string;
  sort?: string;
  page?: number;
}): Promise<ContentCard[]> {
  const qs = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) qs.set(k, String(v));
    });
  }
  return apiFetch(`/content?${qs}`);
}

export async function fetchContentDetail(id: string): Promise<ContentDetail> {
  return apiFetch(`/content/${id}`);
}

export async function searchContent(q: string): Promise<ContentCard[]> {
  return apiFetch(`/content/search?q=${encodeURIComponent(q)}`);
}

export async function fetchContentByTicker(symbol: string): Promise<ContentCard[]> {
  return apiFetch(`/content/by-ticker/${symbol}`);
}

// ── Creators ────────────────────────────────────────────────────────────────

export interface Creator {
  id: string;
  name: string;
  slug: string;
  platform: string;
  avatar_url: string | null;
  description: string | null;
  quality_score: number;
  tags: string[];
  content_count: number;
}

export async function fetchCreators(): Promise<Creator[]> {
  return apiFetch("/content/creators");
}

export async function fetchCreatorDetail(slug: string): Promise<Creator> {
  return apiFetch(`/content/creators/${slug}`);
}

// ── Intelligence ────────────────────────────────────────────────────────────

export interface TickerData {
  symbol: string;
  name: string | null;
  convergence_score: number;
  direction: string | null;
  timeframe: string | null;
  confidence: string | null;
  last_price: number | null;
  price_change_pct: number | null;
  // Pro fields
  evidence_chain?: { source: string; signal: string; direction: string; strength: number; timestamp: string }[];
  source_count?: number;
  catalyst?: string;
  invalidation?: string;
  themes?: string[];
  related_content?: ContentCard[];
  related_tickers?: string[];
}

export interface RadarData {
  date: string;
  market_sentiment: string;
  sentiment_summary: string | null;
  critical: RadarTicker[];
  high_conviction: RadarTicker[];
  watch: RadarTicker[];
  contested: RadarTicker[];
  theme_heatmap: { name: string; status: string; score: number; tickers: string[] }[];
  sector_rotation: Record<string, unknown>;
}

export interface RadarTicker {
  symbol: string;
  name?: string;
  score: number;
  direction: string;
  timeframe?: string;
  confidence?: string;
}

export async function fetchTicker(symbol: string): Promise<TickerData> {
  return apiFetch(`/intelligence/ticker/${symbol}`);
}

export async function fetchRadar(date?: string): Promise<RadarData> {
  // If a specific date is requested, use it directly
  if (date) return apiFetch(`/intelligence/radar?date=${date}`);

  // Try today first, then walk back up to 7 days to find the most recent radar.
  // The backend now populates radar with a trending-ticker fallback whenever
  // intelligence-scored tickers are sparse, so this request returns real
  // data (mid-cap+ filtered) without any frontend transform.
  for (let daysBack = 0; daysBack <= 7; daysBack++) {
    const d = new Date(Date.now() - daysBack * 86_400_000);
    const dateStr = d.toISOString().split("T")[0];
    try {
      const result = await apiFetch<RadarData>(`/intelligence/radar?date=${dateStr}`);
      const hasData = (result.critical?.length ?? 0) + (result.high_conviction?.length ?? 0) + (result.watch?.length ?? 0) > 0;
      if (hasData) return result;
    } catch {
      // 404 or other error — try previous day
    }
  }
  // Return empty radar if nothing found in the last 7 days
  return { date: "", market_sentiment: "neutral", sentiment_summary: null, critical: [], high_conviction: [], watch: [], contested: [], theme_heatmap: [], sector_rotation: {} };
}

export async function fetchPredictions(minScore = 60): Promise<any[]> {
  return apiFetch(`/intelligence/predictions?min_score=${minScore}`);
}

export async function fetchThemes(): Promise<any[]> {
  return apiFetch("/intelligence/themes");
}

export async function fetchTheme(slug: string): Promise<any> {
  return apiFetch(`/intelligence/themes/${slug}`);
}

// ── Ticker sentiment + votes ────────────────────────────────────────────────

export interface TickerSentiment {
  symbol: string;
  score: number;          // -1..1
  label: "bullish" | "bearish" | "neutral";
  confidence: "high" | "medium" | "low";
  votes:   { bullish: number; bearish: number; total: number };
  feed:    { bullish: number; bearish: number; neutral: number };
  content: { bullish: number; bearish: number; neutral: number; mixed: number };
  brain:   { direction: string | null; score: number | null };
  sources_present: number;
}

export interface TickerVotes {
  symbol: string;
  bullish: number;
  bearish: number;
  total: number;
  bullish_pct: number;
  bearish_pct: number;
  my_vote: "bullish" | "bearish" | null;
}

export interface TickerAbout {
  symbol: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  market_cap: number | null;
  market_cap_tier: string | null;
  asset_class: string;
  description: string | null;
  website: string | null;
  country: string | null;
  employees: number | null;
}

export async function fetchTickerAbout(symbol: string): Promise<TickerAbout> {
  return apiFetch(`/intelligence/ticker/${symbol}/about`);
}

export async function fetchTickerSentiment(symbol: string): Promise<TickerSentiment> {
  return apiFetch(`/intelligence/ticker/${symbol}/sentiment`);
}

export async function fetchTickerVotes(symbol: string): Promise<TickerVotes> {
  return apiFetch(`/intelligence/ticker/${symbol}/votes`);
}

export async function castTickerVote(
  symbol: string,
  direction: "bullish" | "bearish",
): Promise<TickerVotes> {
  return apiFetch(`/intelligence/ticker/${symbol}/vote`, {
    method: "POST",
    body: JSON.stringify({ direction }),
  });
}

export async function clearTickerVote(symbol: string): Promise<TickerVotes> {
  return apiFetch(`/intelligence/ticker/${symbol}/vote`, { method: "DELETE" });
}

// ── Kai Chat ────────────────────────────────────────────────────────────────

export interface KaiChatResponse {
  conversation_id: string;
  message: { role: string; content: string; sources: any[] | null };
  remaining_messages: number | null;
}

export async function sendKaiMessage(
  message: string,
  conversationId?: string,
): Promise<KaiChatResponse> {
  return apiFetch("/kai/chat", {
    method: "POST",
    body: JSON.stringify({ message, conversation_id: conversationId }),
  });
}

export async function fetchKaiConversations(): Promise<any[]> {
  return apiFetch("/kai/conversations");
}

// ── Payments ────────────────────────────────────────────────────────────────

export async function createCheckout(tier: "pro" | "elite"): Promise<{ url: string }> {
  return apiFetch(`/payments/create-checkout?tier=${tier}`, { method: "POST" });
}

// ── Bookmarks ───────────────────────────────────────────────────────────────

export async function bookmarkContent(id: string): Promise<void> {
  await apiFetch(`/content/${id}/bookmark`, { method: "POST" });
}

export async function removeBookmark(id: string): Promise<void> {
  await apiFetch(`/content/${id}/bookmark`, { method: "DELETE" });
}

// ── Event Tracking ──────────────────────────────────────────────────────────

let eventBuffer: { event_type: string; payload: Record<string, unknown> }[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function trackEvent(eventType: string, payload: Record<string, unknown> = {}) {
  eventBuffer.push({ event_type: eventType, payload });
  if (!flushTimer) {
    flushTimer = setTimeout(flushEvents, 10000); // Flush every 10s
  }
}

async function flushEvents() {
  flushTimer = null;
  if (!eventBuffer.length) return;
  const batch = [...eventBuffer];
  eventBuffer = [];
  try {
    await apiFetch("/events/track", {
      method: "POST",
      body: JSON.stringify({ events: batch }),
    });
  } catch {
    // Re-queue on failure
    eventBuffer = [...batch, ...eventBuffer];
  }
}

// Flush on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (eventBuffer.length) {
      navigator.sendBeacon?.(
        `${API_BASE}/events/track`,
        JSON.stringify({ events: eventBuffer }),
      );
    }
  });
}

// ── Social Feed ─────────────────────────────────────────────────────────────

export async function fetchFeed(
  tab = "discover",
  page = 1,
  options?: { ticker?: string; hideAgents?: boolean },
): Promise<any[]> {
  const qs = new URLSearchParams({ tab, page: String(page) });
  if (options?.ticker) qs.set("ticker", options.ticker);
  if (options?.hideAgents) qs.set("hide_agents", "true");
  return apiFetch(`/social/feed?${qs.toString()}`);
}

export async function createPost(data: Record<string, unknown>): Promise<any> {
  return apiFetch("/social/posts", { method: "POST", body: JSON.stringify(data) });
}

export async function likePost(postId: string): Promise<void> {
  await apiFetch(`/social/posts/${postId}/like`, { method: "POST" });
}

export async function unlikePost(postId: string): Promise<void> {
  await apiFetch(`/social/posts/${postId}/like`, { method: "DELETE" });
}

export async function bookmarkPost(postId: string): Promise<void> {
  await apiFetch(`/social/posts/${postId}/bookmark`, { method: "POST" });
}

export async function repostPost(postId: string): Promise<void> {
  await apiFetch(`/social/posts/${postId}/repost`, { method: "POST" });
}

export async function fetchComments(postId: string): Promise<any[]> {
  return apiFetch(`/social/posts/${postId}/comments`);
}

export async function createComment(postId: string, body: string, parentId?: string): Promise<any> {
  return apiFetch(`/social/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body, parent_id: parentId }),
  });
}

export async function followUser(userId: string): Promise<void> {
  await apiFetch(`/social/follow/${userId}`, { method: "POST" });
}

export async function unfollowUser(userId: string): Promise<void> {
  await apiFetch(`/social/follow/${userId}`, { method: "DELETE" });
}

// ── Profile ─────────────────────────────────────────────────────────────────

export async function fetchMyProfile(): Promise<any> {
  return apiFetch("/profile/me");
}

export async function updateMyProfile(updates: Record<string, unknown>): Promise<void> {
  await apiFetch("/profile/me", { method: "PUT", body: JSON.stringify(updates) });
}

export async function completeOnboarding(data: Record<string, unknown>): Promise<void> {
  await apiFetch("/profile/onboarding", { method: "POST", body: JSON.stringify(data) });
}

export async function fetchTraderProfile(handle: string): Promise<any> {
  return apiFetch(`/profile/traders/${handle}`);
}

export async function fetchLeaderboard(sort = "xp"): Promise<any[]> {
  return apiFetch(`/profile/leaderboard?sort=${sort}`);
}

export async function fetchUserPosts(handle: string, page = 1): Promise<any[]> {
  // Fetch posts for a specific user handle
  return apiFetch<any[]>(`/social/feed?author=${handle}&page=${page}`).catch(() =>
    apiFetch<any[]>(`/social/feed?tab=discover&page=${page}`)
  );
}

// ── Journal ─────────────────────────────────────────────────────────────────

export async function fetchJournalEntries(params?: { ticker?: string; outcome?: string; page?: number }): Promise<any[]> {
  const qs = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, String(v)); });
  return apiFetch(`/journal/entries?${qs}`);
}

export async function createJournalEntry(data: Record<string, unknown>): Promise<any> {
  return apiFetch("/journal/entries", { method: "POST", body: JSON.stringify(data) });
}

export async function fetchJournalStats(): Promise<any> {
  return apiFetch("/journal/stats");
}

export async function requestKaiAnalysis(entryId: string): Promise<{ analysis: string }> {
  return apiFetch(`/journal/entries/${entryId}/kai-analysis`, { method: "POST" });
}

// ── Market Data (EODHD live) ────────────────────────────────────────────────

export interface MarketQuote {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  prev_close: number;
  change: number;
  change_pct: number;
  volume: number;
}

export interface MarketSummary {
  indices: { symbol: string; name: string; price: number; change: number; change_pct: number }[];
  gainers: MarketQuote[];
  losers: MarketQuote[];
  sentiment: string;
  timestamp: string;
}

export async function fetchMarketSummary(): Promise<MarketSummary> {
  return apiFetch("/market/summary");
}

export async function fetchQuotes(symbols?: string): Promise<MarketQuote[]> {
  const qs = symbols ? `?symbols=${symbols}` : "";
  return apiFetch(`/market/quotes${qs}`);
}

export async function fetchQuote(symbol: string): Promise<MarketQuote> {
  return apiFetch(`/market/quote/${symbol}`);
}

// Top symbols per asset class for the home dashboard. Backend /market/quotes
// uses bulk EODHD calls (~50/day total) so passing extra symbols is free.
const ASSET_CLASS_SYMBOLS: Record<"forex" | "crypto" | "index", string[]> = {
  forex:  ["EURUSD", "GBPUSD", "USDJPY", "USDCAD", "AUDUSD", "USDCHF", "NZDUSD"],
  crypto: ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "AVAX", "DOGE", "LINK", "MATIC"],
  index:  ["SPY", "QQQ", "DIA", "IWM", "VIX"],
};

export async function fetchAssetClassQuotes(
  assetClass: "forex" | "crypto" | "index",
): Promise<MarketQuote[]> {
  const symbols = ASSET_CLASS_SYMBOLS[assetClass];
  return fetchQuotes(symbols.join(","));
}

export async function fetchTrendingTickers(
  assetClass?: string,
  limit = 20,
): Promise<{ asset_class: string; count: number; tickers: any[] }> {
  const params = new URLSearchParams();
  if (assetClass) params.set("asset_class", assetClass);
  params.set("limit", String(limit));
  return apiFetch(`/market/trending?${params}`);
}

// ── Watchlist (lives on profiles.watchlist via /profile/me) ─────────────────

export async function fetchWatchlist(): Promise<string[]> {
  const profile = await fetchMyProfile();
  return Array.isArray(profile?.watchlist) ? profile.watchlist : [];
}

export async function addToWatchlist(symbol: string): Promise<string[]> {
  const current = await fetchWatchlist();
  const upper = symbol.toUpperCase();
  if (current.includes(upper)) return current;
  const next = [...current, upper];
  await updateMyProfile({ watchlist: next });
  return next;
}

export async function removeFromWatchlist(symbol: string): Promise<string[]> {
  const current = await fetchWatchlist();
  const upper = symbol.toUpperCase();
  const next = current.filter((s) => s !== upper);
  await updateMyProfile({ watchlist: next });
  return next;
}

// ── CheatCode Chart ─────────────────────────────────────────────────────────

export async function fetchChartData(
  symbol: string,
  sensitivity = "medium",
  period = "d",
  limit = 200,
  colors = "heatmap",
): Promise<any> {
  return apiFetch(`/chart/${symbol}?sensitivity=${sensitivity}&period=${period}&limit=${limit}&colors=${colors}`);
}
