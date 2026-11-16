import "server-only";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "md_session";
export const SESSION_MAX_AGE = 30 * 60;

export async function crearSesion(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function cerrarSesion() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function obtenerTokenSesion(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}
