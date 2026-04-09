import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type VideoCommentMsg = {
  id: number;
  videoId: string;
  userId: number;
  username: string;
  avatarInitials: string;
  avatarColor: string;
  body: string;
  replyToId: number | null;
  likeCount: number;
  createdAt: Date | string;
};

/**
 * Real-time video-comments hook backed by Supabase Realtime broadcast.
 *
 * Persistence (load history + post/like/delete via DB) is not yet wired —
 * the previous tRPC implementation pointed at a backend that was never
 * deployed. Until /api/v1/videos/{id}/comments endpoints exist, comments
 * are ephemeral within a session and disappear on refresh.
 */
export function useVideoComments(videoId: string) {
  const [comments, setComments] = useState<VideoCommentMsg[]>([]);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!videoId) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    const ch = supabase.channel(`video-comments:${videoId}`, {
      config: { broadcast: { self: true } },
    });
    ch.on("broadcast", { event: "comment" }, (payload) => {
      const comment = payload.payload as VideoCommentMsg;
      setComments((prev) => {
        const isDuplicate = prev.some(
          (c) =>
            c.body === comment.body &&
            c.username === comment.username &&
            Math.abs(
              new Date(c.createdAt).getTime() - new Date(comment.createdAt).getTime()
            ) < 2000
        );
        if (isDuplicate) return prev;
        return [...prev, comment];
      });
    });
    ch.subscribe((status) => {
      setConnected(status === "SUBSCRIBED");
    });
    channelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
      setConnected(false);
    };
  }, [videoId]);

  const postComment = useCallback(
    async (params: {
      body: string;
      username: string;
      avatarInitials: string;
      avatarColor: string;
      replyToId?: number;
    }) => {
      if (!params.body.trim() || !channelRef.current) return;
      const optimistic: VideoCommentMsg = {
        id: Date.now(),
        videoId,
        userId: 0,
        username: params.username,
        avatarInitials: params.avatarInitials,
        avatarColor: params.avatarColor,
        body: params.body,
        replyToId: params.replyToId ?? null,
        likeCount: 0,
        createdAt: new Date(),
      };
      channelRef.current.send({
        type: "broadcast",
        event: "comment",
        payload: optimistic,
      });
    },
    [videoId]
  );

  const likeComment = useCallback((commentId: number) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, likeCount: c.likeCount + 1 } : c
      )
    );
  }, []);

  const deleteComment = useCallback((commentId: number) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }, []);

  return {
    comments,
    connected,
    isLoading: false,
    postComment,
    likeComment,
    deleteComment,
    isPosting: false,
  };
}
