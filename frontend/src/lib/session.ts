import "server-only";
import { cookies } from "next/headers";

// Nombre de la cookie que guarda la sesión del usuario.
export const SESSION_COOKIE = "md_session";

// RN-05: la sesión se cierra sola después de 30 minutos sin uso.
// El proxy renueva este tiempo en cada petición, así que solo vence
// si el usuario deja de usar el sistema.
export const SESSION_MAX_AGE = 30 * 60; // en segundos

export const sessionCookieOptions = {
  httpOnly: true, // el JavaScript del navegador no puede leerla
  sameSite: "lax" as const,
  secure: false, // el sistema corre en http://localhost dentro de la tienda
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

// Por ahora la cookie guarda el nombre de usuario.
// Cuando exista el backend, aquí se guardará el id de sesión que
// entregue Nest (y que vivirá en Redis).
export async function crearSesion(username: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, username, sessionCookieOptions);
}

export async function cerrarSesion() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function obtenerUsuarioActual(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}