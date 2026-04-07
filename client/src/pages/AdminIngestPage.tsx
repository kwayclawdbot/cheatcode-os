/**
 * AdminIngestPage — /admin/ingest
 *
 * YouTube video ingestion pipeline UI:
 * - Search top videos by trading niche (stocks, forex, futures, crypto, options, general trading)
 * - Custom query override for targeted searches
 * - Bulk quality filter: select videos → run LLM analysis → see pass/fail with scores
 * - Submit approved videos to Railway content pipeline
 * - Single URL submission for one-off ingestion
 *
 * Requires: Supabase auth + tier = "admin" in profiles table
 */
import { useState, useMemo } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Youtube,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  Tag,
  TrendingUp,
  AlertTriangle,
  Clock,
  Zap,
  BarChart2,
  Filter,
  Send,
  PlayCircle,
  Globe,
  DollarSign,
  Bitcoin,
  Activity,
  Layers,
} from "lucide-react";
import { Nav } from "@/components/layout/Nav";
import { getLoginUrl } from "@/const";

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchResult = {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  description: string;
};

type AnalysisResult = {
  videoId: string;
  video: {
    title: string;
    channelTitle: string;
    durationSeconds: number;
    viewCount: number;
    thumbnailUrl: string;
  } | null;
  quality: {
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
  } | null;
  skipped: boolean;
  skipReason: string | null;
};

// ─── Niche config ─────────────────────────────────────────────────────────────

const NICHES = [
  { id: "stocks" as const, label: "Stocks", icon: TrendingUp, color: "#12B76A" },
  { id: "forex" as const, label: "Forex", icon: Globe, color: "#2E90FA" },
  { id: "futures" as const, label: "Futures", icon: Activity, color: "#F79009" },
  { id: "crypto" as const, label: "Crypto", icon: Bitcoin, color: "#F04438" },
  { id: "options" as const, label: "Options", icon: Layers, color: "#7C3AED" },
  { id: "trading" as const, label: "General", icon: DollarSign, color: "#0EA5E9" },
];

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 85 ? "#4DC820" : score >= 70 ? "#F79009" : score >= 50 ? "#F04438" : "#667085";
  return (
    <div
      className="flex items-center justify-center rounded-full flex-shrink-0"
      style={{
        width: 48,
        height: 48,
        background: `conic-gradient(${color} ${score * 3.6}deg, #1e2a3a ${score * 3.6}deg)`,
      }}
    >
      <div
        className="flex items-center justify-center rounded-full text-xs font-black"
        style={{ width: 36, height: 36, background: "#0d1117", color }}
      >
        {score}
      </div>
    </div>
  );
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function fmtViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// ─── Search Result Card ───────────────────────────────────────────────────────

