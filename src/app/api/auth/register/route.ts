import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signAccess, signRefresh } from "@/lib/jwt";
import { randomColor } from "@/lib/utils";

const schema = z.object({
  username:    z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  email:       z.string().email(),
  password:    z.string().min(8),
  displayName: z.string().min(1).max(40).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const p = schema.safeParse(body);
    if (!p.success) return NextResponse.json({ success: false, error: "Validation failed", details: p.error.flatten() }, { status: 400 });

    const { username, email, password, displayName } = p.data;
    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
    if (existing) {
      const field = existing.email === email ? "email" : "username";
      return NextResponse.json({ success: false, error: `This ${field} is already taken` }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: { username, email, passwordHash: await hash(password, 12), displayName: displayName ?? username, avatarColor: randomColor() },
    });

    const payload = { userId: user.id, username: user.username };
    const res = NextResponse.json({ success: true, data: {
      accessToken: signAccess(payload),
      user: { id: user.id, username: user.username, displayName: user.displayName, avatarColor: user.avatarColor, avatarUrl: user.avatarUrl, bio: user.bio, role: user.role, location: user.location },
    }}, { status: 201 });

    res.cookies.set("refreshToken", signRefresh(payload), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 604800, path: "/" });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
