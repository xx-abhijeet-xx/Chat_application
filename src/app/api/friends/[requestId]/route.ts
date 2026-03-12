import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccess, bearerToken } from "@/lib/jwt";

// PATCH /api/friends/[requestId]  { action: "accept" | "reject" }
export async function PATCH(req: NextRequest, { params }: { params: { requestId: string } }) {
  try {
    const token = bearerToken(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const { userId } = verifyAccess(token);

    const { action } = await req.json();
    const request = await prisma.friendRequest.findUnique({ where: { id: params.requestId } });

    if (!request) return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
    if (request.receiverId !== userId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    if (request.status !== "PENDING") return NextResponse.json({ success: false, error: "Already handled" }, { status: 409 });

    if (action === "accept") {
      await prisma.$transaction([
        prisma.friendRequest.update({ where: { id: request.id }, data: { status: "ACCEPTED" } }),
        prisma.friendship.create({ data: { userAId: request.senderId, userBId: request.receiverId } }),
      ]);
      return NextResponse.json({ success: true, data: { action: "accepted", senderId: request.senderId } });
    } else {
      await prisma.friendRequest.update({ where: { id: request.id }, data: { status: "REJECTED" } });
      return NextResponse.json({ success: true, data: { action: "rejected" } });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
