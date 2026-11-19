import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { obtenerResumenCaja, obtenerUltimoCierre, type CierreCaja } from "@/lib/api/cierre";
import { formatearFechaHora, formatearHora, formatearLempiras } from "@/lib/formato";
import { CerrarCajaForm } from "./cerrar-caja-form";

export const metadata: Metadata = {
  title: "Cerrar caja | Mercadito Daniela",
};

// RN-37: al cerrar se cuenta el efectivo y se compara con lo esperado.
export default function CerrarCajaPage() {
  return (
    <main className="flex flex-1 justify-center bg-fondo p-8">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold">Cerrar caja</h1>
        <p className="mt-1 mb-6 text-texto-suave">
          Cuente el efectivo de la gaveta para cuadrar el día.
        </p>
        <Suspense fallback={<p className="text-texto-suave">Calculando...</p>}>
          <Contenido />
        </Suspense>
      </div>
    </main>
  );
}

async function Contenido() {
  const resumen = await obtenerResumenCaja();

  // Caja cerrada: se muestra el último cierre.
  if (!resumen) {
    const cierre = await obtenerUltimoCierre();
    return <CajaCerrada cierre={cierre} />;
  }

  const { caja } = resumen;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-texto-suave">
        Caja abierta desde las {formatearHora(caja.opened_at)} · {resumen.ventas}{" "}
        {resumen.ventas === 1 ? "venta" : "ventas"}
      </p>

      <div className="rounded-2xl border border-borde bg-white p-6">
        <p className="mb-3 font-semibold">Efectivo que debería haber</p>
        <dl className="flex flex-col gap-2">
          <Fila etiqueta="Fondo inicial" valor={caja.initial_amount} />
          <Fila etiqueta="Ventas en efectivo" valor={resumen.ventasEfectivo} signo="+" />
          <Fila etiqueta="Abonos de fiado en efectivo" valor={resumen.abonosEfectivo} signo="+" />
          <div className="mt-1 flex justify-between border-t border-borde pt-3 text-lg font-bold">
            <dt>Esperado en gaveta</dt>
            <dd className="tabular-nums">{formatearLempiras(resumen.esperado)}</dd>
          </div>
        </dl>

        <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
          <Dato titulo="Ventas con tarjeta" valor={resumen.ventasTarjeta} />
          <Dato titulo="Abonos con tarjeta" valor={resumen.abonosTarjeta} />
          <Dato titulo="Fiado del día" valor={resumen.ventasFiado} />
        </div>
        <p className="mt-2 text-xs text-texto-suave">
          Tarjeta y fiado no entran a la gaveta, por eso no suman al esperado.
        </p>
      </div>

      <div className="rounded-2xl border border-borde bg-white p-6">
        <CerrarCajaForm esperado={resumen.esperado} />
      </div>
    </div>
  );
}

function CajaCerrada({ cierre }: { cierre: CierreCaja | null }) {
  return (
    <div className="flex flex-col gap-4">
      {cierre ? (
        <div className="rounded-2xl border border-borde bg-white p-6">
          <p className="mb-4 flex items-center gap-2 font-semibold text-marca">
            <CircleCheck size={22} /> Caja cerrada a las {formatearHora(cierre.closedAt)}
          </p>
          <dl className="flex flex-col gap-2">
            <FilaTexto etiqueta="Abierta" valor={formatearFechaHora(cierre.openedAt)} />
            <Fila etiqueta="Fondo inicial" valor={cierre.initialAmount} />
            <Fila etiqueta="Esperado en gaveta" valor={cierre.expectedAmount} />
            <Fila etiqueta="Contado" valor={cierre.actualAmount} />
            <div
              className={`mt-1 flex justify-between border-t border-borde pt-3 text-lg font-bold ${
                cierre.difference === 0 ? "text-marca" : cierre.difference > 0 ? "text-aviso" : "text-peligro"
              }`}
            >
              <dt>{cierre.difference === 0 ? "Cuadró exacto" : cierre.difference > 0 ? "Sobró" : "Faltó"}</dt>
              <dd className="tabular-nums">{formatearLempiras(Math.abs(cierre.difference))}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="rounded-2xl border border-borde bg-white p-6 text-texto-suave">
          La caja está cerrada.
        </p>
      )}

      <Link
        href="/caja/abrir"
        className="flex h-12 items-center justify-center rounded-lg bg-marca text-lg font-semibold text-white hover:bg-marca-oscuro"
      >
        Abrir caja nueva
      </Link>
    </div>
  );
}

function Fila({ etiqueta, valor, signo }: { etiqueta: string; valor: number; signo?: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-texto-suave">{etiqueta}</dt>
      <dd className="tabular-nums">
        {signo && <span className="text-texto-suave">{signo} </span>}
        {formatearLempiras(valor)}
      </dd>
    </div>
  );
}

function FilaTexto({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-texto-suave">{etiqueta}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-lg bg-fondo p-3">
      <p className="text-texto-suave">{titulo}</p>
      <p className="font-semibold tabular-nums">{formatearLempiras(valor)}</p>
    </div>
  );
}