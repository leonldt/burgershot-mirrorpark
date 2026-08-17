import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

/**
 * Edge-Fast-Path: leitet unangemeldete Besucher geschützter Bereiche zum Login.
 * Die echte Autorisierung findet zusätzlich serverseitig in jeder Route/Aktion statt.
 */
const PROTECTED_PREFIXES = ["/pos", "/kitchen", "/me", "/admin"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/pos/:path*", "/kitchen/:path*", "/me/:path*", "/admin/:path*"],
};