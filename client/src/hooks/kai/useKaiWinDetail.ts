// useKaiWinDetail — fetch enriched ticker context for /kai/wins/:ticker
import { useEffect, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://cheatcode-os-api-production.up.railway.app/api/v1";

export interface KaiWinDetailBest {
  sent_at: string;
  alert_type: string;
  alert_price: number;
  stop_price: number | null;
  peak_price: number | null;
  peak_pct: number | null;
  peak_date: string | null;
  days_to_peak: number | null;
  thesis: string | null;
  setup_label: string | null;
  quality_score: number | null;
  catalyst: string | null;
  sector: string | null;
}

export interface KaiWinDetailPerf {
  gain_5min: number | null;
  gain_15min: number | null;
  gain_30min: number | null;
  gain_1hour: number | null;
  gain_1day: number | null;
  gain_3day: number | null;
  gain_1week: number | null;
  current_price: number | null;
}

export interface KaiOhlcBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface KaiAlertEntry {
  sent_at: string;
  alert_type: string;
  alert_price: number;
  setup_label: string | null;
}

export interface KaiWinDetail {
  ticker: string;
  direction: "long" | "short";
  is_big_name: boolean;
  best: KaiWinDetailBest;
  performance: KaiWinDetailPerf;
  all_alerts: KaiAlertEntry[];
  ohlc: KaiOhlcBar[];
  cached: boolean;
}

interface UseKaiWinDetail {
  detail: KaiWinDetail | null;
  loading: boolean;
  error: string | null;
}

export function useKaiWinDetail(ticker: string): UseKaiWinDetail {
  const [detail, setDetail] = useState<KaiWinDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);

    const token = localStorage.getItem("sb-access-token");
    fetch(`${API_BASE}/kai/wins/${encodeURIComponent(ticker)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((body) => {
        if (cancelled) return;
        if (body.error) {
          setError(body.error);
        } else {
          setDetail(body as KaiWinDetail);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Load failed");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ticker]);

  return { detail, loading, error };
}
