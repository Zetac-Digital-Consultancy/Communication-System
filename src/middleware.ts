import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname === "/login";
  const isApiAuth = request.nextUrl.pathname.startsWith("/api/auth/login");
  const isPublic =
    isLoginPage ||
    isApiAuth ||
    request.nextUrl.pathname.startsWith("/uploads");

  try {
    const response = NextResponse.next();
    const session = await getIronSession<SessionData>(
      request,
      response,
      sessionOptions
    );

    if (!session.isLoggedIn && !isPublic) {
      if (request.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (session.isLoggedIn && isLoginPage) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return response;
  } catch {
    if (!isPublic) {
      if (request.nextUrl.pathname.startsWith("/api/")) {
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
