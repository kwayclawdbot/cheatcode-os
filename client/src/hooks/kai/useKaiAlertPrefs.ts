// useKaiAlertPrefs — singleton row per user; upsert on change.
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchAlertPrefs, upsertAlertPrefs } from "@/lib/kai/queries";
import type { KaiAlertPrefs } from "@/lib/kai/types";
import { DEFAULT_ALERT_PREFS } from "@/lib/kai/types";

export interface UseKaiAlertPrefs {
  prefs: KaiAlertPrefs | null;
  loading: boolean;
  error: string | null;
  update: (patch: Partial<Omit<KaiAlertPrefs, "user_id" | "updated_at">>) => Promise<void>;
}

export function useKaiAlertPrefs(): UseKaiAlertPrefs {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<KaiAlertPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPrefs(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAlertPrefs(user.id)
      .then((p) => {
        if (!cancelled) setPrefs(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load prefs");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const update = useCallback(
    async (patch: Partial<Omit<KaiAlertPrefs, "user_id" | "updated_at">>) => {
      if (!user) return;
      const previous = prefs;
      // Optimistic merge
      setPrefs((p) =>
        p
          ? { ...p, ...patch, updated_at: new Date().toISOString() }
          : {
              user_id: user.id,
              ...DEFAULT_ALERT_PREFS,
              ...patch,
              updated_at: new Date().toISOString(),
            },
      );
      try {
        const real = await upsertAlertPrefs(user.id, patch);
        setPrefs(real);
      } catch (e) {
        setPrefs(previous); // rollback
        throw e;
      }
    },
    [user, prefs],
  );

  return { prefs, loading, error, update };
}
