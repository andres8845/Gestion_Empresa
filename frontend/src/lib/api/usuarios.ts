import "server-only";
import { redirect } from "next/navigation";
import { obtenerUsuarioActual } from "@/lib/session";
import { usuariosMock } from "@/lib/mock/usuarios";

// Solo lo que las pantallas necesitan saber del usuario.
// Nunca se manda la contraseña al navegador.
export type UsuarioSesion = {
  id: number;
  username: string;
};

// Devuelve el usuario que inició sesión. Si la sesión no es válida,
// manda al login.
export async function requerirUsuario(): Promise<UsuarioSesion> {
  const username = await obtenerUsuarioActual();

  // TODO: GET /auth/yo (el backend valida la sesión en Redis)
  const usuario = usuariosMock.find(
    (u) => u.username === username && u.is_active,
  );

  if (!usuario) {
    redirect("/login");
  }

  return { id: usuario.id, username: usuario.username };
}