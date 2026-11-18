
import "server-only";
import { redirect } from "next/navigation";
import {obtenerTokenSesion, SESSION_COOKIE } from "@/lib/session";
import type { DatosPago } from "@/lib/cobro/pago";

export type DetalleVenta = {
  productId: number;
  productName: string;
  unitType: "unidad" | "libra";
  quantity: number;
  unitPrice: number;
  isvRate: number;
  subtotal: number;
};

export type PagoVenta = {
  paymentMethod: "efectivo" | "tarjeta" | "fiado";
  amount: number;
};

export type Venta = {
  id: number;
  invoiceNumber: string;
  cashRegisterSessionId: number;
  userId: number;
  username: string;
  total: number;
  cashReceived: number;
  changeGiven: number;
  status: "activa" | "anulada";
  voidReason: string | null;
  createdAt: Date;
  details: DetalleVenta[];
  payments: PagoVenta[];
};

export type NuevaVenta = {
  lineas: {
    productoId: number;
    cantidad: number;
  }[];
  edadVerificada: boolean;
  pago: DatosPago;
  cliente:
    | { tipo: "existente"; id: number }
    | { tipo: "nuevo"; alias: string }
    | null;
};

export type ResultadoVenta =
  | { ok: true; ventaId: number }
  | { ok: false; error: string };

type VentaApi = Omit<Venta, "createdAt"> & {
  createdAt: string;
};

type RespuestaApi<T> = {
  success: boolean;
  data: T;
  message?: string | string[];
};

const API_URL =
  process.env.API_URL ?? "http://localhost:3001";

async function obtenerHeaders(): Promise<HeadersInit> {
  const token = await obtenerTokenSesion();

  if (!token) redirect("/login");

  return {
    "Content-Type": "application/json",
    Cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
  };
}

function convertirVenta(venta: VentaApi): Venta {
  return {
    ...venta,
    createdAt: new Date(venta.createdAt),
  };
}

// POST /ventas
export async function registrarVenta(
  datos: NuevaVenta,
): Promise<ResultadoVenta> {
  const headers = await obtenerHeaders();

  let response: Response;

  try {
    response = await fetch(`${API_URL}/ventas`, {
      method: "POST",
      headers,
      body: JSON.stringify(datos),
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      error: "No se pudo obtener respuesta del servidor. Verifique el historial antes de reintentar.",
    };
  }

  if (response.status === 401) redirect("/login");

  const result: RespuestaApi<VentaApi> | null =
    await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    const mensaje = result?.message;

    return {
      ok: false,
      error: Array.isArray(mensaje)
        ? mensaje.join(". ")
        : mensaje ?? "No se pudo confirmar la venta. Verifique el historial.",
    };
  }

  return {
    ok: true,
    ventaId: result.data.id,
  };
}

// GET /ventas/:id
export async function obtenerVenta(
  id: number,
): Promise<Venta | null> {
  const headers = await obtenerHeaders();

  const response = await fetch(
    `${API_URL}/ventas/${id}`,
    {
      headers,
      cache: "no-store",
    },
  );

  if (response.status === 401) redirect("/login");
  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error("No se pudo consultar la venta.");
  }

  const result: RespuestaApi<VentaApi> =
    await response.json();

  if (!result.success || !result.data) {
    throw new Error("Respuesta de venta inválida.");
  }

  return convertirVenta(result.data);
}

// GET /ventas
export async function listarVentas(
  limit = 50,
): Promise<Venta[]> {
  const headers = await obtenerHeaders();

  const response = await fetch(
    `${API_URL}/ventas?limit=${limit}`,
    {
      headers,
      cache: "no-store",
    },
  );

  if (response.status === 401) redirect("/login");

  if (!response.ok) {
    throw new Error("No se pudo consultar el historial.");
  }

  const result: RespuestaApi<VentaApi[]> =
    await response.json();

  if (!result.success || !Array.isArray(result.data)) {
    throw new Error("Respuesta de ventas inválida.");
  }

  return result.data.map(convertirVenta);
}
