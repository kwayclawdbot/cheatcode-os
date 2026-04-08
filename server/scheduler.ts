/**
 * Daily Auto-Ingest Scheduler
 *
 * Runs at midnight UTC every day. For each trading niche, it:
 * 1. Searches YouTube for recent videos (last 24h)
 * 2. Runs the LLM quality filter on each result
 * 3. Auto-submits videos with score >= 70 to Railway
 * 4. Notifies the owner with a summary
 *
 * The scheduler is started from server/_core/index.ts after the HTTP server
 * is bound. It uses a simple setInterval approach — no external cron library
 * needed. The interval fires every hour and checks whether midnight UTC has
 * passed since the last run.
 */

import { ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  description: string;
}

interface QualityResult {
  passes: boolean;
  score: number;
  reason: string;
  contentType: string;
  skillLevel: string;
  topics: string[];
  tickers: Array<{ symbol: string; sentiment: string; context: string; isPrimary: boolean }>;
  quickTake: string;
  keyInsights: Array<{ insight: string; category: string }>;
  pillBadges: string[];
  tags: string[];
}

interface IngestSummary {
  niche: string;
  searched: number;
  analysed: number;
  submitted: number;
  skipped: number;
  errors: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NICHES = ["stocks", "forex", "futures", "crypto", "options"] as const;
type Niche = typeof NICHES[number];

const NICHE_QUERIES: Record<Niche, string> = {
  stocks: "stock market analysis today",
  forex: "forex trading strategy today",
  futures: "futures trading analysis today",
  crypto: "crypto trading analysis today",
  options: "options trading strategy today",
};

const QUALITY_THRESHOLD = 70;
const MAX_RESULTS_PER_NICHE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseIsoDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const [, h, min, sec] = m.map(v => parseInt(v || "0", 10));
  return h * 3600 + min * 60 + sec;
}

async function youtubeSearch(query: string, maxResults: number): Promise<SearchResult[]> {
  const apiKey = ENV.youtubeApiKey;
  if (!apiKey) return [];

  // Published after 48h ago (give some buffer for timezone differences)
  const publishedAfter = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("videoDuration", "medium");
  url.searchParams.set("order", "relevance");
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("relevanceLanguage", "en");
  url.searchParams.set("publishedAfter", publishedAfter);
  url.searchParams.set("key", apiKey);

  const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
  if (!resp.ok) return [];

  const data = await resp.json() as {
    items?: Array<{
      id: { videoId: string };
      snippet: {
        title: string;
        channelTitle: string;
        publishedAt: string;
        thumbnails: { high?: { url: string }; medium?: { url: string } };
        description: string;
      };
    }>;
  };

  return (data.items ?? []).map(item => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    thumbnailUrl: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.medium?.url ?? "",
    description: item.snippet.description,
  }));
}

async function fetchYouTubeVideoDetails(videoId: string) {
  const apiKey = ENV.youtubeApiKey;
  if (!apiKey) return null;

  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!resp.ok) return null;

  const data = await resp.json();
  const item = data.items?.[0];
  if (!item) return null;

  return {
    videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    thumbnailUrl:
      item.snippet.thumbnails?.maxres?.url ||
      item.snippet.thumbnails?.high?.url ||
      item.snippet.thumbnails?.medium?.url ||
      "",
    durationSeconds: parseIsoDuration(item.contentDetails?.duration ?? ""),
    viewCount: parseInt(item.statistics?.viewCount ?? "0", 10),
    likeCount: parseInt(item.statistics?.likeCount ?? "0", 10),
    tags: item.snippet.tags ?? [],
  };
}

