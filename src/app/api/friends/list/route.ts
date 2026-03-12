import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccess, bearerToken } from "@/lib/jwt";

// GET /api/friends/list — all friends of current user
export async function GET(req: NextRequest) {
  try {
    const token = bearerToken(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { userId } = verifyAccess(token);

    const friendships = await prisma.friendship.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      include: {
        userA: { select: { id: true, username: true, displayName: true, avatarColor: true, avatarUrl: true, bio: true, role: true, location: true } },
        userB: { select: { id: true, username: true, displayName: true, avatarColor: true, avatarUrl: true, bio: true, role: true, location: true } },
      },
    });

    const friends = friendships.map(f => ({
      ...(f.userAId === userId ? f.userB : f.userA),
      friendStatus: "friends" as const,
    }));

    return NextResponse.json({ success: true, data: friends });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
