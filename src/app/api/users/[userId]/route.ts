import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccess, bearerToken } from "@/lib/jwt";

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const token = bearerToken(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { userId: me } = verifyAccess(token);

    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true, username: true, displayName: true, avatarColor: true, avatarUrl: true, bio: true, role: true, location: true, createdAt: true },
    });
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    const friendReq = await prisma.friendRequest.findFirst({
      where: { OR: [{ senderId: me, receiverId: params.userId }, { senderId: params.userId, receiverId: me }] },
    });
    const friendship = await prisma.friendship.findFirst({
      where: { OR: [{ userAId: me, userBId: params.userId }, { userAId: params.userId, userBId: me }] },
    });

    let friendStatus: "none" | "pending_sent" | "pending_received" | "friends" = "none";
    if (friendship) friendStatus = "friends";
    else if (friendReq?.status === "PENDING") {
      friendStatus = friendReq.senderId === me ? "pending_sent" : "pending_received";
    }

    return NextResponse.json({ success: true, data: { ...user, friendStatus } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
