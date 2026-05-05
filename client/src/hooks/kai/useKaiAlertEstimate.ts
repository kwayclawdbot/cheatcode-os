// useKaiAlertEstimate — derive expected alerts/day from real firing rate.
// Reads kai_trigger_events over the last 30d (entitlement-gated by RLS),
// applies the user's tier filter + personal-pick adjustment, and returns
// a number rounded to the nearest integer.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { KaiAlertPrefs } from "@/lib/kai/types";

interface Args {
  prefs: KaiAlertPrefs | null;
  watchlistCount: number;
}

export function useKaiAlertEstimate({ prefs, watchlistCount }: Args): number | null {
  const [systemDailyRate, setSystemDailyRate] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const since = new Date();
    since.setDate(since.getDate() - 30);
    supabase
      .from("kai_trigger_events")
      .select("fired_at", { count: "exact", head: true })
      .gte("fired_at", since.toISOString())
      .then(({ count, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn("[kai] alert estimate count failed:", error.message);
          setSystemDailyRate(null);
          return;
        }
        const total = count ?? 0;
        // Trading days only — ~22 over 30 calendar days
        setSystemDailyRate(total / 22);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!prefs) return null;
  if (prefs.pause_all) return 0;

  // Tier filter: top5 ≈ ⅓ of fires (highest score), top10 ≈ ⅔, universe = all
  const tierShare =
    prefs.system_tier === "top5" ? 0.33
    : prefs.system_tier === "top10" ? 0.66
    : 1.0;

  const systemPart = systemDailyRate != null ? systemDailyRate * tierShare : 0;

  // Personal picks: ~3% of universe fires per day per ticker on watchlist
  const personalPart = prefs.personal_picks
    ? watchlistCount * 0.03 * (systemDailyRate ?? 1)
    : 0;

  return Math.round(systemPart + personalPart);
}
