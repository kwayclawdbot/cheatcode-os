// useKaiWins — fetch top Kai alert wins (peak before stop) from backend
import { useEffect, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://cheatcode-os-api-production.up.railway.app/api/v1";

export interface KaiWin {
  ticker: string;
  alert_type: string;
  direction: "long" | "short";
  sent_at: string;
  alert_price: number;
  stop_price: number | null;
  peak_price: number;
  peak_pct: number;
  peak_date: string;
  days_to_peak: number;
  stop_hit_date: string | null;
  peak_before_stop: boolean;
  is_big_name: boolean;
}

interface UseKaiWins {
  wins: KaiWin[];
  loading: boolean;
  error: string | null;
  cached: boolean;
  scanned: number | null;
}

export function useKaiWins(days = 60, limit = 50): UseKaiWins {
  const [wins, setWins] = useState<KaiWin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [scanned, setScanned] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const token = localStorage.getItem("sb-access-token");
    fetch(`${API_BASE}/kai/wins?days=${days}&limit=${limit}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((body) => {
        if (cancelled) return;
        setWins(body.data ?? []);
        setCached(!!body.cached);
        setScanned(body.scanned ?? null);
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
  }, [days, limit]);

  return { wins, loading, error, cached, scanned };
}
