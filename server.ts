// server.ts — Next.js + WebSocket custom server
// Redis is OPTIONAL — works fully without it using in-memory broadcast.
// Redis only needed when scaling to multiple server processes.

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

const dev  = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3000", 10);

// ── Prisma (shared instance) ──────────────────────────────────────────────────
const prisma = new PrismaClient();

// ── In-memory client registry ─────────────────────────────────────────────────
// userId → Set<WebSocket>  (supports multiple tabs per user)
const clients = new Map<string, Set<WebSocket>>();

const addClient    = (uid: string, ws: WebSocket) => { if (!clients.has(uid)) clients.set(uid, new Set()); clients.get(uid)!.add(ws); };
const removeClient = (uid: string, ws: WebSocket) => { clients.get(uid)?.delete(ws); if (!clients.get(uid)?.size) clients.delete(uid); };
const isOnline     = (uid: string) => (clients.get(uid)?.size ?? 0) > 0;

function sendTo(userId: string, payload: object) {
  const sockets = clients.get(userId);
  if (!sockets) return;
  const raw = JSON.stringify(payload);
  sockets.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(raw); });
}

function broadcastPresence(userId: string, status: "online" | "offline") {
  const payload = { type: "presence", userId, status };
  clients.forEach((_, uid) => { if (uid !== userId) sendTo(uid, payload); });
}

// ── Optional Redis pub/sub (for multi-process scaling) ────────────────────────
let redisPub: any = null;
let redisSub: any = null;

async function tryConnectRedis() {
  const url = process.env.REDIS_URL;
  if (!url) { console.log("[Redis] No REDIS_URL — using in-memory broadcast only"); return; }

  try {
    const Redis = (await import("ioredis")).default;
    const opts  = { maxRetriesPerRequest: 1, lazyConnect: true, enableReadyCheck: false, tls: url.startsWith("rediss://") ? {} : undefined };
    const pub   = new Redis(url, opts);
    const sub   = new Redis(url, opts);

    await Promise.all([pub.connect(), sub.connect()]);

    sub.on("message", (channel: string, raw: string) => {
      try {
        const { _targets, event } = JSON.parse(raw);
        (_targets as string[]).forEach((uid: string) => sendTo(uid, event));
      } catch {}
    });

    redisPub = pub;
    redisSub = sub;
    console.log("[Redis] Connected ✓");
  } catch (e: any) {
    console.log(`[Redis] Not available (${e.message}) — falling back to in-memory`);
  }
}

async function publish(channel: string, targets: string[], event: object) {
  if (redisPub && redisSub) {
    // Ensure subscribed
    const subscribed = (redisSub as any)._subscribedChannels ?? new Set();
    if (!subscribed.has(channel)) {
      await redisSub.subscribe(channel).catch(() => {});
      subscribed.add(channel);
      (redisSub as any)._subscribedChannels = subscribed;
    }
    await redisPub.publish(channel, JSON.stringify({ _targets: targets, event })).catch(() => {
      // Redis publish failed — fall back to in-memory
      targets.forEach(uid => sendTo(uid, event));
    });
  } else {
    // In-memory: directly send to connected clients on this process
    targets.forEach(uid => sendTo(uid, event));
  }
}

// ── Rate limiter (in-memory, resets every 60s) ────────────────────────────────
const rateLimits = new Map<string, { count: number; reset: number }>();
function checkRate(userId: string): boolean {
  const now = Date.now();
  const rl  = rateLimits.get(userId);
  if (!rl || now > rl.reset) { rateLimits.set(userId, { count: 1, reset: now + 60_000 }); return true; }
  if (rl.count >= 60) return false;
  rl.count++;
  return true;
}

