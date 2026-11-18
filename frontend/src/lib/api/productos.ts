import "server-only";
import { redirect } from "next/navigation";
import type { Producto } from "@/lib/mock/productos";
import { obtenerTokenSesion, SESSION_COOKIE } from "@/lib/session";

export type { Producto };

export class ErrorConsultaProductos extends Error {}

// La búsqueda en Cobro se hace sobre el catálogo activo de la petición.
export async function listarProductosActivos(): Promise<Producto[]> {
  const token = await obtenerTokenSesion();
  if (!token) redirect("/login");

  const apiUrl = process.env.API_URL ?? "http://localhost:3001";
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/productos?activos=true`, {
      headers: { Cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}` },
      cache: "no-store",
    });
  } catch (cause) {
    throw new ErrorConsultaProductos("No se pudo conectar con la API de productos.", { cause });
  }

  if (response.status === 401) redirect("/login");
  if (!response.ok) {
    throw new ErrorConsultaProductos(`La API de productos respondió con HTTP ${response.status}.`);
  }

  let result: { success?: boolean; data?: Producto[] } | null;
  try {
    result = await response.json();
  } catch (cause) {
    throw new ErrorConsultaProductos("La API de productos devolvió JSON inválido.", { cause });
  }

  if (result?.success !== true || !Array.isArray(result.data)) {
    throw new ErrorConsultaProductos("La API de productos devolvió una respuesta inválida.");
  }

  return result.data;
}
