import "server-only";
import { redirect } from "next/navigation";
import { cajaMock, type SesionCaja } from "@/lib/mock/caja";
import { requerirUsuario } from "@/lib/api/usuarios";
import { obtenerTokenSesion, SESSION_COOKIE } from "@/lib/session";

export type { SesionCaja };

type ApiCashSession = {
  id: number;
  userId: number;
  openedAt: string;
  closedAt: string | null;
  initialAmount: number;
  expectedAmount: number | null;
  actualAmount: number | null;
  difference: number | null;
  status: "abierta" | "cerrada";
};

function adaptarSesion(session: ApiCashSession): SesionCaja {
  return {
    id: session.id,
    user_id: session.userId,
    opened_at: new Date(session.openedAt),
    closed_at: session.closedAt ? new Date(session.closedAt) : null,
    initial_amount: session.initialAmount,
    expected_amount: session.expectedAmount,
    actual_amount: session.actualAmount,
    difference: session.difference,
    status: session.status,
  };
}

async function obtenerMensajeError(response: Response): Promise<string> {
  try {
    const result = await response.json();
    if (Array.isArray(result.message)) return result.message.join(", ");
    if (typeof result.message === "string") return result.message;
  } catch {
    // La respuesta no contiene JSON válido.
  }

  return `Error en la API de caja (HTTP ${response.status}).`;
}

async function obtenerCajaAbiertaApi(): Promise<SesionCaja | null> {
  const token = await obtenerTokenSesion();

  if (!token) redirect("/login");

  const apiUrl = process.env.API_URL ?? "http://localhost:3001";

  let response: Response;

  try {
    response = await fetch(`${apiUrl}/caja/abierta`, {
      headers: {
        Cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
      },
      cache: "no-store",
    });
  } catch (cause) {
    throw new Error("No se pudo conectar con la API de caja.", { cause });
  }

  if (response.status === 401) redirect("/login");

  if (!response.ok) {
    throw new Error(await obtenerMensajeError(response));
  }

  const result = await response.json() as {
    success: boolean;
    data: ApiCashSession | null;
  };

  if (result.success !== true) {
    throw new Error("La API devolvió una respuesta inválida.");
  }

  return result.data ? adaptarSesion(result.data) : null;
}

async function abrirCajaApi(
  montoInicial: number,
): Promise<SesionCaja> {
  const token = await obtenerTokenSesion();

  if (!token) redirect("/login");

  const apiUrl = process.env.API_URL ?? "http://localhost:3001";

  let response: Response;

  try {
    response = await fetch(`${apiUrl}/caja/abrir`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
      },
      body: JSON.stringify({
        initialAmount: montoInicial,
      }),
      cache: "no-store",
    });
  } catch (cause) {
    throw new Error("No se pudo conectar con la API de caja.", { cause });
  }

  if (response.status === 401) redirect("/login");

  if (!response.ok) {
    throw new Error(await obtenerMensajeError(response));
  }

  const result = await response.json() as {
    success: boolean;
    data: ApiCashSession;
  };

  if (result.success !== true || !result.data) {
    throw new Error("La API devolvió una respuesta inválida.");
  }

  return adaptarSesion(result.data);
}

// ---------- Cierre simulado ----------
// TODO: quitar cuando exista POST /caja/cerrar.
// Mientras tanto, una caja "cerrada" en el mock se trata como cerrada aquí,
// aunque en la base de datos siga abierta. Al abrir otra vez, se reutiliza
// esa misma sesión con un fondo y una hora de apertura nuevos.

export async function obtenerCajaAbierta(): Promise<SesionCaja | null> {
  const real = await obtenerCajaAbiertaApi();
  if (!real) return null;

  const tramo = cajaMock.tramos.get(real.id);
  if (!tramo) return real;
  if (tramo.estado === "cerrada") return null;

  return {
    ...real,
    user_id: tramo.userId,
    opened_at: tramo.openedAt,
    initial_amount: tramo.initialAmount,
  };
}

export async function abrirCaja(montoInicial: number): Promise<SesionCaja> {
  const real = await obtenerCajaAbiertaApi();
  const tramo = real ? cajaMock.tramos.get(real.id) : undefined;

  if (real && tramo?.estado === "cerrada") {
    const usuario = await requerirUsuario();
    cajaMock.tramos.set(real.id, {
      estado: "reabierta",
      openedAt: new Date(),
      initialAmount: montoInicial,
      userId: usuario.id,
    });
    return (await obtenerCajaAbierta())!;
  }

  return abrirCajaApi(montoInicial);
}