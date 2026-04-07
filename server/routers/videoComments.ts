import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  getVideoComments,
  saveVideoComment,
  getVideoCommentById,
  deleteVideoComment,
  likeVideoComment,
} from "../db";

export const videoCommentsRouter = router({
  // ── List comments for a video ──────────────────────────────────────────────
  list: publicProcedure
    .input(z.object({ videoId: z.string().min(1).max(128) }))
    .query(async ({ input }) => {
      return getVideoComments(input.videoId, 100);
    }),

  // ── Post a comment ─────────────────────────────────────────────────────────
  post: protectedProcedure
    .input(
      z.object({
        videoId: z.string().min(1).max(128),
        body: z.string().trim().min(1, "Comment cannot be empty").max(2000),
        replyToId: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;
      const displayName = user.name ?? user.email?.split("@")[0] ?? "Trader";

      // Deterministic avatar color from userId
      const COLORS = [
        "#12B76A", "#2E90FA", "#F79009", "#F04438",
        "#7C3AED", "#0EA5E9", "#E8193C", "#00AEEF",
        "#4DC820", "#D946EF", "#EC4899", "#14B8A6",
      ];
      const color = COLORS[user.id % COLORS.length];
      const initials = displayName
        .split(/\s+/)
        .map((w) => w[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase() || "??";

      const comment = await saveVideoComment({
        videoId: input.videoId,
        userId: user.id,
        username: displayName,
        avatarInitials: initials,
        avatarColor: color,
        body: input.body,
        replyToId: input.replyToId ?? null,
        likeCount: 0,
      });

      if (!comment) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to save comment" });
      }
      return comment;
    }),

  // ── Delete own comment (or admin can delete any) ───────────────────────────
  delete: protectedProcedure
    .input(z.object({ commentId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const comment = await getVideoCommentById(input.commentId);
      if (!comment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" });
      }
      // Only the comment owner or an admin can delete
      if (comment.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own comments" });
      }
      await deleteVideoComment(input.commentId);
      return { success: true };
    }),

  // ── Like a comment ─────────────────────────────────────────────────────────
  like: protectedProcedure
    .input(z.object({ commentId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const newCount = await likeVideoComment(input.commentId);
      return { likeCount: newCount };
    }),
});
