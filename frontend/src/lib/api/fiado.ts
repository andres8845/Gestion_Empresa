import "server-only";
import { redirect } from "next/navigation";
import { obtenerTokenSesion, SESSION_COOKIE } from "@/lib/session";

export type AbonoFiado = {
  id: number;
  customerId: number;
  amount: number;
  paymentMethod: "efectivo" | "tarjeta";
  cashRegisterSessionId: number;
  userId: number;
  createdAt: Date;
};

export type ClienteFiado = {
  id: number;
  aliasName: string;
  balance: number;
  lastCreditAt: Date | null;
  lastMovementAt: Date | null;
  createdAt: Date;
  sugerirBorrar: boolean;
};

export type ClienteResumen = Pick<ClienteFiado, "id" | "aliasName" | "balance">;
type ClienteApi = Omit<ClienteFiado, "lastCreditAt" | "lastMovementAt" | "createdAt" | "sugerirBorrar"> & {
  lastCreditAt: string | null;
  lastMovementAt: string | null;
  createdAt: string;
};
export type Resultado = { ok: true } | { ok: false; error: string };
class ErrorApiFiado extends Error {}

async function consultar<T>(ruta: string, options: RequestInit = {}): Promise<T> {
  const token = await obtenerTokenSesion();
  if (!token) redirect("/login");
  let response: Response;
  try {
    response = await fetch(`${process.env.API_URL ?? "http://localhost:3001"}/fiado${ruta}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
      },
      cache: "no-store",
    });
  } catch {
    throw new ErrorApiFiado("No se pudo confirmar la operación. Actualice Fiado antes de reintentar.");
  }
  if (response.status === 401) redirect("/login");
  const result = await response.json().catch(() => null) as {
    success?: boolean; data: T; message?: string | string[];
  } | null;
  if (!response.ok || result?.success !== true) {
    const message = result?.message;
    throw new ErrorApiFiado(Array.isArray(message) ? message.join(". ") : message ?? "No se pudo consultar la API de fiado.");
  }
  return result.data;
}

export async function listarClientes(): Promise<ClienteFiado[]> {
  const clientes = await consultar<ClienteApi[]>("/clientes");
  if (!Array.isArray(clientes)) throw new Error("Respuesta de clientes inválida.");
  const limite = Date.now() - 90 * 86_400_000;
  return clientes.map((cliente) => {
    const createdAt = new Date(cliente.createdAt);
    const lastMovementAt = cliente.lastMovementAt ? new Date(cliente.lastMovementAt) : null;
    return {
      ...cliente,
      createdAt,
      lastCreditAt: cliente.lastCreditAt ? new Date(cliente.lastCreditAt) : null,
      lastMovementAt,
      sugerirBorrar: cliente.balance === 0 && (lastMovementAt ?? createdAt).getTime() < limite,
    };
  });
}

export async function listarClientesFiado(): Promise<ClienteResumen[]> {
  return (await listarClientes())
    .map(({ id, aliasName, balance }) => ({ id, aliasName, balance }))
    .sort((a, b) => a.aliasName.localeCompare(b.aliasName, "es"));
}

export async function listarAbonos(): Promise<Record<number, AbonoFiado[]>> {
  const abonos = await consultar<(Omit<AbonoFiado, "createdAt"> & { createdAt: string })[]>("/abonos");
  if (!Array.isArray(abonos)) throw new Error("Respuesta de abonos inválida.");
  const porCliente: Record<number, AbonoFiado[]> = {};
  for (const abono of abonos) {
    (porCliente[abono.customerId] ??= []).push({ ...abono, createdAt: new Date(abono.createdAt) });
  }
  return porCliente;
}

export async function listarAbonosCaja() {
  type AbonoCaja = Pick<AbonoFiado, "cashRegisterSessionId" | "paymentMethod" | "amount"> & { createdAt: string };
  const abonos = await consultar<AbonoCaja[]>("/abonos/caja");
  if (!Array.isArray(abonos)) throw new Error("Respuesta de abonos inválida.");
  return abonos.map((abono) => ({ ...abono, createdAt: new Date(abono.createdAt) }));
}

export async function registrarAbono(
  customerId: number,
  monto: number,
  metodo: "efectivo" | "tarjeta",
): Promise<Resultado> {
  try {
    await consultar(`/clientes/${customerId}/abonos`, {
      method: "POST", body: JSON.stringify({ amount: monto, paymentMethod: metodo }),
    });
    return { ok: true };
  } catch (error) {
    if (!(error instanceof ErrorApiFiado)) throw error;
    return { ok: false, error: error.message };
  }
}

export async function eliminarCliente(customerId: number): Promise<Resultado> {
  try {
    await consultar(`/clientes/${customerId}`, { method: "DELETE" });
    return { ok: true };
  } catch (error) {
    if (!(error instanceof ErrorApiFiado)) throw error;
    return { ok: false, error: error.message };
  }
}
