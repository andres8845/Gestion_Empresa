import "server-only";
import { obtenerCajaAbierta, type SesionCaja } from "@/lib/api/caja";
import { listarVentas } from "@/lib/api/ventas";
import { fiadoMock } from "@/lib/mock/fiado";
import { cajaMock, type CierreCaja } from "@/lib/mock/caja";
import { redondear } from "@/lib/cobro/carrito";

export type { CierreCaja };

export type ResumenCaja = {
  caja: SesionCaja;
  ventas: number;
  ventasEfectivo: number;
  ventasTarjeta: number;
  ventasFiado: number;
  abonosEfectivo: number;
  abonosTarjeta: number;
  esperado: number;
};

// RN-37: esperado = fondo inicial + ventas en efectivo + abonos en efectivo.
// El monto "efectivo" de cada venta ya es lo que se quedó en la gaveta
// (lo recibido menos el cambio), así que el cambio no se vuelve a restar.
// TODO: lo ideal es que el backend lo calcule (en POST /caja/cerrar).
// Aquí se calcula con las últimas 100 ventas de GET /ventas.
export async function obtenerResumenCaja(): Promise<ResumenCaja | null> {
  const caja = await obtenerCajaAbierta();
  if (!caja) return null;

  const desde = caja.opened_at.getTime();
  const ventas = (await listarVentas(100)).filter(
    (v) =>
      v.cashRegisterSessionId === caja.id &&
      v.status === "activa" &&
      v.createdAt.getTime() >= desde,
  );

  const sumaPagos = (metodo: "efectivo" | "tarjeta" | "fiado") =>
    redondear(
      ventas.reduce(
        (s, v) => s + v.payments.filter((p) => p.paymentMethod === metodo).reduce((t, p) => t + p.amount, 0),
        0,
      ),
    );

  // Se usa la copia sin nombre, porque los abonos de un cliente borrado ya no existen.
  const abonos = fiadoMock.abonosEnCaja.filter(
    (a) => a.cashRegisterSessionId === caja.id && a.createdAt.getTime() >= desde,
  );
  const sumaAbonos = (metodo: "efectivo" | "tarjeta") =>
    redondear(abonos.filter((a) => a.paymentMethod === metodo).reduce((s, a) => s + a.amount, 0));

  const ventasEfectivo = sumaPagos("efectivo");
  const abonosEfectivo = sumaAbonos("efectivo");

  return {
    caja,
    ventas: ventas.length,
    ventasEfectivo,
    ventasTarjeta: sumaPagos("tarjeta"),
    ventasFiado: sumaPagos("fiado"),
    abonosEfectivo,
    abonosTarjeta: sumaAbonos("tarjeta"),
    esperado: redondear(caja.initial_amount + ventasEfectivo + abonosEfectivo),
  };
}

export async function obtenerUltimoCierre(): Promise<CierreCaja | null> {
  return cajaMock.cierres.at(-1) ?? null;
}

// TODO: POST /caja/cerrar  body: { actualAmount }
//   El backend calcula expected_amount y difference, guarda closed_at,
//   pone status = "cerrada" y responde con el cierre.
export async function cerrarCaja(
  contado: number,
  userId: number,
): Promise<{ ok: true; cierre: CierreCaja } | { ok: false; error: string }> {
  if (!(contado >= 0) || redondear(contado) !== contado) {
    return { ok: false, error: "Escriba el efectivo contado, con máximo dos decimales." };
  }

  const resumen = await obtenerResumenCaja();
  if (!resumen) return { ok: false, error: "La caja ya está cerrada." };

  const cierre: CierreCaja = {
    sessionId: resumen.caja.id,
    userId,
    openedAt: resumen.caja.opened_at,
    closedAt: new Date(),
    initialAmount: resumen.caja.initial_amount,
    expectedAmount: resumen.esperado,
    actualAmount: contado,
    difference: redondear(contado - resumen.esperado),
  };
  cajaMock.cierres.push(cierre);
  cajaMock.tramos.set(resumen.caja.id, { estado: "cerrada" });
  return { ok: true, cierre };
}