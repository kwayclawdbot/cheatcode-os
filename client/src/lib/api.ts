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
 * Always call this before rendering API content.
 */
export function normalizeContentCard(card: ContentCard): ContentCard {
  const youtubeId = extractYoutubeId(card.external_url);
  const thumbnailUrl = getYoutubeThumbnail(youtubeId, card.thumbnail_url);
  const durationLabel = card.duration_seconds
    ? `${Math.floor(card.duration_seconds / 60)}:${String(card.duration_seconds % 60).padStart(2, "0")}`
    : "";
  const publishedLabel = card.published_at
    ? (() => {
        const diff = Date.now() - new Date(card.published_at).getTime();
        const h = Math.floor(diff / 3600000);
        const d = Math.floor(diff / 86400000);
        if (h < 1) return "Just now";
        if (h < 24) return `${h}h ago`;
        if (d === 1) return "Yesterday";
        if (d < 7) return `${d}d ago`;
        return new Date(card.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      })()
    : "";
  const relevanceLabel =
    card.relevance_score >= 0.8 ? "Critical" :
    card.relevance_score >= 0.6 ? "High Relevance" : "Watch";
  return { ...card, youtubeId, thumbnailUrl, durationLabel, publishedLabel, relevanceLabel };
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
  const qs = date ? `?date=${date}` : "";
  return apiFetch(`/intelligence/radar${qs}`);
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

export async function fetchFeed(tab = "discover", page = 1): Promise<any[]> {
  return apiFetch(`/social/feed?tab=${tab}&page=${page}`);
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
