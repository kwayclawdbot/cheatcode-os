/**
 * Watchlist tRPC router
 * Stores watchlist as a JSON array in the user's profile row.
 * Falls back to empty array for unauthenticated users.
 */
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getWatchlist, setWatchlist } from "../db";

export const watchlistRouter = router({
  /** Get the current user's watchlist */
  get: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return [] as string[];
    return getWatchlist(ctx.user.id);
  }),

  /** Add a symbol to the watchlist */
  add: protectedProcedure
    .input(z.object({ symbol: z.string().min(1).max(20).toUpperCase() }))
    .mutation(async ({ ctx, input }) => {
      const current = await getWatchlist(ctx.user.id);
      if (current.includes(input.symbol)) return { watchlist: current };
      const updated = [...current, input.symbol];
      await setWatchlist(ctx.user.id, updated);
      return { watchlist: updated };
    }),

  /** Remove a symbol from the watchlist */
  remove: protectedProcedure
    .input(z.object({ symbol: z.string().min(1).max(20).toUpperCase() }))
    .mutation(async ({ ctx, input }) => {
      const current = await getWatchlist(ctx.user.id);
      const updated = current.filter(s => s !== input.symbol);
      await setWatchlist(ctx.user.id, updated);
      return { watchlist: updated };
    }),

  /** Replace the entire watchlist */
  set: protectedProcedure
    .input(z.object({ symbols: z.array(z.string().min(1).max(20).toUpperCase()) }))
    .mutation(async ({ ctx, input }) => {
      await setWatchlist(ctx.user.id, input.symbols);
      return { watchlist: input.symbols };
    }),
});
