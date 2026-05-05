// useKaiTriggerEvents — initial fetch + Supabase Realtime subscription
// for the live triggers feed. New events stream in without a refresh.
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchTodayTriggers, fetchHistoryTriggers } from "@/lib/kai/queries";
import type { KaiTriggerEvent } from "@/lib/kai/types";

interface Options {
  /** "today" = since 00:00 local, "history" = last N days */
  scope?: "today" | "history";
  days?: number;
  /** Subscribe to realtime inserts (only meaningful for scope="today") */
  realtime?: boolean;
}

export interface UseKaiTriggerEvents {
  events: KaiTriggerEvent[];
  loading: boolean;
  error: string | null;
}

export function useKaiTriggerEvents(opts: Options = {}): UseKaiTriggerEvents {
  const { scope = "today", days = 7, realtime = scope === "today" } = opts;
  const [events, setEvents] = useState<KaiTriggerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const initial =
      scope === "today" ? fetchTodayTriggers() : fetchHistoryTriggers(days);
    initial
      .then((rows) => {
        if (!cancelled) setEvents(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    if (!realtime) {
      return () => {
        cancelled = true;
      };
    }

    // Subscribe to inserts on kai_trigger_events. The DB columns are the
    // live engine's shape (direction/fired_price/fired_type) — re-fetch on
    // INSERT so the mapping in queries.ts is the single source of truth.
    const channel = supabase
      .channel("kai-triggers")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "kai_trigger_events" },
        () => {
          const reload = scope === "today" ? fetchTodayTriggers() : fetchHistoryTriggers(days);
          reload.then((rows) => setEvents(rows)).catch(() => undefined);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [scope, days, realtime]);

  return { events, loading, error };
}
