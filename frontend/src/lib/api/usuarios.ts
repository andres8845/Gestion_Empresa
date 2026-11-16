import "server-only";
import { redirect } from "next/navigation";
import { obtenerTokenSesion } from "@/lib/session";

export type UsuarioSesion = { id: number; username: string; isActive: boolean };

export async function requerirUsuario(): Promise<UsuarioSesion> {
  const token = await obtenerTokenSesion();
  if (!token) redirect("/login");
  try {
    const response = await fetch(`${process.env.API_URL ?? "http://localhost:3001"}/auth/yo`, {
      headers: { Cookie: `md_session=${encodeURIComponent(token)}` },
      cache: "no-store",
    });
    if (!response.ok) redirect("/login");
    const result = await response.json() as { data: UsuarioSesion };
    return result.data;
  } catch {
    redirect("/login");
  }
}
