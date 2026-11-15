import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { obtenerVenta } from "@/lib/api/ventas";
import { formatearFechaHora, formatearLempiras } from "@/lib/formato";
import { BotonImprimir } from "./boton-imprimir";

export const metadata: Metadata = {
  title: "Factura | Mercadito Daniela",
};

const nombresPago = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  fiado: "Fiado",
} as const;

export default function FacturaPage({ params }: PageProps<"/ventas/[id]/factura">) {
  return (
    <main className="flex flex-1 justify-center bg-fondo p-8 print:bg-white print:p-0">
      <Suspense fallback={<p className="text-texto-suave">Cargando factura...</p>}>
        {params.then(({ id }) => (
          <Factura id={Number(id)} />
        ))}
      </Suspense>
    </main>
  );
}

async function Factura({ id }: { id: number }) {
  const venta = Number.isInteger(id) ? await obtenerVenta(id) : null;
  if (!venta) notFound();

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <p className="flex items-center justify-center gap-2 font-semibold text-marca print:hidden">
        <CircleCheck size={22} />
        Venta guardada
      </p>

      {/* RN-34: lo que lleva la factura. RN-35: sin datos del cliente. */}
      <article className="rounded-2xl border border-borde bg-white p-6 font-mono text-sm print:rounded-none print:border-0 print:p-0">
        <header className="mb-4 text-center">
          <h1 className="font-sans text-xl font-bold">Mercadito Daniela</h1>
          <p className="mt-1">Factura N.º {venta.invoiceNumber}</p>
          <p>{formatearFechaHora(venta.createdAt)}</p>
          {venta.status === "anulada" && (
            <p className="mt-2 font-bold text-peligro">*** VENTA ANULADA ***</p>
          )}
        </header>

        <table className="w-full border-y border-dashed border-texto/40">
          <thead>
            <tr className="text-left">
              <th className="py-2 font-semibold">Producto</th>
              <th className="py-2 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {venta.details.map((d) => (
              <tr key={d.productId} className="align-top">
                <td className="pb-2">
                  <p>{d.productName}</p>
                  <p className="text-texto-suave">
                    {d.unitType === "libra" ? `${d.quantity.toFixed(2)} lb` : d.quantity} x{" "}
                    {formatearLempiras(d.unitPrice)}
                  </p>
                </td>
                <td className="pb-2 text-right tabular-nums">
                  {formatearLempiras(d.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex justify-between text-base font-bold">
          <span>TOTAL</span>
          <span className="tabular-nums">{formatearLempiras(venta.total)}</span>
        </div>
        <p className="text-right text-texto-suave">ISV incluido</p>

        <dl className="mt-4 flex flex-col gap-1 border-t border-dashed border-texto/40 pt-3">
          {venta.payments.map((p) => (
            <Fila key={p.paymentMethod} etiqueta={nombresPago[p.paymentMethod]} valor={formatearLempiras(p.amount)} />
          ))}
          {venta.cashReceived > 0 && (
            <>
              <Fila etiqueta="Efectivo recibido" valor={formatearLempiras(venta.cashReceived)} />
              <Fila etiqueta="Cambio" valor={formatearLempiras(venta.changeGiven)} />
            </>
          )}
        </dl>

        <footer className="mt-4 border-t border-dashed border-texto/40 pt-3 text-center">
          <p>Le atendió: <span className="capitalize">{venta.username}</span></p>
          <p className="mt-2">¡Gracias por su compra!</p>
        </footer>
      </article>

      <div className="flex gap-3 print:hidden">
        <BotonImprimir />
        <Link
          href="/cobro"
          className="flex h-12 flex-1 items-center justify-center rounded-xl bg-marca font-semibold text-white hover:bg-marca-oscuro"
        >
          Nueva venta
        </Link>
      </div>
    </div>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between">
      <dt>{etiqueta}</dt>
      <dd className="tabular-nums">{valor}</dd>
    </div>
  );
}