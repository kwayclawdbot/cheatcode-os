/**
 * AdminIngestPage — /admin/ingest
 *
 * YouTube video ingestion pipeline UI:
 * - Submit a YouTube URL for quality analysis + ingestion
 * - Preview enriched metadata (tickers, tags, topics, pill badges)
 * - Trigger full curation cycle on Railway
 * - View curation queue
 *
 * Requires: Supabase auth + tier = "admin" in profiles table
 */

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Youtube,
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  RefreshCw,
  Tag,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Clock,
  Eye,
  ThumbsUp,
  Zap,
  BarChart2,
} from "lucide-react";
import { Nav } from "@/components/layout/Nav";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 85 ? "#4DC820" : score >= 70 ? "#F79009" : score >= 50 ? "#F04438" : "#667085";
  return (
    <div
      className="flex items-center justify-center rounded-full text-lg font-black"
      style={{
        width: 64,
        height: 64,
        background: `conic-gradient(${color} ${score * 3.6}deg, #1e2a3a ${score * 3.6}deg)`,
        boxShadow: `0 0 16px ${color}44`,
      }}
    >
      <div
        className="flex items-center justify-center rounded-full text-sm font-bold"
        style={{ width: 48, height: 48, background: "#0d1117", color }}
      >
        {score}
      </div>
    </div>
  );
}

