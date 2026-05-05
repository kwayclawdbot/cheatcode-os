// useKaiWeeklyUniverse — broader weekly watch tier (Kai/Weekly/current.json).
// Updated by kai_swing_weekly_scan.py. Daily picks are distilled from this.
import { useEffect, useState } from "react";
import { fetchWeeklyUniverse } from "@/lib/kai/queries";
import type { KaiWeeklyUniverse } from "@/lib/kai/types";

export function useKaiWeeklyUniverse(): KaiWeeklyUniverse & {
  loading: boolean;
  error: string | null;
} {
  const [state, setState] = useState<KaiWeeklyUniverse>({
    picks: [],
    updated_at: null,
    age_hours: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchWeeklyUniverse()
      .then((res) => {
        if (!cancelled) setState(res);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...state, loading, error };
}
