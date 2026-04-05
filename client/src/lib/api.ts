// CheatCode OS — API Client
// Fetches from FastAPI backend, falls back to mock data when backend unavailable

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
