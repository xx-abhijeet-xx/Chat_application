"use client";
import { useState, useCallback, useEffect } from "react";
import type { ChatMessage } from "@/types";

export function useMessages(conversationId: string | null, token: string | null) {
  const [messages,   setMessages]   = useState<ChatMessage[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [hasMore,    setHasMore]    = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId || !token) { setMessages([]); return; }
    setLoading(true);
    fetch(`/api/messages?conversationId=${conversationId}&limit=50`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(res => { if (res.success) { setMessages(res.data.messages); setHasMore(res.data.hasMore); setNextCursor(res.data.nextCursor); } })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [conversationId, token]);

  const loadMore = useCallback(async () => {
    if (!conversationId || !token || !nextCursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/messages?conversationId=${conversationId}&cursor=${nextCursor}&limit=50`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) { setMessages(p => [...data.data.messages, ...p]); setHasMore(data.data.hasMore); setNextCursor(data.data.nextCursor); }
    } finally { setLoading(false); }
  }, [conversationId, token, nextCursor, loading]);

  const addMessage = useCallback((msg: ChatMessage) => setMessages(p => [...p, msg]), []);
  const markAllRead = useCallback(() => setMessages(p => p.map(m => ({ ...m, isRead: true }))), []);

  return { messages, loading, hasMore, loadMore, addMessage, markAllRead };
}
