import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccess, bearerToken } from "@/lib/jwt";
import { checkRate } from "@/lib/rateLimit";
import { publisher, K } from "@/lib/redis";

// GET /api/messages?conversationId=&cursor=&limit=
export async function GET(req: NextRequest) {
  try {
    const token = bearerToken(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    verifyAccess(token);

    const s  = req.nextUrl.searchParams;
    const convId = s.get("conversationId");
    const cursor = s.get("cursor");
    const limit  = Math.min(Number(s.get("limit") ?? 50), 100);
    if (!convId) return NextResponse.json({ success: false, error: "conversationId required" }, { status: 400 });

    const messages = await prisma.message.findMany({
      where: { conversationId: convId },
      include: { sender: { select: { id: true, username: true, displayName: true, avatarColor: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore    = messages.length > limit;
    const items      = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return NextResponse.json({ success: true, data: { messages: items.reverse().map(formatMsg), nextCursor, hasMore } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}

// POST /api/messages — send message (HTTP fallback, also used for media)
export async function POST(req: NextRequest) {
  try {
    const token = bearerToken(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { userId } = verifyAccess(token);

    const allowed = await checkRate(userId);
    if (!allowed) return NextResponse.json({ success: false, error: "Rate limit exceeded" }, { status: 429 });

    const body = await req.json();
    const { conversationId, content, messageType = "TEXT", mediaUrl, mediaName, mediaSize } = body;
    if (!conversationId) return NextResponse.json({ success: false, error: "conversationId required" }, { status: 400 });
    if (!content && !mediaUrl) return NextResponse.json({ success: false, error: "content or mediaUrl required" }, { status: 400 });

    // Verify user is part of conversation
    const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv || (conv.userAId !== userId && conv.userBId !== userId))
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: { conversationId, senderId: userId, content: content?.trim() ?? null, messageType, mediaUrl, mediaName, mediaSize },
        include: { sender: { select: { id: true, username: true, displayName: true, avatarColor: true, avatarUrl: true } } },
      }),
      prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
    ]);

    const formatted = formatMsg(message);
    // Publish to Redis for WS broadcast
    await publisher.publish(K.conv(conversationId), JSON.stringify({ type: "new_message", message: formatted })).catch(() => {});

    return NextResponse.json({ success: true, data: formatted }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

function formatMsg(m: any) {
  return {
    id: m.id, conversationId: m.conversationId, senderId: m.senderId,
    content: m.content, messageType: m.messageType,
    mediaUrl: m.mediaUrl, mediaName: m.mediaName, mediaSize: m.mediaSize,
    isRead: m.isRead, createdAt: m.createdAt.toISOString(),
    sender: m.sender,
  };
}
