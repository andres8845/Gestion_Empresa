import "server-only";
import { redirect } from "next/navigation";
import { obtenerTokenSesion, SESSION_COOKIE } from "@/lib/session";
import { fiadoMock, type AbonoFiado } from "@/lib/mock/fiado";
import { obtenerCajaAbierta } from "@/lib/api/caja";
import { redondear } from "@/lib/cobro/carrito";

export type { AbonoFiado };

const API_URL = process.env.API_URL ?? "http://localhost:3001";

// RN-47: con saldo cero y sin movimientos en 90 días se sugiere borrarlo.
const DIAS_SIN_MOVIMIENTO = 90;

export type ClienteFiado = {
  id: number;
  aliasName: string;
  balance: number;
  lastCreditAt: Date | null;
  lastMovementAt: Date | null;
  createdAt: Date;
  sugerirBorrar: boolean;
};

// Solo lo que la pantalla de cobro necesita para elegir a quién fiar.
export type ClienteResumen = {
  id: number;
  aliasName: string;
  balance: number;
};

type ClienteApi = {
  id: number;
  aliasName: string;
  balance: number;
  lastCreditAt: string | null;
  lastMovementAt: string | null;
  createdAt: string;
};

export type Resultado = { ok: true } | { ok: false; error: string };

// ---------- Lectura ----------

// GET /fiado/clientes, con los abonos y borrados simulados aplicados encima.
export async function listarClientes(): Promise<ClienteFiado[]> {
  const token = await obtenerTokenSesion();
  if (!token) redirect("/login");

  const response = await fetch(`${API_URL}/fiado/clientes`, {
    headers: { Cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}` },
    cache: "no-store",
  });
  if (response.status === 401) redirect("/login");
  if (!response.ok) {
    throw new Error(`La API de fiado respondió con HTTP ${response.status}.`);
  }

  const result = (await response.json()) as { success?: boolean; data?: ClienteApi[] };
  if (result.success !== true || !Array.isArray(result.data)) {
    throw new Error("La API de fiado devolvió una respuesta inválida.");
  }

  const limite = Date.now() - DIAS_SIN_MOVIMIENTO * 86_400_000;

  return result.data
    .filter((c) => !fiadoMock.eliminados.has(c.id))
    .map((c) => {
      const abonos = fiadoMock.abonos.filter((a) => a.customerId === c.id);
      const abonado = abonos.reduce((s, a) => s + a.amount, 0);
      const ultimoAbono = abonos.at(-1)?.createdAt ?? null;
      const movimientoApi = c.lastMovementAt ? new Date(c.lastMovementAt) : null;
      const lastMovementAt =
        ultimoAbono && (!movimientoApi || ultimoAbono > movimientoApi) ? ultimoAbono : movimientoApi;
      const balance = Math.max(0, redondear(c.balance - abonado));

      return {
        id: c.id,
        aliasName: c.aliasName,
        balance,
        lastCreditAt: c.lastCreditAt ? new Date(c.lastCreditAt) : null,
        lastMovementAt,
        createdAt: new Date(c.createdAt),
        sugerirBorrar:
          balance === 0 && (lastMovementAt ?? new Date(c.createdAt)).getTime() < limite,
      };
    });
}

export async function listarClientesFiado(): Promise<ClienteResumen[]> {
  const clientes = await listarClientes();
  return clientes
    .map(({ id, aliasName, balance }) => ({ id, aliasName, balance }))
    .sort((a, b) => a.aliasName.localeCompare(b.aliasName, "es"));
}

// Abonos de cada cliente, del más reciente al más viejo.
export async function listarAbonos(): Promise<Record<number, AbonoFiado[]>> {
  const porCliente: Record<number, AbonoFiado[]> = {};
  for (const abono of [...fiadoMock.abonos].reverse()) {
    (porCliente[abono.customerId] ??= []).push(abono);
  }
  return porCliente;
}

// ---------- Escritura (simulada) ----------

// RN-43: abonos parciales, mayores a cero y sin pasar el saldo.
// TODO: POST /fiado/clientes/:id/abonos  body: { amount, paymentMethod }
//   Guarda en credit_payments con la caja abierta y el usuario, resta el
//   saldo y actualiza lastMovementAt, todo en una transacción.
export async function registrarAbono(
  customerId: number,
  monto: number,
  metodo: "efectivo" | "tarjeta",
  userId: number,
): Promise<Resultado> {
  const cliente = (await listarClientes()).find((c) => c.id === customerId);
  if (!cliente) return { ok: false, error: "El cliente ya no existe." };
  if (!(monto > 0) || redondear(monto) !== monto) {
    return { ok: false, error: "El abono debe ser mayor a cero, con máximo dos decimales." };
  }
  if (monto > cliente.balance) {
    return { ok: false, error: `El abono no puede pasar del saldo (L ${cliente.balance.toFixed(2)}).` };
  }

  // El efectivo entra a la gaveta, así que necesita una caja abierta (RN-37).
  const caja = await obtenerCajaAbierta();
  if (metodo === "efectivo" && !caja) {
    return { ok: false, error: "Abra la caja antes de recibir un abono en efectivo." };
  }

  const ahora = new Date();
  fiadoMock.abonos.push({
    id: fiadoMock.abonos.length + 1,
    customerId,
    amount: monto,
    paymentMethod: metodo,
    cashRegisterSessionId: caja?.id ?? null,
    userId,
    createdAt: ahora,
  });
  fiadoMock.abonosEnCaja.push({
    amount: monto,
    paymentMethod: metodo,
    cashRegisterSessionId: caja?.id ?? null,
    createdAt: ahora,
  });
  return { ok: true };
}

// RN-45 y RN-46: solo se borra con saldo cero, y se borra todo su registro.
// TODO: DELETE /fiado/clientes/:id
//   Borra el cliente con sus credit_charges y credit_payments (en cascada).
//   Las ventas quedan sin nombre. audit_logs guarda la acción SIN el nombre (RN-48).
export async function eliminarCliente(customerId: number): Promise<Resultado> {
  const cliente = (await listarClientes()).find((c) => c.id === customerId);
  if (!cliente) return { ok: false, error: "El cliente ya no existe." };
  if (cliente.balance > 0) {
    return { ok: false, error: "No se puede borrar un cliente que todavía debe." };
  }

  fiadoMock.eliminados.add(customerId);
  fiadoMock.abonos = fiadoMock.abonos.filter((a) => a.customerId !== customerId);
  return { ok: true };
}