// K.AI Module — shared types matching public.kai_* tables
// Schema applied 2026-05-03 via migration kai_module_phase1_schema

export type KaiTriggerSide = "LONG" | "SHORT";
export type KaiTriggerSource = "system" | "user_pick";
export type KaiSystemTier = "top5" | "top10" | "universe";
export type KaiTickerState = "forming" | "triggered" | "invalidated" | "watching";

export interface KaiWatchlistRow {
  id: string;
  user_id: string;
  ticker: string;
  added_at: string;
  notes: string | null;
}

export interface KaiAlertPrefs {
  user_id: string;
  system_tier: KaiSystemTier;
  personal_picks: boolean;
  low_quality_warning: boolean;
  pause_all: boolean;
  channel_sms: boolean;
  channel_inapp: boolean;
  channel_push: boolean;
  updated_at: string;
}

export interface KaiMutedTicker {
  user_id: string;
  ticker: string;
  muted_at: string;
}

// Resolved outcome surfaced on the trigger row UI. Distinct from the raw
// eod_outcome column so we can collapse post_fire_invalidated + EOD outcome
// into a single discriminator the renderer can switch on.
export type KaiTriggerOutcome =
  | "tp_hit"
  | "stopped"
  | "invalidated"
  | "win"
  | "loss"
  | "open";

export interface KaiTriggerEvent {
  id: number;
  ticker: string;
  fired_at: string;
  side: KaiTriggerSide;
  trigger_type: string;
  entry_price: number;
  stop_price: number | null;
  target_price: number | null;
  source: KaiTriggerSource;
  /** Resolved outcome — `open` until EOD evaluation runs. */
  outcome: KaiTriggerOutcome;
  /** The one-liner premise sent to SMS users (payload.sms_body). */
  premise: string | null;
  payload: Record<string, unknown> | null;
}

// Aggregated row used by Today/TickerDetail views — joined client-side
export interface KaiSystemPick {
  rank: number;
  ticker: string;
  name?: string;
  sector?: string;
  score: number;
  state: KaiTickerState;
  direction: "long" | "short";
  setup_label?: string;       // 'CONTINUATION' | 'BREAKOUT' | etc.
  price: number;
  change_pct: number;
  change_5d?: number | null;
  market_cap?: number | null;
  mcap_label?: string | null; // 'MEGA' | 'LARGE' | 'MID'
  rsi?: number | null;
  volume_ratio?: number | null;
  entry_low: number | null;
  entry_high: number | null;
  entry_mid?: number | null;
  stop: number | null;
  target: number | null;
  rr?: number | null;         // risk-reward ratio
  or_high?: number | null;
  or_low?: number | null;
  trigger_price?: number | null;
  trigger_time?: string | null;
  sparkline?: number[];
  read?: string;
  // Real V4 component scores from the engine (when present)
  components?: KaiV4Components;
}

export interface KaiV4Components {
  momentum_quality?: number;
  vol_pattern_score?: number;
  accel_score?: number;
  setup_tier?: number;
  catalyst_score?: number;
  flow_score?: number;
  // Sustained-volume signal (separate from raw volume_ratio)
  sustained_vol_ratio?: number;
}

// Watchlist file metadata — surfaced as a context bar on the dashboard
export interface KaiWatchlistMeta {
  generated_at: string;
  generated_for_date: string;  // 'YYYY-MM-DD'
  regime: string;              // 'neutral' | 'risk_on' | 'risk_off' | etc.
  thesis: string;
  scan_size: number;
  is_stale: boolean;           // computed: generated_for_date != today
  age_days: number;            // computed
}

// Weekly tier — broader watch universe, refreshed weekly. No entry zones
// or setup labels; pure technical pre-screen of "what's been building"
// over a multi-week lookback. Source: Kai/Weekly/current.json.
export interface KaiWeeklyPick {
  ticker: string;
  score: number;          // 0-100 weekly composite
  last_close: number;
  chg_5d: number;
  chg_20d: number;
  pct_from_52w_high: number;
  pct_from_20d_high: number;
  rsi: number;
  rsi_1h: number;
  rsi_2h: number;
  rs_vs_spy_20d: number;       // relative strength vs SPY
  sustained_vol_ratio: number;
  ema21_above_ema50: boolean;
  atr_pct: number;
  market_cap: number;
}

export interface KaiWeeklyUniverse {
  picks: KaiWeeklyPick[];
  updated_at: string | null;   // when Kai/Weekly/current.json was last written
  age_hours: number;           // computed
}

export const DEFAULT_ALERT_PREFS: Omit<KaiAlertPrefs, "user_id" | "updated_at"> = {
  system_tier: "top5",
  personal_picks: true,
  low_quality_warning: true,
  pause_all: false,
  channel_sms: true,
  channel_inapp: true,
  channel_push: false,
};
