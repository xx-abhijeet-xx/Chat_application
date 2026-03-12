"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { WSClientMsg, WSServerMsg } from "@/types";

type Status = "connecting" | "connected" | "disconnected";

export function useWebSocket(token: string | null, onMessage: (msg: WSServerMsg) => void) {
  const [status,  setStatus]  = useState<Status>("disconnected");
  const wsRef     = useRef<WebSocket | null>(null);
  const retries   = useRef(0);
  const retryRef  = useRef<ReturnType<typeof setTimeout>>();
  const onMsgRef  = useRef(onMessage);

  // Keep callback ref fresh without restarting the socket
  useEffect(() => { onMsgRef.current = onMessage; }, [onMessage]);

  const connect = useCallback(() => {
    if (!token || typeof window === "undefined") return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = `ws://localhost:3000/api/ws?token=${token}`;
    let ws: WebSocket;
    try { ws = new WebSocket(wsUrl); } catch { return; }

    wsRef.current = ws;
    setStatus("connecting");

    ws.onopen = () => {
      setStatus("connected");
      retries.current = 0;
      console.log("[WS] Connected");
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as WSServerMsg;
        onMsgRef.current(msg);
      } catch {}
    };

    ws.onerror = () => { /* handled by onclose */ };

    ws.onclose = (e) => {
      wsRef.current = null;
      setStatus("disconnected");
      console.log(`[WS] Closed (${e.code}) — retry #${retries.current + 1}`);
      // Exponential backoff: 1s, 2s, 4s … max 30s
      const delay = Math.min(1000 * Math.pow(2, retries.current), 30_000);
      retries.current++;
      retryRef.current = setTimeout(connect, delay);
    };
  }, [token]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(retryRef.current);
      wsRef.current?.close(1000, "unmount");
    };
  }, [connect]);

  const send = useCallback((msg: WSClientMsg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { status, send };
}
