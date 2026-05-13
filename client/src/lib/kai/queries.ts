// K.AI Module — raw Supabase queries
// All RLS-gated by public.is_kai_subscriber() at the database layer.
// Non-subscribers get empty results; the dashboard's app-layer entitlement
// check handles redirecting them to /pricing.

import { supabase } from "@/lib/supabase";
import type {
  KaiAlertPrefs,
  KaiMutedTicker,
  KaiSystemPick,
  KaiTriggerEvent,
  KaiWatchlistRow,
  KaiSystemTier,
  KaiWatchlistMeta,
  KaiV4Components,
  KaiWeeklyPick,
  KaiWeeklyUniverse,
} from "./types";
import { DEFAULT_ALERT_PREFS } from "./types";

// ─── Entitlement ─────────────────────────────────────────────────────────

/**
 * Calls the lazy linker (matches auth.uid() → public.users by email if not
 * already linked) then checks subscription status. Returns true if the
 * current user is an active/trial/onboarding Kai subscriber.
 */
export async function checkKaiEntitlement(): Promise<boolean> {
  // Try to link any existing Kai customer record by email — idempotent
  await supabase.rpc("kai_link_auth_user");
  const { data, error } = await supabase.rpc("is_kai_subscriber");
  if (error) {
    console.warn("[kai] is_kai_subscriber error:", error);
    return false;
  }
  return Boolean(data);
}

// ─── Watchlist ───────────────────────────────────────────────────────────

