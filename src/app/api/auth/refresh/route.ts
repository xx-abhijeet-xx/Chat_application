import { NextRequest, NextResponse } from "next/server";
import { verifyRefresh, signAccess } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const rt = req.cookies.get("refreshToken")?.value;
    if (!rt) return NextResponse.json({ success: false, error: "No refresh token" }, { status: 401 });
    const p = verifyRefresh(rt);
    const user = await prisma.user.findUnique({ where: { id: p.userId } });
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 401 });
    return NextResponse.json({ success: true, data: { accessToken: signAccess({ userId: user.id, username: user.username }) } });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
  }
}