async function runQualityFilter(video: {
  title: string;
  description: string;
  channelTitle: string;
  durationSeconds: number;
  viewCount: number;
  tags: string[];
}): Promise<QualityResult | null> {
  const { invokeLLM } = await import("./_core/llm");

  const prompt = `You are a content curator for CheatCode OS, a premium trading education platform.

Analyze this YouTube video and determine if it qualifies for ingestion.

Video Details:
- Title: ${video.title}
- Channel: ${video.channelTitle}
- Duration: ${Math.round(video.durationSeconds / 60)} minutes
- Views: ${video.viewCount.toLocaleString()}
- YouTube Tags: ${video.tags.slice(0, 20).join(", ")}
- Description (first 600 chars): ${video.description.slice(0, 600)}

QUALITY CRITERIA (must meet ALL to pass):
1. Content is directly about trading, investing, or financial markets
2. Duration is at least 5 minutes (educational depth)
3. Not a vlog, lifestyle, or personal finance generic content
4. Not clickbait without substance
5. Has actionable trading insights, analysis, or education

Return JSON with: { "passes": boolean, "score": number (0-100), "reason": string, "contentType": string, "skillLevel": string, "topics": string[], "tickers": array, "quickTake": string, "keyInsights": array, "pillBadges": string[], "tags": string[] }
Return ONLY valid JSON, no markdown fences.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a trading content quality curator. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
    });

    const rawContent = response.choices?.[0]?.message?.content;
    if (!rawContent) return null;
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    let text = content;
    if (text.startsWith("```")) {
      text = text.split("\n").slice(1).join("\n").split("```")[0] ?? text;
    }
    return JSON.parse(text) as QualityResult;
  } catch {
    return null;
  }
}

async function submitToRailway(video: {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  durationSeconds: number;
  viewCount: number;
  likeCount: number;
  tags: string[];
}, quality: QualityResult): Promise<boolean> {
  const railwayBase = ENV.railwayApiUrl;
  if (!railwayBase) return false;

  const payload = {
    video_id: video.videoId,
    title: video.title,
    description: video.description,
    channel_id: video.channelId,
    channel_title: video.channelTitle,
    published_at: video.publishedAt,
    thumbnail_url: video.thumbnailUrl,
    duration_seconds: video.durationSeconds,
    view_count: video.viewCount,
    like_count: video.likeCount,
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
    external_url: `https://www.youtube.com/watch?v=${video.videoId}`,
    ingested_by: "auto_scheduler",
  };

  const adminKey = ENV.railwayAdminKey;
  const authHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(adminKey ? { "Authorization": `Bearer ${adminKey}` } : {}),
  };

  try {
    const resp = await fetch(`${railwayBase}/admin/video/submit`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    if (resp.ok) return true;

    const errText = await resp.text().catch(() => "");
    console.warn(`[Scheduler] /admin/video/submit returned ${resp.status}: ${errText.slice(0, 200)}`);

    // Try fallback queue endpoint
    const queueResp = await fetch(`${railwayBase}/admin/queue/submit`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ external_id: video.videoId, source_platform: "youtube", metadata: payload }),
      signal: AbortSignal.timeout(15000),
    });
    if (!queueResp.ok) {
      const qErrText = await queueResp.text().catch(() => "");
      console.warn(`[Scheduler] /admin/queue/submit returned ${queueResp.status}: ${qErrText.slice(0, 200)}`);
    }
    return queueResp.ok;
  } catch (err) {
    console.error("[Scheduler] submitToRailway network error:", err);
    return false;
  }
}

// ─── Main auto-ingest function ────────────────────────────────────────────────

