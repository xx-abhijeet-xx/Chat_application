import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccess, bearerToken } from "@/lib/jwt";

// POST /api/friends/request  { receiverId }
export async function POST(req: NextRequest) {
  try {
    const token = bearerToken(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { userId } = verifyAccess(token);

    const { receiverId } = await req.json();
    if (!receiverId || receiverId === userId)
      return NextResponse.json({ success: false, error: "Invalid receiver" }, { status: 400 });

    // Already friends?
    const existing = await prisma.friendship.findFirst({
      where: { OR: [{ userAId: userId, userBId: receiverId }, { userAId: receiverId, userBId: userId }] },
    });
    if (existing) return NextResponse.json({ success: false, error: "Already friends" }, { status: 409 });

    // Already requested?
    const existingReq = await prisma.friendRequest.findFirst({
      where: { OR: [{ senderId: userId, receiverId }, { senderId: receiverId, receiverId: userId }] },
    });
    if (existingReq) return NextResponse.json({ success: false, error: "Request already exists" }, { status: 409 });

    const request = await prisma.friendRequest.create({
      data: { senderId: userId, receiverId },
      include: {
        sender:   { select: { id: true, username: true, displayName: true, avatarColor: true, avatarUrl: true, bio: true, role: true, location: true } },
        receiver: { select: { id: true, username: true, displayName: true, avatarColor: true, avatarUrl: true, bio: true, role: true, location: true } },
      },
    });

    return NextResponse.json({ success: true, data: request }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

// GET /api/friends/request — get incoming pending requests
export async function GET(req: NextRequest) {
  try {
    const token = bearerToken(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { userId } = verifyAccess(token);

    const requests = await prisma.friendRequest.findMany({
      where: { receiverId: userId, status: "PENDING" },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarColor: true, avatarUrl: true, bio: true, role: true, location: true } },
        receiver: { select: { id: true, username: true, displayName: true, avatarColor: true, avatarUrl: true, bio: true, role: true, location: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: requests });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
