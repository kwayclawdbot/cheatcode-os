import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";

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
 * Real-time video comments hook backed by:
 * 1. tRPC `videoComments.list` for initial load
 * 2. Supabase Realtime Broadcast for instant delivery of new comments
 * 3. tRPC `videoComments.post` for persisting to DB
 */
export function useVideoComments(videoId: string) {
  const [comments, setComments] = useState<VideoCommentMsg[]>([]);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load history via tRPC
  const { data: history, isLoading } = trpc.videoComments.list.useQuery(
    { videoId },
    { enabled: !!videoId, staleTime: 0 }
  );

  useEffect(() => {
    if (history) {
      setComments(history as VideoCommentMsg[]);
    }
  }, [history]);

  // Subscribe to Supabase Realtime broadcast for this video's comments
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

  // Post mutation
  const postMutation = trpc.videoComments.post.useMutation();
  const likeMutation = trpc.videoComments.like.useMutation();
  const deleteMutation = trpc.videoComments.delete.useMutation();

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
        id: Date.now(), // temporary id
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
      // Broadcast immediately
      channelRef.current.send({
        type: "broadcast",
        event: "comment",
        payload: optimistic,
      });
      // Persist to DB
      postMutation.mutate({
        videoId,
        body: params.body,
        replyToId: params.replyToId,
      });
    },
    [videoId, postMutation]
  );

  const likeComment = useCallback(
    (commentId: number) => {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, likeCount: c.likeCount + 1 } : c
        )
      );
      likeMutation.mutate({ commentId });
    },
    [likeMutation]
  );

  const deleteComment = useCallback(
    (commentId: number) => {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      deleteMutation.mutate({ commentId });
    },
    [deleteMutation]
  );

  return {
    comments,
    connected,
    isLoading,
    postComment,
    likeComment,
    deleteComment,
    isPosting: postMutation.isPending,
  };
}