export async function runAutoIngest(): Promise<IngestSummary[]> {
  console.log("[Scheduler] Starting daily auto-ingest run...");
  const summaries: IngestSummary[] = [];

  for (const niche of NICHES) {
    const summary: IngestSummary = {
      niche,
      searched: 0,
      analysed: 0,
      submitted: 0,
      skipped: 0,
      errors: 0,
    };

    try {
      const query = NICHE_QUERIES[niche];
      console.log(`[Scheduler] Searching niche "${niche}" with query: "${query}"`);

      const searchResults = await youtubeSearch(query, MAX_RESULTS_PER_NICHE);
      summary.searched = searchResults.length;

      for (const result of searchResults) {
        try {
          // Fetch full video details
          const videoDetails = await fetchYouTubeVideoDetails(result.videoId);
          if (!videoDetails) {
            console.warn(`[Scheduler] Could not fetch details for ${result.videoId} ("${result.title}")`);
            summary.errors++;
            continue;
          }

          // Skip shorts
          if (videoDetails.durationSeconds > 0 && videoDetails.durationSeconds < 180) {
            summary.skipped++;
            continue;
          }

          summary.analysed++;

          // Run quality filter
          const quality = await runQualityFilter(videoDetails);
          if (!quality) {
            console.warn(`[Scheduler] LLM quality filter failed for "${videoDetails.title}"`);
            summary.errors++;
            continue;
          }

          if (!quality.passes || quality.score < QUALITY_THRESHOLD) {
            summary.skipped++;
            console.log(`[Scheduler] Skipped "${videoDetails.title}" (score: ${quality.score})`);
            continue;
          }

          // Submit to Railway
          const submitted = await submitToRailway(videoDetails, quality);
          if (submitted) {
            summary.submitted++;
            console.log(`[Scheduler] Submitted "${videoDetails.title}" (score: ${quality.score})`);
          } else {
            console.warn(`[Scheduler] Railway rejected "${videoDetails.title}" (score: ${quality.score})`);
            summary.errors++;
          }

          // Small delay between videos to avoid rate limits
          await new Promise(r => setTimeout(r, 1500));
        } catch (err) {
          summary.errors++;
          console.error(`[Scheduler] Error processing video ${result.videoId}:`, err);
        }
      }
    } catch (err) {
      summary.errors++;
      console.error(`[Scheduler] Error searching niche "${niche}":`, err);
    }

    summaries.push(summary);
    console.log(`[Scheduler] Niche "${niche}" done: searched=${summary.searched}, submitted=${summary.submitted}, skipped=${summary.skipped}, errors=${summary.errors}`);

    // Delay between niches to avoid YouTube API quota exhaustion
    await new Promise(r => setTimeout(r, 3000));
  }

  // Notify owner with summary
  const totalSubmitted = summaries.reduce((acc, s) => acc + s.submitted, 0);
  const totalSearched = summaries.reduce((acc, s) => acc + s.searched, 0);
  const summaryText = summaries
    .map(s => `• ${s.niche}: ${s.submitted}/${s.searched} submitted (${s.skipped} skipped, ${s.errors} errors)`)
    .join("\n");

  try {
    await notifyOwner({
      title: `Daily Auto-Ingest Complete: ${totalSubmitted} videos added`,
      content: `Daily auto-ingest run completed at ${new Date().toUTCString()}.\n\nResults:\n${summaryText}\n\nTotal: ${totalSubmitted} videos submitted from ${totalSearched} searched.`,
    });
  } catch {
    // Notification failure is non-critical
  }

  console.log(`[Scheduler] Daily auto-ingest complete. Total submitted: ${totalSubmitted}`);
  return summaries;
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

let lastRunDate: string | null = null;

function getMidnightUTCDateString(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export function startScheduler(): void {
  console.log("[Scheduler] Daily auto-ingest scheduler started. Will run at midnight UTC.");

  // Check every hour if we need to run
  const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  const checkAndRun = async () => {
    const today = getMidnightUTCDateString();
    const currentHour = new Date().getUTCHours();

    // Run at midnight UTC (hour 0) if we haven't run today
    if (currentHour === 0 && lastRunDate !== today) {
      lastRunDate = today;
      try {
        await runAutoIngest();
      } catch (err) {
        console.error("[Scheduler] Auto-ingest run failed:", err);
      }
    }
  };

  // Run check immediately (in case server restarts at midnight)
  checkAndRun().catch(console.error);

  // Then check every hour
  setInterval(() => {
    checkAndRun().catch(console.error);
  }, CHECK_INTERVAL_MS);
}
