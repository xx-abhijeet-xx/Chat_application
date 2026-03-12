import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccess, bearerToken } from "@/lib/jwt";

// GET /api/users/search?q=username
export async function GET(req: NextRequest) {
  try {
    const token = bearerToken(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { userId } = verifyAccess(token);

    const q = req.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 2) return NextResponse.json({ success: true, data: [] });

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userId } },
          {
            OR: [
              { username:    { contains: q, mode: "insensitive" } },
              { displayName: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: { id: true, username: true, displayName: true, avatarColor: true, avatarUrl: true, bio: true, role: true, location: true },
      take: 20,
    });

    // Enrich with friend status
    const enriched = await Promise.all(users.map(async (u) => {
      const req1 = await prisma.friendRequest.findFirst({
        where: { OR: [{ senderId: userId, receiverId: u.id }, { senderId: u.id, receiverId: userId }] },
      });
      const friendship = await prisma.friendship.findFirst({
        where: { OR: [{ userAId: userId, userBId: u.id }, { userAId: u.id, userBId: userId }] },
      });

      let friendStatus: "none" | "pending_sent" | "pending_received" | "friends" = "none";
      if (friendship) friendStatus = "friends";
      else if (req1?.status === "PENDING") {
        friendStatus = req1.senderId === userId ? "pending_sent" : "pending_received";
      }

      return { ...u, friendStatus };
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
