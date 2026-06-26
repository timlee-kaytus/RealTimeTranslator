import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth/session";

const PUBLIC_FILE = /\.(.*)$/;

const publicPaths = new Set(["/login", "/api/auth/login", "/api/auth/logout"]);

function isPublicPath(pathname: string) {
  return (
    publicPaths.has(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname === "/favicon.ico" ||
    PUBLIC_FILE.test(pathname)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = await verifyAuthToken(token);

  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isPublicPath(pathname) && !isAuthenticated) {
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/login", request.url));
    }

    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
