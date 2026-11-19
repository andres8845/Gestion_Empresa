"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { Modal } from "@/components/modal";
import { formatearLempiras } from "@/lib/formato";
import type { Venta } from "@/lib/api/ventas";
import { anularVentaAction } from "./actions";

type Props = {
  venta: Venta;
  onCerrar: () => void;
};

// Motivos más comunes, para no escribirlos cada vez.
const motivosRapidos = [
  "Error al registrar la venta",
  "El cliente devolvió los productos",
  "Se cobró dos veces",
];

// RN-36: anular con motivo. La venta no se borra, queda marcada como anulada.
export function DialogoAnular({ venta, onCerrar }: Props) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [guardando, iniciar] = useTransition();
  const tieneFiado = venta.payments.some((p) => p.paymentMethod === "fiado");

  function confirmar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    iniciar(async () => {
      const resultado = await anularVentaAction(venta.id, motivo);
      if (resultado.error) {
        setError(resultado.error);
        return;
      }
      onCerrar();
      router.refresh(); // vuelve a pedir el historial al servidor
    });
  }

  return (
    <Modal titulo={`Anular factura ${venta.invoiceNumber}`} onCerrar={guardando ? () => {} : onCerrar}>
      <form onSubmit={confirmar} className="flex flex-col gap-4">
        <div className="flex gap-3 rounded-lg bg-aviso/10 p-4 text-aviso">
          <TriangleAlert size={22} className="shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">
              Venta de {formatearLempiras(venta.total)}. Al anularla:
            </p>
            <ul className="mt-1 list-disc pl-4">
              <li>Los productos vuelven al inventario.</li>
              {tieneFiado && <li>Se quita el cargo de fiado y baja la deuda del cliente.</li>}
              <li>La venta queda en el historial como anulada. No se puede deshacer.</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="motivo" className="text-sm font-medium">
            Motivo de la anulación
          </label>
          <textarea
            id="motivo"
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setError("");
            }}
            autoFocus
            rows={3}
            maxLength={200}
            placeholder="Ej: el cliente devolvió los productos"
            className="resize-none rounded-lg border border-borde px-3 py-2 outline-none focus:border-marca focus:ring-2 focus:ring-marca/30"
          />
          <div className="flex flex-wrap gap-2">
            {motivosRapidos.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMotivo(m)}
                className="rounded-full border border-borde px-3 py-1 text-xs font-medium hover:border-marca hover:text-marca"
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-peligro/10 px-4 py-3 text-sm font-medium text-peligro">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="h-12 flex-1 rounded-lg border border-borde font-semibold hover:bg-fondo"
          >
            No anular
          </button>
          <button
            type="submit"
            disabled={guardando || motivo.trim().length < 5}
            className="h-12 flex-1 rounded-lg bg-peligro font-semibold text-white hover:bg-peligro/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? "Anulando..." : "Anular venta"}
          </button>
        </div>
      </form>
    </Modal>
  );
}