function SearchResultCard({
  result,
  selected,
  onToggle,
  analysis,
}: {
  result: SearchResult;
  selected: boolean;
  onToggle: () => void;
  analysis?: AnalysisResult;
}) {
  const passes = analysis?.quality?.passes;
  const score = analysis?.quality?.score ?? 0;

  return (
    <div
      onClick={onToggle}
      className={`relative rounded-xl border cursor-pointer transition-all ${
        selected ? "border-[#00AEEF] bg-[#00AEEF]/5" : "border-border bg-card hover:border-muted-foreground/40"
      }`}
    >
      <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
        selected ? "border-[#00AEEF] bg-[#00AEEF]" : "border-muted-foreground/40"
      }`}>
        {selected && <CheckCircle2 size={12} className="text-white" />}
      </div>

      <div className="flex gap-3 p-3">
        <div className="relative flex-shrink-0 rounded-lg overflow-hidden" style={{ width: 120, height: 68 }}>
          <img
            src={result.thumbnailUrl}
            alt={result.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=60"; }}
          />
          {analysis && (
            <div className="absolute top-1 left-1">
              {analysis.skipped ? (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-800/80 text-gray-300">SKIP</span>
              ) : passes ? (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#4DC820]/90 text-white">PASS</span>
              ) : (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#E8193C]/90 text-white">FAIL</span>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug mb-1">{result.title}</p>
          <p className="text-[10px] text-muted-foreground mb-1.5">{result.channelTitle}</p>
          {analysis?.video && (
            <div className="flex items-center gap-2">
              <ScoreRing score={score} />
              <div>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{analysis.quality?.reason}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {analysis.quality?.pillBadges?.slice(0, 2).map(b => (
                    <span key={b} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{b}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
          {!analysis && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Clock size={10} />
              <span>{new Date(result.publishedAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminIngestPage() {
  const { isAuthenticated, accessToken } = useSupabaseAuth();

  // Niche search state
  const [selectedNiche, setSelectedNiche] = useState<"stocks" | "forex" | "futures" | "crypto" | "options" | "trading">("stocks");
  const [customQuery, setCustomQuery] = useState("");
  const [searchEnabled, setSearchEnabled] = useState(false);

  // Selection + analysis state
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [analysisResults, setAnalysisResults] = useState<Map<string, AnalysisResult>>(new Map());
  const [isAnalysing, setIsAnalysing] = useState(false);

  // Single URL submission state
  const [singleUrl, setSingleUrl] = useState("");
  const [singleResult, setSingleResult] = useState<AnalysisResult | null>(null);
  const [singleLoading, setSingleLoading] = useState(false);

  // Submit state
  const [submitting, setSubmitting] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());

  // Stable query input
  const searchInput = useMemo(() => ({
    niche: selectedNiche,
    query: customQuery.trim() || undefined,
    maxResults: 20,
  }), [selectedNiche, customQuery]);

  const { data: searchData, isLoading: searchLoading, refetch: refetchSearch } = trpc.ingest.searchByNiche.useQuery(
    searchInput,
    { enabled: searchEnabled, staleTime: 60_000 }
  );

  const bulkAnalyseMutation = trpc.ingest.bulkAnalyse.useMutation();
  const submitVideoMutation = trpc.ingest.submitVideo.useMutation();
  const analyseVideoMutation = trpc.ingest.analyseVideo.useMutation();
  const runAutoIngestMutation = trpc.ingest.runAutoIngest.useMutation();
  const [autoIngestResult, setAutoIngestResult] = useState<{ totalSubmitted: number; totalSearched: number; summaries: Array<{ niche: string; searched: number; submitted: number; skipped: number; errors: number }> } | null>(null);

  const handleRunAutoIngest = async () => {
    setAutoIngestResult(null);
    try {
      const result = await runAutoIngestMutation.mutateAsync();
      setAutoIngestResult(result);
    } catch (e) {
      console.error("Auto-ingest failed", e);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Nav />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle size={40} className="text-[#F79009] mx-auto mb-3" />
            <h2 className="text-lg font-bold text-foreground mb-2">Admin Access Required</h2>
            <p className="text-sm text-muted-foreground mb-4">Sign in with an admin account to access the ingestion pipeline.</p>
            <Button onClick={() => { window.location.href = getLoginUrl(); }}>Sign In</Button>
          </div>
        </div>
      </div>
    );
  }

  const handleSearch = () => {
    setSearchEnabled(true);
    setSelectedVideoIds(new Set());
    setAnalysisResults(new Map());
    if (searchEnabled) refetchSearch();
  };

  const toggleSelect = (videoId: string) => {
    setSelectedVideoIds(prev => {
      const next = new Set(prev);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  };

  const handleBulkAnalyse = async () => {
    if (selectedVideoIds.size === 0) return;
    setIsAnalysing(true);
    try {
      const results = await bulkAnalyseMutation.mutateAsync({ videoIds: Array.from(selectedVideoIds) });
      const map = new Map<string, AnalysisResult>(analysisResults);
      for (const r of results) {
        if (r.videoId) map.set(r.videoId, r as AnalysisResult);
      }
      setAnalysisResults(map);
    } finally {
      setIsAnalysing(false);
    }
  };

  const handleSubmitVideo = async (videoId: string) => {
    if (!accessToken) return;
    setSubmitting(prev => new Set(prev).add(videoId));
    try {
      await submitVideoMutation.mutateAsync({ urlOrId: videoId, supabaseToken: accessToken, forceIngest: false });
      setSubmitted(prev => new Set(prev).add(videoId));
    } catch (e) {
      console.error("Submit failed", e);
    } finally {
      setSubmitting(prev => { const n = new Set(prev); n.delete(videoId); return n; });
    }
  };

  const handleSingleAnalyse = async () => {
    if (!singleUrl.trim()) return;
    setSingleLoading(true);
    setSingleResult(null);
    try {
      const result = await analyseVideoMutation.mutateAsync({ urlOrId: singleUrl.trim() });
      setSingleResult(result as AnalysisResult);
    } finally {
      setSingleLoading(false);
    }
  };

  const handleSingleSubmit = async () => {
    if (!singleResult || !accessToken) return;
    setSubmitting(prev => new Set(prev).add(singleResult.videoId));
    try {
      await submitVideoMutation.mutateAsync({ urlOrId: singleResult.videoId, supabaseToken: accessToken, forceIngest: false });
      setSubmitted(prev => new Set(prev).add(singleResult.videoId));
    } finally {
      setSubmitting(prev => { const n = new Set(prev); n.delete(singleResult.videoId); return n; });
    }
  };

  const passedVideos = Array.from(analysisResults.values()).filter(r => r.quality?.passes);
  const failedVideos = Array.from(analysisResults.values()).filter(r => !r.quality?.passes && !r.skipped);
  const searchResults = searchData?.results ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl cc-gradient-bg flex items-center justify-center">
                <Youtube size={18} className="text-[#101828]" />
              </div>
              <div>
                <h1 className="text-xl font-black text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                  Content Ingestion Pipeline
                </h1>
                <p className="text-xs text-muted-foreground">Search by niche → quality filter → submit to Railway</p>
              </div>
            </div>
            {/* Auto-ingest trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunAutoIngest}
              disabled={runAutoIngestMutation.isPending}
              className="flex items-center gap-1.5 border-[#4DC820]/40 text-[#4DC820] hover:bg-[#4DC820]/10"
            >
              {runAutoIngestMutation.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Zap size={13} />
              )}
              {runAutoIngestMutation.isPending ? "Running..." : "Run Auto-Ingest"}
            </Button>
          </div>

          {/* Auto-ingest result */}
          {autoIngestResult && (
            <div className="mt-3 p-3 rounded-xl border border-[#4DC820]/30 bg-[#4DC820]/5">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={14} className="text-[#4DC820]" />
                <span className="text-xs font-bold text-[#4DC820]">
                  Auto-ingest complete: {autoIngestResult.totalSubmitted} videos submitted from {autoIngestResult.totalSearched} searched
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {autoIngestResult.summaries.map(s => (
                  <div key={s.niche} className="bg-card rounded-lg p-2 border border-border">
                    <p className="text-[10px] font-bold text-foreground capitalize mb-0.5">{s.niche}</p>
                    <p className="text-[10px] text-muted-foreground">{s.submitted}/{s.searched} submitted</p>
                    {s.errors > 0 && <p className="text-[10px] text-[#F04438]">{s.errors} errors</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Niche Search */}
          <div className="lg:col-span-2 space-y-5">

            {/* Niche selector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Search size={14} className="text-[#00AEEF]" />
                  Search by Niche
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {NICHES.map(n => {
                    const Icon = n.icon;
                    return (
                      <button
                        key={n.id}
                        onClick={() => setSelectedNiche(n.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          selectedNiche === n.id ? "text-white border-transparent" : "border-border text-muted-foreground hover:border-muted-foreground/60"
                        }`}
                        style={selectedNiche === n.id ? { backgroundColor: n.color, borderColor: n.color } : {}}
                      >
                        <Icon size={11} />
                        {n.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={customQuery}
                    onChange={e => setCustomQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder={`Custom query (optional, e.g. "SPY options flow analysis")`}
                    className="text-sm"
                  />
                  <Button onClick={handleSearch} disabled={searchLoading} className="flex-shrink-0">
                    {searchLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    <span className="ml-1.5">Search</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Search results */}
            {searchResults.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <PlayCircle size={14} className="text-[#00AEEF]" />
                      {searchResults.length} Videos Found
                      {selectedVideoIds.size > 0 && (
                        <Badge variant="secondary" className="ml-1">{selectedVideoIds.size} selected</Badge>
                      )}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectedVideoIds.size === searchResults.length) {
                            setSelectedVideoIds(new Set());
                          } else {
                            setSelectedVideoIds(new Set(searchResults.map(r => r.videoId)));
                          }
                        }}
                        className="text-xs"
                      >
                        {selectedVideoIds.size === searchResults.length ? "Deselect All" : "Select All"}
                      </Button>
                      {selectedVideoIds.size > 0 && (
                        <Button
                          size="sm"
                          onClick={handleBulkAnalyse}
                          disabled={isAnalysing}
                          className="text-xs cc-gradient-bg text-[#101828] font-bold"
                        >
                          {isAnalysing ? (
                            <><Loader2 size={12} className="animate-spin mr-1" />Analysing...</>
                          ) : (
                            <><Filter size={12} className="mr-1" />Quality Filter ({selectedVideoIds.size})</>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2">
                    {searchResults.map(result => (
                      <SearchResultCard
                        key={result.videoId}
                        result={result}
                        selected={selectedVideoIds.has(result.videoId)}
                        onToggle={() => toggleSelect(result.videoId)}
                        analysis={analysisResults.get(result.videoId)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Passed videos */}
            {passedVideos.length > 0 && (
              <Card className="border-[#4DC820]/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-[#4DC820]">
                    <CheckCircle2 size={14} />
                    {passedVideos.length} Videos Passed Quality Filter
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {passedVideos.map(r => (
                    <div key={r.videoId} className="flex items-start gap-3 p-3 rounded-xl bg-[#4DC820]/5 border border-[#4DC820]/20">
                      <ScoreRing score={r.quality!.score} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground line-clamp-1">{r.video?.title}</p>
                        <p className="text-[10px] text-muted-foreground mb-1">
                          {r.video?.channelTitle} · {r.video ? fmtDuration(r.video.durationSeconds) : ""} · {r.video ? fmtViews(r.video.viewCount) : ""} views
                        </p>
                        <p className="text-[10px] text-foreground/70 line-clamp-2 mb-1.5">{r.quality?.quickTake}</p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {r.quality?.pillBadges?.slice(0, 3).map(b => (
                            <span key={b} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#4DC820]/15 text-[#4DC820]">{b}</span>
                          ))}
                          {r.quality?.tickers?.filter(t => t.isPrimary).slice(0, 3).map(t => (
                            <span key={t.symbol} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{t.symbol}</span>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSubmitVideo(r.videoId)}
                          disabled={submitting.has(r.videoId) || submitted.has(r.videoId)}
                          className="text-xs h-7"
                          style={submitted.has(r.videoId) ? {} : { background: "var(--cc-gradient)", color: "#101828" }}
                        >
                          {submitted.has(r.videoId) ? (
                            <><CheckCircle2 size={11} className="mr-1 text-[#4DC820]" />Submitted</>
                          ) : submitting.has(r.videoId) ? (
                            <><Loader2 size={11} className="animate-spin mr-1" />Submitting...</>
                          ) : (
                            <><Send size={11} className="mr-1" />Submit to Railway</>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Failed videos */}
            {failedVideos.length > 0 && (
              <Card className="border-[#E8193C]/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-[#E8193C]">
                    <XCircle size={14} />
                    {failedVideos.length} Videos Failed Quality Filter
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {failedVideos.map(r => (
                    <div key={r.videoId} className="flex items-center gap-3 p-3 rounded-xl bg-[#E8193C]/5 border border-[#E8193C]/15">
                      <ScoreRing score={r.quality?.score ?? 0} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground line-clamp-1">{r.video?.title}</p>
                        <p className="text-[10px] text-muted-foreground">{r.quality?.reason}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSubmitVideo(r.videoId)}
                        disabled={submitting.has(r.videoId) || submitted.has(r.videoId)}
                        className="text-[10px] h-7 flex-shrink-0"
                      >
                        {submitted.has(r.videoId) ? "Submitted" : "Force Submit"}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Single URL + Stats */}
          <div className="space-y-5">
            {/* Single URL */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Youtube size={14} className="text-[#E8193C]" />
                  Single Video
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={singleUrl}
                  onChange={e => setSingleUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSingleAnalyse()}
                  placeholder="YouTube URL or video ID"
                  className="text-sm"
                />
                <Button
                  className="w-full text-sm cc-gradient-bg text-[#101828] font-bold"
                  onClick={handleSingleAnalyse}
                  disabled={singleLoading || !singleUrl.trim()}
                >
                  {singleLoading ? <><Loader2 size={13} className="animate-spin mr-2" />Analysing...</> : <><Zap size={13} className="mr-2" />Analyse Video</>}
                </Button>

                {singleResult && (
                  <div className="rounded-xl border border-border p-3 space-y-2">
                    {singleResult.skipped ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertTriangle size={12} className="text-[#F79009]" />
                        {singleResult.skipReason}
                      </div>
                    ) : singleResult.quality ? (
                      <>
                        <div className="flex items-center gap-3">
                          <ScoreRing score={singleResult.quality.score} />
                          <div>
                            <div className="flex items-center gap-1.5">
                              {singleResult.quality.passes ? (
                                <CheckCircle2 size={12} className="text-[#4DC820]" />
                              ) : (
                                <XCircle size={12} className="text-[#E8193C]" />
                              )}
                              <span className={`text-xs font-bold ${singleResult.quality.passes ? "text-[#4DC820]" : "text-[#E8193C]"}`}>
                                {singleResult.quality.passes ? "Passes" : "Fails"} Quality Filter
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{singleResult.quality.reason}</p>
                          </div>
                        </div>
                        {singleResult.quality.quickTake && (
                          <p className="text-[10px] text-foreground/70 leading-relaxed">{singleResult.quality.quickTake}</p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {singleResult.quality.pillBadges?.slice(0, 3).map(b => (
                            <span key={b} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{b}</span>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          className="w-full text-xs h-8"
                          onClick={handleSingleSubmit}
                          disabled={submitting.has(singleResult.videoId) || submitted.has(singleResult.videoId) || !accessToken}
                          style={submitted.has(singleResult.videoId) ? {} : { background: "var(--cc-gradient)", color: "#101828" }}
                        >
                          {submitted.has(singleResult.videoId) ? (
                            <><CheckCircle2 size={11} className="mr-1 text-[#4DC820]" />Submitted</>
                          ) : submitting.has(singleResult.videoId) ? (
                            <><Loader2 size={11} className="animate-spin mr-1" />Submitting...</>
                          ) : (
                            <><Send size={11} className="mr-1" />Submit to Railway</>
                          )}
                        </Button>
                      </>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart2 size={14} className="text-[#00AEEF]" />
                  Session Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { label: "Videos Found", value: searchResults.length, color: "#2E90FA" },
                    { label: "Analysed", value: analysisResults.size, color: "#F79009" },
                    { label: "Passed", value: passedVideos.length, color: "#4DC820" },
                    { label: "Failed", value: failedVideos.length, color: "#E8193C" },
                    { label: "Submitted", value: submitted.size, color: "#7C3AED" },
                  ].map(stat => (
                    <div key={stat.label} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                      <span className="text-sm font-bold" style={{ color: stat.color }}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* How it works */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">How It Works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {[
                    { step: "1", text: "Select a niche or enter a custom query" },
                    { step: "2", text: "Search returns top YouTube results" },
                    { step: "3", text: "Select videos and run quality filter" },
                    { step: "4", text: "LLM scores each video 0–100 for trading relevance" },
                    { step: "5", text: "Submit approved videos to Railway" },
                    { step: "6", text: "Railway ingests, enriches, and publishes" },
                  ].map(({ step, text }) => (
                    <div key={step} className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground flex-shrink-0 mt-0.5">
                        {step}
                      </span>
                      <p className="text-[11px] text-muted-foreground leading-snug">{text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
