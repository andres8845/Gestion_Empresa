import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Debe coincidir con src/lib/session.ts
const SESSION_COOKIE = "md_session";
const SESSION_MAX_AGE = 30 * 60;

// RN-64: nadie puede usar el sistema sin iniciar sesión.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sesion = request.cookies.get(SESSION_COOKIE)?.value;
  const enLogin = pathname === "/login";

  // Sin sesión: todo manda al login.
  if (!sesion && !enLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Con sesión: no tiene sentido volver a ver el login.
  if (sesion && enLogin) {
    return NextResponse.redirect(new URL("/cobro", request.url));
  }

  const response = NextResponse.next();

  // RN-05: cada vez que el usuario usa el sistema, se reinician los
  // 30 minutos. Si no lo usa, la cookie vence sola.
  if (sesion) {
    response.cookies.set(SESSION_COOKIE, sesion, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  }

  return response;
}

export const config = {
  // No pasa por el proxy: archivos internos de Next, imágenes y el favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};