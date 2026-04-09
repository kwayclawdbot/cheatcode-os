import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

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
 * Real-time chat channel hook backed by Supabase Realtime broadcast.
 *
 * Persistence (load-history + save-on-send) is intentionally not wired up
 * yet — the previous tRPC-based implementation pointed at a backend that
 * was never deployed. Until /api/v1/chat endpoints exist, chat is ephemeral:
 * messages broadcast in real time within an active session and disappear
 * on refresh. The UI consumers don't need to change — `messages` just
 * starts empty.
 */
export function useChatChannel(channelId: string) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Subscribe to Supabase Realtime broadcast for this channel
  useEffect(() => {
    if (!channelId) return;

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
        userId: 0,
        username: params.username,
        avatarInitials: params.avatarInitials,
        avatarColor: params.avatarColor,
        badge: params.badge,
        body: params.body,
        createdAt: new Date(),
      };

      channelRef.current.send({
        type: "broadcast",
        event: "message",
        payload: msg,
      });
    },
    [channelId]
  );

  return { messages, connected, isLoading: false, sendMessage };
}
