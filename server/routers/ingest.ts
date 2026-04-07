/**
 * Ingest Router — YouTube video ingestion pipeline
 *
 * Flow:
 * 1. Accept a YouTube URL or video ID
 * 2. Fetch video metadata from YouTube Data API v3
 * 3. Run LLM quality filter (is this genuine trading education?)
 * 4. Extract tickers, generate tags, topics, pill badges
 * 5. Submit enriched content to Railway API
 *
 * All endpoints are admin-only (protectedProcedure + tier check).
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { ENV } from "../_core/env";
import { TRPCError } from "@trpc/server";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractVideoId(urlOrId: string): string | null {
  const s = urlOrId.trim();
  // Plain video ID (11 chars, alphanumeric + - _)
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  // YouTube URL patterns
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pat of patterns) {
    const m = s.match(pat);
    if (m) return m[1];
  }
  return null;
}

function parseIsoDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const [, h, min, sec] = m.map(v => parseInt(v || "0", 10));
  return h * 3600 + min * 60 + sec;
}

// ─── YouTube API ──────────────────────────────────────────────────────────────

async function fetchYouTubeVideo(videoId: string) {
  const key = ENV.youtubeApiKey;
  if (!key) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "YOUTUBE_API_KEY not configured" });

  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${key}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new TRPCError({ code: "BAD_REQUEST", message: `YouTube API error: ${resp.status}` });

  const data = await resp.json();
  const item = data.items?.[0];
  if (!item) throw new TRPCError({ code: "NOT_FOUND", message: `Video ${videoId} not found` });

  const snippet = item.snippet;
  const details = item.contentDetails;
  const stats = item.statistics;

  return {
    videoId,
    title: snippet.title,
    description: snippet.description,
    channelId: snippet.channelId,
    channelTitle: snippet.channelTitle,
    publishedAt: snippet.publishedAt,
    thumbnailUrl:
      snippet.thumbnails?.maxres?.url ||
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      "",
    durationSeconds: parseIsoDuration(details?.duration ?? ""),
    viewCount: parseInt(stats?.viewCount ?? "0", 10),
    likeCount: parseInt(stats?.likeCount ?? "0", 10),
    tags: snippet.tags ?? [],
    categoryId: snippet.categoryId,
    defaultLanguage: snippet.defaultLanguage ?? snippet.defaultAudioLanguage ?? "en",
  };
}

// ─── Quality Filter ───────────────────────────────────────────────────────────

interface QualityResult {
  passes: boolean;
  score: number; // 0-100
  reason: string;
  contentType: "trading_education" | "market_analysis" | "trade_review" | "interview" | "news" | "other";
  skillLevel: "beginner" | "intermediate" | "advanced";
  topics: string[];
  tickers: Array<{ symbol: string; sentiment: "bullish" | "bearish" | "neutral"; context: string; isPrimary: boolean }>;
  quickTake: string;
  keyInsights: Array<{ insight: string; category: string }>;
  pillBadges: string[];
  tags: string[];
}

async function runQualityFilter(video: {
  title: string;
  description: string;
  channelTitle: string;
  durationSeconds: number;
  viewCount: number;
  tags: string[];
}): Promise<QualityResult> {
  const prompt = `You are a content curator for CheatCode OS, a premium trading education platform.

Analyze this YouTube video and determine if it qualifies for ingestion.

Video Details:
- Title: ${video.title}
- Channel: ${video.channelTitle}
- Duration: ${Math.round(video.durationSeconds / 60)} minutes
- Views: ${video.viewCount.toLocaleString()}
- YouTube Tags: ${video.tags.slice(0, 20).join(", ")}
- Description (first 800 chars): ${video.description.slice(0, 800)}

QUALITY CRITERIA (must meet ALL to pass):
1. Content is directly about trading, investing, or financial markets
2. Duration is at least 5 minutes (educational depth)
3. Not a vlog, lifestyle, or personal finance generic content
4. Not clickbait (e.g., "I made $1M in 1 day" without substance)
5. Has actionable trading insights, analysis, or education
6. Not a random channel video unrelated to trading (e.g., a trader's gaming video)

Return a JSON object with these exact keys:
{
  "passes": boolean,
  "score": number (0-100, where 70+ = publish, 85+ = feature),
  "reason": "brief explanation of pass/fail decision",
  "contentType": "trading_education" | "market_analysis" | "trade_review" | "interview" | "news" | "other",
  "skillLevel": "beginner" | "intermediate" | "advanced",
  "topics": array of strings from: ["technical_analysis", "options", "swing_trading", "day_trading", "macro", "sectors", "crypto", "fundamentals", "psychology", "earnings", "etfs", "risk_management", "market_structure", "tape_reading", "order_flow", "futures", "forex", "position_sizing", "portfolio_management"],
  "tickers": array of { "symbol": "AAPL", "sentiment": "bullish"|"bearish"|"neutral", "context": "brief context", "isPrimary": boolean },
  "quickTake": "3-4 sentences: what this video covers and why it matters NOW. Be specific and actionable.",
  "keyInsights": array of { "insight": "actionable takeaway", "category": "strategy|analysis|risk|opportunity|education" },
  "pillBadges": array of display badges (e.g., ["Options Flow", "Breakout Setup", "Earnings Play", "Risk Management"]),
  "tags": array of searchable tags (lowercase, hyphenated, e.g., ["vcp-pattern", "momentum-trading", "nvda"])
}

Return ONLY valid JSON, no markdown fences.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a trading content quality curator. Return only valid JSON." },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "quality_result",
        strict: false,
        schema: {
          type: "object",
          properties: {
            passes: { type: "boolean" },
            score: { type: "number" },
            reason: { type: "string" },
            contentType: { type: "string" },
            skillLevel: { type: "string" },
            topics: { type: "array", items: { type: "string" } },
            tickers: { type: "array" },
            quickTake: { type: "string" },
            keyInsights: { type: "array" },
            pillBadges: { type: "array", items: { type: "string" } },
            tags: { type: "array", items: { type: "string" } },
          },
          required: ["passes", "score", "reason"],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent = response.choices?.[0]?.message?.content;
  if (!rawContent) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LLM returned empty response" });
  const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);

  try {
    let text = content;
    if (text.startsWith("```")) {
      text = text.split("\n").slice(1).join("\n").split("```")[0] ?? text;
    }
    return JSON.parse(text) as QualityResult;
  } catch {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse LLM quality response" });
  }
}

// ─── Railway API proxy ────────────────────────────────────────────────────────

async function railwayPost(path: string, body: unknown, supabaseToken: string) {
  const url = `${ENV.railwayApiUrl}${path}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new TRPCError({
      code: resp.status === 403 ? "FORBIDDEN" : "INTERNAL_SERVER_ERROR",
      message: `Railway API error ${resp.status}: ${text.slice(0, 200)}`,
    });
  }
  return resp.json();
}

async function railwayGet(path: string, supabaseToken: string) {
  const url = `${ENV.railwayApiUrl}${path}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${supabaseToken}` },
  });
  if (!resp.ok) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Railway API error ${resp.status}` });
  }
  return resp.json();
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const ingestRouter = router({
  /**
   * Analyse a YouTube URL/ID — runs quality filter and returns enriched metadata
   * without submitting to Railway. Use this for preview before submitting.
   */
  analyseVideo: protectedProcedure
    .input(z.object({ urlOrId: z.string().min(1).max(200) }))
    .mutation(async ({ input }) => {
      const videoId = extractVideoId(input.urlOrId);
      if (!videoId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid YouTube URL or video ID" });
      }

      const video = await fetchYouTubeVideo(videoId);

      // Skip shorts (under 3 min)
      if (video.durationSeconds > 0 && video.durationSeconds < 180) {
        return {
          videoId,
          video,
          quality: null,
          skipped: true,
          skipReason: "Video is under 3 minutes (likely a Short)",
        };
      }

      const quality = await runQualityFilter(video);

      return { videoId, video, quality, skipped: false, skipReason: null };
    }),

  /**
   * Submit a YouTube video to the Railway ingestion pipeline.
   * Requires the user to have tier = "admin" in Supabase profiles.
   */
  submitVideo: protectedProcedure
    .input(
      z.object({
        urlOrId: z.string().min(1).max(200),
        /** Supabase access token to forward to Railway admin endpoint */
        supabaseToken: z.string().min(10),
        /** Override quality filter — force ingest even if score is low */
        forceIngest: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const videoId = extractVideoId(input.urlOrId);
      if (!videoId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid YouTube URL or video ID" });
      }

      // 1. Fetch YouTube metadata
      const video = await fetchYouTubeVideo(videoId);

      // 2. Quality filter
      const quality = await runQualityFilter(video);

      if (!quality.passes && !input.forceIngest) {
        return {
          success: false,
          videoId,
          video,
          quality,
          message: `Video did not pass quality filter (score: ${quality.score}/100). Reason: ${quality.reason}`,
        };
      }

      // 3. Submit to Railway — POST /admin/video/submit
      // The Railway backend will handle transcript extraction, embedding, and Supabase storage
      const payload = {
        video_id: videoId,
        title: video.title,
        description: video.description,
        channel_id: video.channelId,
        channel_title: video.channelTitle,
        published_at: video.publishedAt,
        thumbnail_url: video.thumbnailUrl,
        duration_seconds: video.durationSeconds,
        view_count: video.viewCount,
        like_count: video.likeCount,
        // Pre-computed enrichment from our LLM pass
        quick_take: quality.quickTake,
        key_insights: quality.keyInsights,
        topics: quality.topics,
        skill_level: quality.skillLevel,
        tickers_mentioned: quality.tickers,
        pill_badges: quality.pillBadges,
        tags: [...(quality.tags ?? []), ...(video.tags?.slice(0, 10) ?? [])],
        relevance_score: quality.score / 100,
        is_published: quality.score >= 60,
        is_featured: quality.score >= 85,
        content_type: quality.contentType,
        source_platform: "youtube",
        external_url: `https://www.youtube.com/watch?v=${videoId}`,
      };

      try {
        const result = await railwayPost("/admin/video/submit", payload, input.supabaseToken);
        return { success: true, videoId, video, quality, result };
      } catch (err) {
        // If Railway doesn't have /admin/video/submit yet, fall back to curation queue
        if (err instanceof TRPCError && err.message.includes("404")) {
          const queueResult = await railwayPost(
            "/admin/queue/submit",
            { external_id: videoId, source_platform: "youtube", metadata: payload },
            input.supabaseToken
          );
          return { success: true, videoId, video, quality, result: queueResult, queued: true };
        }
        throw err;
      }
    }),

  /**
   * Trigger a full curation cycle on Railway (scans all active creators)
   */
  triggerCuration: protectedProcedure
    .input(z.object({ supabaseToken: z.string().min(10) }))
    .mutation(async ({ input }) => {
      return railwayPost("/admin/curation/run", {}, input.supabaseToken);
    }),

  /**
   * Trigger ingestion of all pending curated content on Railway
   */
  triggerIngestion: protectedProcedure
    .input(z.object({ supabaseToken: z.string().min(10) }))
    .mutation(async ({ input }) => {
      return railwayPost("/admin/ingest/run", {}, input.supabaseToken);
    }),

  /**
   * Get the curation queue from Railway
   */
  getQueue: protectedProcedure
    .input(z.object({ supabaseToken: z.string().min(10), status: z.string().default("pending") }))
    .query(async ({ input }) => {
      return railwayGet(`/admin/queue?status=${input.status}`, input.supabaseToken);
    }),

  /**
   * Get enrichment data for a video — fetches from Railway and fills in missing
   * LLM-generated fields (quick_take, key_insights, tickers, tags) on-demand.
   * Public endpoint — no auth required.
   */
  getVideoEnrichment: publicProcedure
    .input(z.object({ contentId: z.string().min(1).max(100) }))
    .query(async ({ input }) => {
      // Fetch content detail from Railway public API
      const railwayBase = ENV.railwayApiUrl;
      const resp = await fetch(`${railwayBase}/content/${encodeURIComponent(input.contentId)}`);
      if (!resp.ok) {
        throw new TRPCError({
          code: resp.status === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
          message: `Content not found: ${input.contentId}`,
        });
      }
      const detail = await resp.json() as Record<string, unknown>;

      // Check if enrichment is already present
      const hasQuickTake = typeof detail.quick_take === "string" && (detail.quick_take as string).length > 20;
      const hasInsights = Array.isArray(detail.key_insights) && (detail.key_insights as unknown[]).length > 0;
      const hasTickers = Array.isArray(detail.tickers) && (detail.tickers as unknown[]).length > 0;

      // If all enrichment fields are present, return as-is
      if (hasQuickTake && hasInsights && hasTickers) {
        return {
          contentId: input.contentId,
          fromCache: true,
          quickTake: detail.quick_take as string,
          keyInsights: detail.key_insights as Array<{ insight: string; category: string }>,
          tickers: detail.tickers as Array<{ ticker: string; mention_context: string; sentiment: string; is_primary: boolean }>,
          topics: (detail.topics as string[] | null) ?? [],
          skillLevel: (detail.skill_level as string | null) ?? "intermediate",
          pillBadges: (detail.pill_badges as string[] | null) ?? [],
          tags: (detail.tags as string[] | null) ?? [],
          relevanceScore: (detail.relevance_score as number | null) ?? 0,
          qualityScore: Math.round(((detail.relevance_score as number | null) ?? 0) * 100),
          contentType: (detail.content_type as string | null) ?? "trading_education",
        };
      }

      // On-demand LLM enrichment for videos missing data
      const title = (detail.title as string | null) ?? "";
      const description = (detail.description as string | null) ?? "";
      const channelTitle = (detail.creator_name as string | null) ?? (detail.channel_title as string | null) ?? "";
      const durationSeconds = (detail.duration_seconds as number | null) ?? 0;
      const viewCount = (detail.view_count as number | null) ?? 0;
      const ytTags = (detail.tags as string[] | null) ?? [];

      const llmResult = await runQualityFilter({
        title,
        description,
        channelTitle,
        durationSeconds,
        viewCount,
        tags: ytTags,
      });

      return {
        contentId: input.contentId,
        fromCache: false,
        quickTake: llmResult.quickTake || (detail.quick_take as string | null) || "",
        keyInsights: llmResult.keyInsights?.length
          ? llmResult.keyInsights
          : (detail.key_insights as Array<{ insight: string; category: string }> | null) ?? [],
        tickers: hasTickers
          ? (detail.tickers as Array<{ ticker: string; mention_context: string; sentiment: string; is_primary: boolean }>)
          : llmResult.tickers.map(t => ({
              ticker: t.symbol,
              mention_context: t.context,
              sentiment: t.sentiment,
              is_primary: t.isPrimary,
            })),
        topics: llmResult.topics?.length ? llmResult.topics : (detail.topics as string[] | null) ?? [],
        skillLevel: llmResult.skillLevel ?? (detail.skill_level as string | null) ?? "intermediate",
        pillBadges: llmResult.pillBadges?.length ? llmResult.pillBadges : (detail.pill_badges as string[] | null) ?? [],
        tags: llmResult.tags?.length ? llmResult.tags : (detail.tags as string[] | null) ?? [],
        relevanceScore: (detail.relevance_score as number | null) ?? llmResult.score / 100,
        qualityScore: llmResult.score ?? Math.round(((detail.relevance_score as number | null) ?? 0) * 100),
        contentType: llmResult.contentType ?? (detail.content_type as string | null) ?? "trading_education",
      };
    }),
});
