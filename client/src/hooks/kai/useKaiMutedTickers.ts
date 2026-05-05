// useKaiMutedTickers — single source of truth for the mute set.
// Bell icon on watchlist + ticker detail page both read/write through this.
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchMutedTickers, muteTicker, unmuteTicker } from "@/lib/kai/queries";

export interface UseKaiMutedTickers {
  muted: string[];
  loading: boolean;
  isMuted: (ticker: string) => boolean;
  toggle: (ticker: string) => Promise<void>;
}

export function useKaiMutedTickers(): UseKaiMutedTickers {
  const { user } = useAuth();
  const [muted, setMuted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMuted([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchMutedTickers()
      .then((rows) => {
        if (!cancelled) setMuted(rows.map((t) => t.toUpperCase()));
      })
      .catch(() => {
        if (!cancelled) setMuted([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isMuted = useCallback(
    (ticker: string) => muted.includes(ticker.toUpperCase()),
    [muted],
  );

  const toggle = useCallback(
    async (ticker: string) => {
      if (!user) return;
      const upper = ticker.toUpperCase();
      const wasMuted = muted.includes(upper);
      // Optimistic
      setMuted((prev) =>
        wasMuted ? prev.filter((t) => t !== upper) : [...prev, upper],
      );
      try {
        if (wasMuted) {
          await unmuteTicker(upper);
        } else {
          await muteTicker(user.id, upper);
        }
      } catch (e) {
        // Rollback
        setMuted((prev) =>
          wasMuted ? [...prev, upper] : prev.filter((t) => t !== upper),
        );
        throw e;
      }
    },
    [user, muted],
  );

  return { muted, loading, isMuted, toggle };
}
