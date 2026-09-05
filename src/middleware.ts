import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";

export async function middleware(request: NextRequest) {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const expectedOrigin = process.env.APP_URL ? new URL(process.env.APP_URL).origin : request.nextUrl.origin;
    if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== expectedOrigin)) {
      return NextResponse.json({ error: "Unzulässiger Ursprung" }, { status: 403 });
    }
  }
  const isLoginPage = request.nextUrl.pathname === "/login";
  const isApiAuth = request.nextUrl.pathname === "/api/auth/login";
  const isPublic =
    isLoginPage || request.nextUrl.pathname === "/support" ||
    isApiAuth;

  try {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    const session = await getIronSession<SessionData>(
      request,
      response,
      sessionOptions
    );

    if (!session.isLoggedIn && !isPublic) {
      if (request.nextUrl.pathname.startsWith("/api/") || request.nextUrl.pathname.startsWith("/uploads/")) {
        return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return response;
  } catch {
    if (!isPublic) {
      if (request.nextUrl.pathname.startsWith("/api/") || request.nextUrl.pathname.startsWith("/uploads/")) {
        return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