// ── Message handler ───────────────────────────────────────────────────────────
async function handleMessage(userId: string, username: string, ws: WebSocket, msg: any) {
  switch (msg.type) {

    case "ping":
      ws.send(JSON.stringify({ type: "pong" }));
      break;

    case "join_conversation":
      // Nothing to do in-memory — all clients already receive via sendTo
      break;

    case "send_message": {
      const { conversationId, content, messageType = "TEXT", mediaUrl, mediaName, mediaSize } = msg;
      if (!conversationId || (!content?.trim() && !mediaUrl)) {
        ws.send(JSON.stringify({ type: "error", message: "Missing conversationId or content" }));
        break;
      }

      if (!checkRate(userId)) {
        ws.send(JSON.stringify({ type: "error", message: "Rate limit exceeded — slow down!" }));
        break;
      }

      try {
        const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
        if (!conv || (conv.userAId !== userId && conv.userBId !== userId)) {
          ws.send(JSON.stringify({ type: "error", message: "Not a participant of this conversation" }));
          break;
        }

        const [message] = await prisma.$transaction([
          prisma.message.create({
            data: { conversationId, senderId: userId, content: content?.trim() ?? null, messageType, mediaUrl: mediaUrl ?? null, mediaName: mediaName ?? null, mediaSize: mediaSize ?? null },
            include: { sender: { select: { id: true, username: true, displayName: true, avatarColor: true, avatarUrl: true } } },
          }),
          prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
        ]);

        const formatted = {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          content: message.content,
          messageType: message.messageType,
          mediaUrl: message.mediaUrl,
          mediaName: message.mediaName,
          mediaSize: message.mediaSize,
          isRead: message.isRead,
          createdAt: message.createdAt.toISOString(),
          sender: message.sender,
        };

        const targets = [conv.userAId, conv.userBId];
        await publish(`conv:${conversationId}`, targets, { type: "new_message", message: formatted });

      } catch (e: any) {
        console.error("[WS] send_message error:", e.message);
        ws.send(JSON.stringify({ type: "error", message: "Failed to save message" }));
      }
      break;
    }

    case "typing_start":
    case "typing_stop": {
      const { conversationId } = msg;
      if (!conversationId) break;
      try {
        const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
        if (!conv) break;
        const otherId = conv.userAId === userId ? conv.userBId : conv.userAId;
        sendTo(otherId, { type: "typing", conversationId, userId, username, isTyping: msg.type === "typing_start" });
      } catch {}
      break;
    }

    case "mark_read": {
      const { conversationId } = msg;
      if (!conversationId) break;
      try {
        await prisma.message.updateMany({
          where: { conversationId, senderId: { not: userId }, isRead: false },
          data: { isRead: true },
        });
        const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
        if (conv) {
          const otherId = conv.userAId === userId ? conv.userBId : conv.userAId;
          sendTo(otherId, { type: "message_read", conversationId, userId });
        }
      } catch {}
      break;
    }

    default:
      ws.send(JSON.stringify({ type: "error", message: `Unknown message type: ${msg.type}` }));
  }
}

// ── WebSocket server ──────────────────────────────────────────────────────────
function startWss(wss: WebSocketServer) {
  wss.on("connection", (ws: WebSocket, req) => {
    const { query } = parse(req.url ?? "", true);
    const token = query.token as string | undefined;

    if (!token) { ws.close(4001, "No token"); return; }

    let userId = "", username = "";
    try {
      const p = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { userId: string; username: string };
      userId   = p.userId;
      username = p.username;
    } catch {
      ws.close(4002, "Invalid token");
      return;
    }

    addClient(userId, ws);
    console.log(`[WS] +connected: ${username} (${userId}) | online: ${clients.size} users`);

    const onlineList = Array.from(clients.keys()).filter(id => id !== userId);
    ws.send(JSON.stringify({ type: "connected", userId, onlineUsers: onlineList }));
    broadcastPresence(userId, "online");

    // Heartbeat
    const pingTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, 25_000);

    ws.on("message", async raw => {
      try {
        const msg = JSON.parse(raw.toString());
        await handleMessage(userId, username, ws, msg);
      } catch (e: any) {
        console.error("[WS] Message parse error:", e.message);
        ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      }
    });

    ws.on("close", () => {
      clearInterval(pingTimer);
      removeClient(userId, ws);
      console.log(`[WS] -disconnected: ${username} | online: ${clients.size} users`);
      if (!isOnline(userId)) broadcastPresence(userId, "offline");
    });

    ws.on("error", err => console.error("[WS] Socket error:", err.message));
  });
}

// ── Boot ──────────────────────────────────────────────────────────────────────
async function main() {
  await tryConnectRedis();

  const app     = next({ dev, hostname: "localhost", port });
  const handler = app.getRequestHandler();
  await app.prepare();

  const httpServer = createServer((req, res) => handler(req, res, parse(req.url!, true)));
  const wss        = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req, socket, head) => {
    if (parse(req.url ?? "").pathname === "/api/ws") {
      wss.handleUpgrade(req, socket as any, head, ws => wss.emit("connection", ws, req));
    } else {
      socket.destroy();
    }
  });

  startWss(wss);

  httpServer.listen(port, () => {
    console.log(`\n🚀 NexChat ready at http://localhost:${port}`);
    console.log(`🔌 WebSocket at ws://localhost:${port}/api/ws`);
    console.log(`📦 Mode: ${dev ? "development" : "production"}`);
    console.log(redisPub ? "📡 Pub/sub: Redis" : "📡 Pub/sub: in-memory\n");
  });
}

main().catch(e => { console.error(e); process.exit(1); });
