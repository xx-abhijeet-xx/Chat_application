import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("accessToken")?.value;

  if (pathname.startsWith("/chat")) {
    if (!token) return NextResponse.redirect(new URL("/login", req.url));
    return NextResponse.next();
  }
  if (pathname === "/login" || pathname === "/register") {
    if (token) return NextResponse.redirect(new URL("/chat", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/chat/:path*", "/login", "/register"] };
