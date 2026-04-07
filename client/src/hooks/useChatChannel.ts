import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";

export type ChatMsg = {
  id?: number;
  channelId: string;
  userId: number;
  username: string;
  avatarInitials: string;
  avatarColor: string;
  badge?: string | null;
  body: string;
  createdAt: Date | string;
};

/**
 * Real-time chat channel hook backed by:
 * 1. tRPC `chat.history` for initial load of last 50 messages
 * 2. Supabase Realtime Broadcast for instant delivery of new messages
 * 3. tRPC `chat.send` for persisting messages to the DB
 */
export function useChatChannel(channelId: string) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load history via tRPC
  const { data: history, isLoading } = trpc.chat.history.useQuery(
    { channelId },
    { enabled: !!channelId, staleTime: 0 }
  );

  useEffect(() => {
    if (history) {
      setMessages(history as ChatMsg[]);
    }
  }, [history]);

  // Subscribe to Supabase Realtime broadcast for this channel
  useEffect(() => {
    if (!channelId) return;

    // Clean up previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const ch = supabase.channel(`chat:${channelId}`, {
      config: { broadcast: { self: true } },
    });

    ch.on("broadcast", { event: "message" }, (payload) => {
      const msg = payload.payload as ChatMsg;
      setMessages((prev) => {
        // Deduplicate by body + username + approximate time
        const isDuplicate = prev.some(
          (m) =>
            m.body === msg.body &&
            m.username === msg.username &&
            Math.abs(
              new Date(m.createdAt).getTime() - new Date(msg.createdAt).getTime()
            ) < 2000
        );
        if (isDuplicate) return prev;
        return [...prev, msg];
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
  }, [channelId]);

  // Send mutation
  const sendMutation = trpc.chat.send.useMutation();

  const sendMessage = useCallback(
    async (params: {
      body: string;
      username: string;
      avatarInitials: string;
      avatarColor: string;
      badge?: string;
    }) => {
      if (!params.body.trim() || !channelRef.current) return;

      const msg: ChatMsg = {
        channelId,
        userId: 0, // will be set server-side
        username: params.username,
        avatarInitials: params.avatarInitials,
        avatarColor: params.avatarColor,
        badge: params.badge,
        body: params.body,
        createdAt: new Date(),
      };

      // Broadcast immediately for real-time delivery
      channelRef.current.send({
        type: "broadcast",
        event: "message",
        payload: msg,
      });

      // Persist to DB (fire and forget)
      sendMutation.mutate({
        channelId,
        body: params.body,
        username: params.username,
        avatarInitials: params.avatarInitials,
        avatarColor: params.avatarColor,
        badge: params.badge,
      });
    },
    [channelId, sendMutation]
  );

  return { messages, connected, isLoading, sendMessage };
}