// ─── Ticker Badge ─────────────────────────────────────────────────────────────
function TickerBadge({
  symbol,
  sentiment,
  isPrimary,
}: {
  symbol: string;
  sentiment: string;
  isPrimary: boolean;
}) {
  const color =
    sentiment === "bullish" ? "#4DC820" : sentiment === "bearish" ? "#F04438" : "#667085";
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold"
      style={{
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
        fontFamily: "var(--font-mono)",
      }}
    >
      {isPrimary && <Zap size={9} />}
      {symbol}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminIngestPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [url, setUrl] = useState("");
  const [forceIngest, setForceIngest] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [activeView, setActiveView] = useState<"submit" | "queue">("submit");

  // Get Supabase token from localStorage
  const supabaseToken =
    typeof window !== "undefined"
      ? localStorage.getItem("sb-access-token") ?? ""
      : "";

  // tRPC mutations
  const analyseMutation = trpc.ingest.analyseVideo.useMutation({
    onSuccess: (data) => {
      setAnalysisResult(data);
      setSubmitResult(null);
    },
  });

  const submitMutation = trpc.ingest.submitVideo.useMutation({
    onSuccess: (data) => {
      setSubmitResult(data);
    },
  });

  const curationMutation = trpc.ingest.triggerCuration.useMutation();
  const ingestionMutation = trpc.ingest.triggerIngestion.useMutation();

  // Queue query
  const queueQuery = trpc.ingest.getQueue.useQuery(
    { supabaseToken, status: "pending" },
    { enabled: activeView === "queue" && !!supabaseToken }
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d1117" }}>
        <Loader2 className="animate-spin text-[#4DC820]" size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#0d1117" }}>
        <p className="text-white text-lg font-semibold">Sign in to access the ingestion panel</p>
        <Button onClick={() => (window.location.href = getLoginUrl())}>
          Sign In
        </Button>
      </div>
    );
  }

  const handleAnalyse = () => {
    if (!url.trim()) return;
    setAnalysisResult(null);
    setSubmitResult(null);
    analyseMutation.mutate({ urlOrId: url.trim() });
  };

  const handleSubmit = () => {
    if (!url.trim() || !supabaseToken) return;
    submitMutation.mutate({ urlOrId: url.trim(), supabaseToken, forceIngest });
  };

  const quality = analysisResult?.quality;
  const video = analysisResult?.video;

  return (
    <div className="min-h-screen" style={{ background: "#0d1117", color: "#e2e8f0" }}>
      <Nav />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #E8193C, #7B2FBE)" }}
          >
            <Youtube size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
              Content Ingestion
            </h1>
            <p className="text-sm" style={{ color: "#667085" }}>
              Quality-filtered YouTube ingestion pipeline
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveView(activeView === "submit" ? "queue" : "submit")}
              className="text-xs"
              style={{ borderColor: "#1e2a3a", color: "#667085", background: "transparent" }}
            >
              {activeView === "submit" ? "View Queue" : "Submit Video"}
            </Button>
          </div>
        </div>

        {activeView === "submit" ? (
          <>
            {/* URL Input */}
            <Card style={{ background: "#0d1117", border: "1px solid #1e2a3a" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-white">Submit YouTube Video</CardTitle>
                <CardDescription style={{ color: "#667085" }}>
                  Paste a YouTube URL or video ID. The pipeline will analyse quality, extract tickers, and generate tags.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... or video ID"
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyse()}
                    style={{
                      background: "#1a2035",
                      border: "1px solid #1e2a3a",
                      color: "#e2e8f0",
                    }}
                  />
                  <Button
                    onClick={handleAnalyse}
                    disabled={analyseMutation.isPending || !url.trim()}
                    style={{ background: "#4DC820", color: "#0d1117" }}
                  >
                    {analyseMutation.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      "Analyse"
                    )}
                  </Button>
                </div>
                {analyseMutation.error && (
                  <p className="text-xs text-red-400">{analyseMutation.error.message}</p>
                )}
              </CardContent>
            </Card>

            {/* Analysis Result */}
            {analysisResult && !analysisResult.skipped && quality && video && (
              <div className="mt-6 space-y-4">
                {/* Video Header */}
                <div className="flex gap-4 p-4 rounded-xl" style={{ background: "#111827", border: "1px solid #1e2a3a" }}>
                  {video.thumbnailUrl && (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="rounded-lg object-cover flex-shrink-0"
                      style={{ width: 140, height: 80 }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm leading-snug mb-1 line-clamp-2">
                      {video.title}
                    </p>
                    <p className="text-xs mb-2" style={{ color: "#667085" }}>
                      {video.channelTitle}
                    </p>
                    <div className="flex items-center gap-3 text-xs" style={{ color: "#667085" }}>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {Math.round(video.durationSeconds / 60)}m
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye size={10} />
                        {video.viewCount.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp size={10} />
                        {video.likeCount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <ScoreRing score={quality.score} />
                </div>

                {/* Quality Decision */}
                <div
                  className="flex items-start gap-3 p-4 rounded-xl"
                  style={{
                    background: quality.passes ? "#4DC82011" : "#F0443811",
                    border: `1px solid ${quality.passes ? "#4DC82033" : "#F0443833"}`,
                  }}
                >
                  {quality.passes ? (
                    <CheckCircle2 size={18} className="text-[#4DC820] flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={18} className="text-[#F04438] flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p
                      className="text-sm font-semibold mb-0.5"
                      style={{ color: quality.passes ? "#4DC820" : "#F04438" }}
                    >
                      {quality.passes ? "Passes Quality Filter" : "Does Not Pass Quality Filter"}
                    </p>
                    <p className="text-xs" style={{ color: "#94a3b8" }}>
                      {quality.reason}
                    </p>
                  </div>
                </div>

                {/* Quick Take */}
                {quality.quickTake && (
                  <div className="p-4 rounded-xl" style={{ background: "#111827", border: "1px solid #1e2a3a" }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#667085" }}>
                      Quick Take
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: "#cbd5e1" }}>
                      {quality.quickTake}
                    </p>
                  </div>
                )}

                {/* Tickers */}
                {quality.tickers?.length > 0 && (
                  <div className="p-4 rounded-xl" style={{ background: "#111827", border: "1px solid #1e2a3a" }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: "#667085" }}>
                      <TrendingUp size={11} /> Tickers Mentioned
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {quality.tickers.map((t: any) => (
                        <div key={t.symbol} className="flex flex-col gap-0.5">
                          <TickerBadge
                            symbol={t.symbol}
                            sentiment={t.sentiment}
                            isPrimary={t.isPrimary}
                          />
                          {t.context && (
                            <p className="text-[9px] max-w-[100px] truncate" style={{ color: "#667085" }}>
                              {t.context}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Topics + Pill Badges */}
                <div className="grid grid-cols-2 gap-3">
                  {quality.topics?.length > 0 && (
                    <div className="p-4 rounded-xl" style={{ background: "#111827", border: "1px solid #1e2a3a" }}>
                      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#667085" }}>
                        Topics
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {quality.topics.map((t: string) => (
                          <Badge
                            key={t}
                            variant="secondary"
                            className="text-[10px]"
                            style={{ background: "#1e2a3a", color: "#94a3b8" }}
                          >
                            {t.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {quality.pillBadges?.length > 0 && (
                    <div className="p-4 rounded-xl" style={{ background: "#111827", border: "1px solid #1e2a3a" }}>
                      <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#667085" }}>
                        Pill Badges
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {quality.pillBadges.map((b: string) => (
                          <Badge
                            key={b}
                            className="text-[10px]"
                            style={{ background: "#4DC82022", color: "#4DC820", border: "1px solid #4DC82044" }}
                          >
                            {b}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Key Insights */}
                {quality.keyInsights?.length > 0 && (
                  <div className="p-4 rounded-xl" style={{ background: "#111827", border: "1px solid #1e2a3a" }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#667085" }}>
                      Key Insights
                    </p>
                    <div className="space-y-2">
                      {quality.keyInsights.map((ins: any, i: number) => (
                        <div key={i} className="flex items-start gap-2">
                          <ChevronRight size={12} className="text-[#4DC820] flex-shrink-0 mt-0.5" />
                          <p className="text-xs" style={{ color: "#cbd5e1" }}>
                            {ins.insight}
                          </p>
                          <Badge
                            className="ml-auto text-[9px] flex-shrink-0"
                            style={{ background: "#1e2a3a", color: "#667085" }}
                          >
                            {ins.category}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {quality.tags?.length > 0 && (
                  <div className="p-4 rounded-xl" style={{ background: "#111827", border: "1px solid #1e2a3a" }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: "#667085" }}>
                      <Tag size={10} /> Tags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {quality.tags.map((t: string) => (
                        <span
                          key={t}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: "#1e2a3a", color: "#667085", fontFamily: "var(--font-mono)" }}
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submit Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending || !supabaseToken}
                    style={{
                      background: quality.passes ? "#4DC820" : "#F79009",
                      color: "#0d1117",
                    }}
                  >
                    {submitMutation.isPending ? (
                      <Loader2 size={14} className="animate-spin mr-2" />
                    ) : (
                      <Play size={14} className="mr-2" />
                    )}
                    {quality.passes ? "Submit to Platform" : "Force Submit Anyway"}
                  </Button>
                  {!quality.passes && (
                    <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "#667085" }}>
                      <input
                        type="checkbox"
                        checked={forceIngest}
                        onChange={(e) => setForceIngest(e.target.checked)}
                        className="rounded"
                      />
                      Force ingest (bypass quality filter)
                    </label>
                  )}
                  {!supabaseToken && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertTriangle size={11} /> Not signed in — cannot submit
                    </p>
                  )}
                </div>

                {/* Submit Result */}
                {submitResult && (
                  <div
                    className="p-4 rounded-xl"
                    style={{
                      background: submitResult.success ? "#4DC82011" : "#F0443811",
                      border: `1px solid ${submitResult.success ? "#4DC82033" : "#F0443833"}`,
                    }}
                  >
                    <p
                      className="text-sm font-semibold"
                      style={{ color: submitResult.success ? "#4DC820" : "#F04438" }}
                    >
                      {submitResult.success
                        ? submitResult.queued
                          ? "Added to curation queue"
                          : "Successfully submitted to platform"
                        : submitResult.message ?? "Submission failed"}
                    </p>
                  </div>
                )}
                {submitMutation.error && (
                  <p className="text-xs text-red-400">{submitMutation.error.message}</p>
                )}
              </div>
            )}

            {/* Skipped video */}
            {analysisResult?.skipped && (
              <div
                className="mt-6 p-4 rounded-xl flex items-center gap-3"
                style={{ background: "#F7900911", border: "1px solid #F7900933" }}
              >
                <AlertTriangle size={18} className="text-[#F79009]" />
                <p className="text-sm" style={{ color: "#F79009" }}>
                  {analysisResult.skipReason}
                </p>
              </div>
            )}

            <Separator className="my-8" style={{ background: "#1e2a3a" }} />

            {/* Pipeline Controls */}
            <div className="grid grid-cols-2 gap-4">
              <Card style={{ background: "#111827", border: "1px solid #1e2a3a" }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <RefreshCw size={14} className="text-[#F79009]" />
                    Curation Cycle
                  </CardTitle>
                  <CardDescription style={{ color: "#667085" }} className="text-xs">
                    Scan all active creators for new content on Railway
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => curationMutation.mutate({ supabaseToken })}
                    disabled={curationMutation.isPending || !supabaseToken}
                    className="w-full text-xs"
                    style={{ borderColor: "#1e2a3a", color: "#F79009", background: "transparent" }}
                  >
                    {curationMutation.isPending ? (
                      <Loader2 size={12} className="animate-spin mr-1" />
                    ) : null}
                    {curationMutation.isSuccess ? "Triggered ✓" : "Trigger Curation"}
                  </Button>
                </CardContent>
              </Card>

              <Card style={{ background: "#111827", border: "1px solid #1e2a3a" }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <BarChart2 size={14} className="text-[#2E90FA]" />
                    Ingestion Run
                  </CardTitle>
                  <CardDescription style={{ color: "#667085" }} className="text-xs">
                    Process all pending curated items on Railway
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => ingestionMutation.mutate({ supabaseToken })}
                    disabled={ingestionMutation.isPending || !supabaseToken}
                    className="w-full text-xs"
                    style={{ borderColor: "#1e2a3a", color: "#2E90FA", background: "transparent" }}
                  >
                    {ingestionMutation.isPending ? (
                      <Loader2 size={12} className="animate-spin mr-1" />
                    ) : null}
                    {ingestionMutation.isSuccess ? "Triggered ✓" : "Trigger Ingestion"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          /* Queue View */
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-white">Pending Queue</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => queueQuery.refetch()}
                className="text-xs"
                style={{ borderColor: "#1e2a3a", color: "#667085", background: "transparent" }}
              >
                <RefreshCw size={12} className="mr-1" />
                Refresh
              </Button>
            </div>
            {queueQuery.isLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-[#4DC820]" size={24} />
              </div>
            )}
            {queueQuery.error && (
              <p className="text-xs text-red-400 text-center py-4">
                {queueQuery.error.message}
              </p>
            )}
            {queueQuery.data && queueQuery.data.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: "#667085" }}>
                No pending items in queue
              </p>
            )}
            {queueQuery.data?.map((item: any) => (
              <div
                key={item.id}
                className="p-4 rounded-xl"
                style={{ background: "#111827", border: "1px solid #1e2a3a" }}
              >
                <p className="text-sm font-medium text-white mb-1">
                  {item.metadata?.title ?? item.external_id}
                </p>
                <p className="text-xs" style={{ color: "#667085" }}>
                  {item.source_platform} · {new Date(item.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
