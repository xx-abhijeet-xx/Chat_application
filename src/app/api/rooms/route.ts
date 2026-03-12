import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccess, bearerToken } from "@/lib/jwt";

// GET /api/rooms — get all conversations for current user
export async function GET(req: NextRequest) {
  try {
    const token = bearerToken(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { userId } = verifyAccess(token);

    const convs = await prisma.conversation.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { id: true, username: true, displayName: true, avatarColor: true, avatarUrl: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Enrich with friend user info + unread count
    const enriched = await Promise.all(convs.map(async (c) => {
      const friendId = c.userAId === userId ? c.userBId : c.userAId;
      const friend   = await prisma.user.findUnique({
        where: { id: friendId },
        select: { id: true, username: true, displayName: true, avatarColor: true, avatarUrl: true, bio: true, role: true, location: true },
      });
      const unread = await prisma.message.count({
        where: { conversationId: c.id, senderId: { not: userId }, isRead: false },
      });
      return {
        id:          c.id,
        friend:      { ...friend, friendStatus: "friends" },
        lastMessage: c.messages[0] ? formatMsg(c.messages[0]) : null,
        unreadCount: unread,
        updatedAt:   c.updatedAt.toISOString(),
      };
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

// POST /api/rooms — create or get conversation with a friend { friendId }
export async function POST(req: NextRequest) {
  try {
    const token = bearerToken(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { userId } = verifyAccess(token);

    const { friendId } = await req.json();
    if (!friendId) return NextResponse.json({ success: false, error: "friendId required" }, { status: 400 });

    // Check they are actually friends
    const friendship = await prisma.friendship.findFirst({
      where: { OR: [{ userAId: userId, userBId: friendId }, { userAId: friendId, userBId: userId }] },
    });
    if (!friendship) return NextResponse.json({ success: false, error: "Not friends" }, { status: 403 });

    // Deterministic ordering so we don't create duplicates
    const [a, b] = [userId, friendId].sort();

    const conv = await prisma.conversation.upsert({
      where:  { userAId_userBId: { userAId: a, userBId: b } },
      create: { userAId: a, userBId: b },
      update: {},
    });

    return NextResponse.json({ success: true, data: { conversationId: conv.id } }, { status: 201 });
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