export async function fetchWatchlist(): Promise<KaiWatchlistRow[]> {
  const { data, error } = await supabase
    .from("kai_user_watchlist")
    .select("*")
    .order("added_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as KaiWatchlistRow[];
}

export async function addToWatchlist(
  userId: string,
  ticker: string,
  notes?: string,
): Promise<KaiWatchlistRow> {
  const { data, error } = await supabase
    .from("kai_user_watchlist")
    .insert({ user_id: userId, ticker: ticker.toUpperCase(), notes: notes ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as KaiWatchlistRow;
}

export async function removeFromWatchlist(ticker: string): Promise<void> {
  const { error } = await supabase
    .from("kai_user_watchlist")
    .delete()
    .eq("ticker", ticker.toUpperCase());
  if (error) throw error;
}

// ─── Alert prefs ─────────────────────────────────────────────────────────

export async function fetchAlertPrefs(userId: string): Promise<KaiAlertPrefs> {
  const { data, error } = await supabase
    .from("kai_user_alert_prefs")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as KaiAlertPrefs;
  // No row yet — return defaults; first save will insert
  return {
    user_id: userId,
    ...DEFAULT_ALERT_PREFS,
    updated_at: new Date().toISOString(),
  };
}

export async function upsertAlertPrefs(
  userId: string,
  partial: Partial<Omit<KaiAlertPrefs, "user_id" | "updated_at">>,
): Promise<KaiAlertPrefs> {
  const { data, error } = await supabase
    .from("kai_user_alert_prefs")
    .upsert(
      {
        user_id: userId,
        ...DEFAULT_ALERT_PREFS,
        ...partial,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();
  if (error) throw error;
  return data as KaiAlertPrefs;
}

export async function setSystemTier(
  userId: string,
  tier: KaiSystemTier,
): Promise<KaiAlertPrefs> {
  return upsertAlertPrefs(userId, { system_tier: tier });
}

// ─── Muted tickers ───────────────────────────────────────────────────────

export async function fetchMutedTickers(): Promise<string[]> {
  const { data, error } = await supabase
    .from("kai_muted_tickers")
    .select("ticker");
  if (error) throw error;
  return (data ?? []).map((r: KaiMutedTicker | { ticker: string }) => r.ticker);
}

export async function muteTicker(userId: string, ticker: string): Promise<void> {
  const { error } = await supabase
    .from("kai_muted_tickers")
    .insert({ user_id: userId, ticker: ticker.toUpperCase() });
  if (error && error.code !== "23505") throw error; // ignore PK conflict (idempotent)
}

export async function unmuteTicker(ticker: string): Promise<void> {
  const { error } = await supabase
    .from("kai_muted_tickers")
    .delete()
    .eq("ticker", ticker.toUpperCase());
  if (error) throw error;
}

// ─── Trigger events (today's live feed + history) ────────────────────────
// The kai_trigger_events table is the live SMS engine's table — its column
// names differ from our normalized client type. We map here so page code
// stays clean.

interface KaiTriggerRow {
  id: number;
  ticker: string;
  fired_at: string;
  direction: string | null;          // 'long' | 'short'
  fired_price: number | null;
  fired_type: string | null;         // 'breakout' | 'orb_break' | etc.
  setup_label: string | null;
  vol_ratio: number | null;
  score_morning: number | null;
  or_high: number | null;
  or_low: number | null;
  vwap: number | null;
  eod_outcome: string | null;        // 'win' | 'loss' | 'tp_hit' | 'stopped' | 'invalidated' | null
  post_fire_invalidated: boolean | null;
  sms_body: string | null;
  sms_sent: boolean | null;
}

function resolveOutcome(r: KaiTriggerRow): KaiTriggerEvent["outcome"] {
  if (r.post_fire_invalidated) return "invalidated";
  const raw = (r.eod_outcome ?? "").toLowerCase().trim();
  if (raw === "tp_hit" || raw === "stopped" || raw === "win" || raw === "loss") {
    return raw;
  }
  if (raw === "invalidated") return "invalidated";
  return "open";
}

function mapTriggerRow(r: KaiTriggerRow): KaiTriggerEvent {
  return {
    id: r.id,
    ticker: r.ticker,
    fired_at: r.fired_at,
    side: (r.direction ?? "long").toLowerCase() === "short" ? "SHORT" : "LONG",
    trigger_type: r.fired_type ?? r.setup_label ?? "breakout",
    entry_price: Number(r.fired_price ?? 0),
    stop_price: null,
    target_price: null,
    source: "system",
    outcome: resolveOutcome(r),
    premise: r.sms_body ?? null,
    payload: {
      setup_label: r.setup_label,
      vol_ratio: r.vol_ratio,
      score: r.score_morning,
      or_high: r.or_high,
      or_low: r.or_low,
      vwap: r.vwap,
      eod_outcome: r.eod_outcome,
      post_fire_invalidated: r.post_fire_invalidated,
      sms_body: r.sms_body,
    },
  };
}

/**
 * ISO timestamp for today's midnight in US/Eastern, regardless of viewer's
 * local timezone. Markets and alert pipelines run on ET, so "today's
 * triggers" must mean "since 00:00 ET" — not 00:00 wherever the user lives.
 */
function easternMidnightIso(): string {
  // en-CA gives YYYY-MM-DD without locale formatting surprises
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  // Determine current ET offset by formatting `Z` portion. Simpler: build a
  // Date as if YYYY-MM-DDT00:00 were ET, then ask Intl what UTC that is.
  // The `tzOffsetMinutes` trick: parse YYYY-MM-DDT00:00:00 as UTC, then
  // shift back by the actual ET offset for that calendar day (handles DST).
  const utcMid = new Date(`${ymd}T00:00:00Z`);
  // Format that UTC instant in ET — gives back the wall-clock ET time. The
  // delta between that and 00:00 tells us the offset to subtract.
  const etWall = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(utcMid);
  const get = (t: string) => Number(etWall.find((p) => p.type === t)?.value ?? 0);
  const etDateAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  const offsetMs = utcMid.getTime() - etDateAsUtc;
  return new Date(utcMid.getTime() + offsetMs).toISOString();
}

const TRIGGER_SELECT =
  "id, ticker, fired_at, direction, fired_price, fired_type, setup_label, " +
  "vol_ratio, score_morning, or_high, or_low, vwap, eod_outcome, " +
  "post_fire_invalidated, sms_body, sms_sent";

export async function fetchTodayTriggers(): Promise<KaiTriggerEvent[]> {
  const { data, error } = await supabase
    .from("kai_trigger_events")
    .select(TRIGGER_SELECT)
    .gte("fired_at", easternMidnightIso())
    .order("fired_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((r) => mapTriggerRow(r as unknown as KaiTriggerRow));
}

export async function fetchHistoryTriggers(days = 7): Promise<KaiTriggerEvent[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from("kai_trigger_events")
    .select(TRIGGER_SELECT)
    .gte("fired_at", since.toISOString())
    .order("fired_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((r) => mapTriggerRow(r as unknown as KaiTriggerRow));
}

// ─── System Top 10 / universe (read from existing vault_store) ──────────

/**
 * Reads the two most recent swing watchlists from vault_store. Returns
 * today's picks + metadata, plus the set of tickers in the immediately-
 * prior daily file so the UI can show PROMOTED / DEMOTED badges.
 */
export async function fetchSystemUniverse(): Promise<{
  picks: KaiSystemPick[];
  meta: KaiWatchlistMeta | null;
  prevTopTickers: Set<string>;
  prevDate: string | null;
}> {
  const { data, error } = await supabase
    .from("vault_store")
    .select("path, content, updated_at")
    .like("path", "Kai/Watchlist/%-swing.json")
    .order("updated_at", { ascending: false })
    .limit(2);
  if (error) {
    console.warn("[kai] vault_store swing lookup failed:", error.message);
    return { picks: [], meta: null, prevTopTickers: new Set(), prevDate: null };
  }
  if (!data || data.length === 0) {
    return { picks: [], meta: null, prevTopTickers: new Set(), prevDate: null };
  }

  const parseRow = (row: { content: unknown }) => {
    try {
      return typeof row.content === "string"
        ? JSON.parse(row.content)
        : row.content;
    } catch {
      return null;
    }
  };

  const todayParsed = parseRow(data[0]);
  const prevParsed = data.length > 1 ? parseRow(data[1]) : null;

  const picks = normalizeUniverse(todayParsed);
  const meta = extractMeta(todayParsed);

  // Compare against prior file's top-10 only — that's the relevant cohort
  // for promotion/demotion tracking on the dashboard.
  const prevPicks = prevParsed ? normalizeUniverse(prevParsed) : [];
  const prevTopTickers = new Set(prevPicks.slice(0, 10).map((p) => p.ticker));
  const prevMeta = prevParsed ? extractMeta(prevParsed) : null;

  return {
    picks,
    meta,
    prevTopTickers,
    prevDate: prevMeta?.generated_for_date ?? null,
  };
}

function extractMeta(raw: unknown): KaiWatchlistMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const generated_for_date =
    (o.generated_for_date as string) ?? (o.generated_at as string)?.slice(0, 10) ?? null;
  if (!generated_for_date) return null;
  const today = new Date().toISOString().slice(0, 10);
  const ageDays = Math.max(
    0,
    Math.floor(
      (Date.parse(today + "T00:00:00Z") - Date.parse(generated_for_date + "T00:00:00Z")) /
        (1000 * 60 * 60 * 24),
    ),
  );
  return {
    generated_at: (o.generated_at as string) ?? "",
    generated_for_date,
    regime: (o.regime as string) ?? "unknown",
    thesis: (o.thesis as string) ?? "",
    scan_size: Number(o.scan_size ?? 0),
    is_stale: ageDays > 0,
    age_days: ageDays,
  };
}

// Maps the trigger engine's swing.json schema to KaiSystemPick.
// Supports the canonical shape (watchlist[] with entry_zone) plus a few
// older variants in case any historical files differ.
function normalizeUniverse(raw: unknown): KaiSystemPick[] {
  if (!raw) return [];
  let arr: unknown[] | null = null;
  if (Array.isArray(raw)) arr = raw;
  else if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.watchlist)) arr = obj.watchlist as unknown[];
    else if (Array.isArray(obj.picks)) arr = obj.picks as unknown[];
    else if (Array.isArray(obj.tickers)) arr = obj.tickers as unknown[];
    else if (Array.isArray(obj.universe)) arr = obj.universe as unknown[];
  }
  if (!arr) return [];

  return arr.map((entry, idx) => {
    const e = entry as Record<string, unknown>;
    const zone = (e.entry_zone as Record<string, unknown> | undefined) ?? {};

    const ts = String(e.trigger_state ?? e.state ?? "").toUpperCase();
    let state: KaiSystemPick["state"];
    if (ts === "TRIGGERED" || e.triggered_at) state = "triggered";
    else if (ts === "INVALIDATED" || ts === "INVALID") state = "invalidated";
    else if (ts === "WAITING" || ts === "FORMING") state = "forming";
    else state = "watching";

    const entryLow = numOrNull(zone.entry_low ?? e.entry_low);
    const entryHigh = numOrNull(zone.entry_high ?? e.entry_high);
    const stop = numOrNull(zone.stop ?? e.stop);
    const target = numOrNull(zone.target ?? e.target);
    const price = Number(e.current_price ?? e.price ?? 0);
    const direction = (String(e.direction ?? "long").toLowerCase() === "short"
      ? "short"
      : "long") as "long" | "short";

    const components: KaiV4Components | undefined = (() => {
      const c: KaiV4Components = {};
      let any = false;
      const setIf = <K extends keyof KaiV4Components>(k: K, v: unknown) => {
        const n = numOrNull(v);
        if (n != null) {
          (c as Record<string, number>)[k] = n;
          any = true;
        }
      };
      setIf("momentum_quality", e.momentum_quality);
      setIf("vol_pattern_score", e.vol_pattern_score);
      setIf("accel_score", e.accel_score);
      setIf("setup_tier", e.setup_tier);
      setIf("catalyst_score", e.catalyst_score);
      setIf("flow_score", e.flow_score);
      setIf("sustained_vol_ratio", e.sustained_vol_ratio);
      return any ? c : undefined;
    })();

    return {
      rank: (e.rank as number) ?? idx + 1,
      ticker: String(e.ticker ?? e.symbol ?? "").toUpperCase(),
      name: (e.name as string) ?? undefined,
      sector: (e.sector as string) ?? undefined,
      score: Number(e.score ?? e.composite_score ?? 0),
      state,
      direction,
      setup_label: typeof e.setup_label === "string" ? (e.setup_label as string) : undefined,
      price,
      change_pct: Number(e.change_1d ?? e.change_pct ?? e.change ?? 0),
      change_5d: numOrNull(e.change_5d),
      market_cap: numOrNull(e.market_cap),
      mcap_label: (e.mcap_label as string) ?? null,
      rsi: numOrNull(e.rsi),
      volume_ratio: numOrNull(e.volume_ratio),
      entry_low: entryLow,
      entry_high: entryHigh,
      entry_mid: numOrNull(zone.entry_mid),
      stop,
      target,
      rr: numOrNull(zone.rr),
      // OR levels aren't on the swing list — leave null so ChartModule can
      // hide itself rather than render synthetic candles around fake levels.
      or_high: null,
      or_low: null,
      trigger_price: numOrNull(e.triggered_price),
      trigger_time: typeof e.triggered_at === "string"
        ? (e.triggered_at as string).slice(11, 16)
        : null,
      sparkline: Array.isArray(e.sparkline) ? (e.sparkline as number[]) : undefined,
      // Only populate `read` when the engine has authored a narrative —
      // boilerplate from labels would be worse than nothing.
      read: typeof e.read === "string" ? (e.read as string) : undefined,
      components,
    };
  }).filter((p) => p.ticker.length > 0);
}

function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ─── Weekly tier (Kai/Weekly/current.json) ───────────────────────────────
// Refreshed by kai_swing_weekly_scan.py on Sunday nights (and ad-hoc).
// Daily watchlist picks are distilled FROM this list, so weekly is the
// broader "what Kai is circling" universe.
export async function fetchWeeklyUniverse(): Promise<KaiWeeklyUniverse> {
  const { data, error } = await supabase
    .from("vault_store")
    .select("content, updated_at")
    .eq("path", "Kai/Weekly/current.json")
    .maybeSingle();
  if (error) {
    console.warn("[kai] weekly fetch failed:", error.message);
    return { picks: [], updated_at: null, age_hours: 0 };
  }
  if (!data?.content) return { picks: [], updated_at: null, age_hours: 0 };
  try {
    const parsed = typeof data.content === "string"
      ? JSON.parse(data.content)
      : data.content;
    if (!Array.isArray(parsed)) return { picks: [], updated_at: null, age_hours: 0 };
    const picks: KaiWeeklyPick[] = parsed
      .map((e: Record<string, unknown>) => ({
        ticker: String(e.ticker ?? "").toUpperCase(),
        score: Number(e.score ?? 0),
        last_close: Number(e.last_close ?? 0),
        chg_5d: Number(e.chg_5d ?? 0),
        chg_20d: Number(e.chg_20d ?? 0),
        pct_from_52w_high: Number(e.pct_from_52w_high ?? 0),
        pct_from_20d_high: Number(e.pct_from_20d_high ?? 0),
        rsi: Number(e.rsi ?? 0),
        rsi_1h: Number(e.rsi_1h ?? 0),
        rsi_2h: Number(e.rsi_2h ?? 0),
        rs_vs_spy_20d: Number(e.rs_vs_spy_20d ?? 0),
        sustained_vol_ratio: Number(e.sustained_vol_ratio ?? 0),
        ema21_above_ema50: Boolean(e.ema21_above_ema50),
        atr_pct: Number(e.atr_pct ?? 0),
        market_cap: Number(e.market_cap ?? 0),
      }))
      .filter((p: KaiWeeklyPick) => p.ticker.length > 0)
      // Already score-sorted server-side, but be defensive
      .sort((a: KaiWeeklyPick, b: KaiWeeklyPick) => b.score - a.score);
    const updatedAt = data.updated_at as string;
    const ageHours = updatedAt
      ? Math.floor((Date.now() - Date.parse(updatedAt)) / (1000 * 60 * 60))
      : 0;
    return { picks, updated_at: updatedAt ?? null, age_hours: ageHours };
  } catch (e) {
    console.warn("[kai] failed to parse weekly JSON:", e);
    return { picks: [], updated_at: null, age_hours: 0 };
  }
}
