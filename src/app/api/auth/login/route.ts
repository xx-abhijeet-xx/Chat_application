import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signAccess, signRefresh } from "@/lib/jwt";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const p = schema.safeParse(body);
    if (!p.success) return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });

    const { email, password } = p.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await compare(password, user.passwordHash)))
      return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 });

    const payload = { userId: user.id, username: user.username };
    const res = NextResponse.json({ success: true, data: {
      accessToken: signAccess(payload),
      user: { id: user.id, username: user.username, displayName: user.displayName, avatarColor: user.avatarColor, avatarUrl: user.avatarUrl, bio: user.bio, role: user.role, location: user.location },
    }});

    res.cookies.set("refreshToken", signRefresh(payload), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 604800, path: "/" });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
