import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getChatHistory, saveChatMessage } from "../db";

export const chatRouter = router({
  // Get last 50 messages for a channel
  history: publicProcedure
    .input(z.object({ channelId: z.string().min(1).max(64) }))
    .query(async ({ input }) => {
      return getChatHistory(input.channelId, 50);
    }),

  // Send a message — persists to DB, Supabase Realtime broadcasts via DB trigger
  send: protectedProcedure
    .input(
      z.object({
        channelId: z.string().min(1).max(64),
        body: z.string().min(1).max(1000),
        username: z.string().min(1).max(64),
        avatarInitials: z.string().min(1).max(4),
        avatarColor: z.string().min(1).max(16),
        badge: z.string().max(32).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await saveChatMessage({
        channelId: input.channelId,
        userId: ctx.user.id,
        username: input.username,
        avatarInitials: input.avatarInitials,
        avatarColor: input.avatarColor,
        badge: input.badge ?? null,
        body: input.body,
      });
      return { ok: true };
    }),
});
