import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "md_session";
const SESSION_MAX_AGE = 30 * 60;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const enLogin = pathname === "/login";
  let sessionValid = false;

  if (token) {
    try {
      const response = await fetch(`${process.env.API_URL ?? "http://localhost:3001"}/auth/yo`, {
        headers: { Cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}` },
        cache: "no-store",
      });
      sessionValid = response.ok;
    } catch {
      sessionValid = false;
    }
  }

  if (!sessionValid && !enLogin) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    if (token) response.cookies.delete(SESSION_COOKIE);
    response.headers.set("Cache-Control", "no-store, private");
    return response;
  }
  if (sessionValid && enLogin) return NextResponse.redirect(new URL("/cobro", request.url));

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store, private");
  if (sessionValid && token) {
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  } else if (token) {
    response.cookies.delete(SESSION_COOKIE);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
