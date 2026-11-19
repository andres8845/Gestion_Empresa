"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatearLempiras } from "@/lib/formato";
import { parsearMonto } from "@/lib/cobro/pago";
import { redondear } from "@/lib/cobro/carrito";
import { cerrarCajaAction } from "./actions";

type Props = {
  esperado: number;
};

// El usuario cuenta el efectivo de la gaveta y el sistema muestra si
// sobra o falta comparado con lo esperado (RN-37).
export function CerrarCajaForm({ esperado }: Props) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState("");
  const [guardando, iniciar] = useTransition();

  const contado = texto.trim() === "" ? null : parsearMonto(texto);
  const diferencia = contado === null ? null : redondear(contado - esperado);

  function cerrar(e: React.FormEvent) {
    e.preventDefault();
    if (contado === null) {
      setError("Escriba el efectivo contado, con máximo dos decimales.");
      return;
    }
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    setError("");
    iniciar(async () => {
      const r = await cerrarCajaAction(contado);
      if (r.error) {
        setError(r.error);
        setConfirmando(false);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={cerrar} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contado" className="text-sm font-medium">
          Efectivo contado en la gaveta
        </label>
        <div className="flex h-14 items-center rounded-lg border border-borde focus-within:border-marca focus-within:ring-2 focus-within:ring-marca/30">
          <span className="pl-4 text-xl font-semibold text-texto-suave">L</span>
          <input
            id="contado"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setConfirmando(false);
              setError("");
            }}
            autoFocus
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            className="h-full flex-1 bg-transparent px-3 text-2xl font-semibold tabular-nums outline-none"
          />
        </div>
      </div>

      {diferencia !== null && (
        <div
          className={`flex items-baseline justify-between rounded-xl px-5 py-3 ${
            diferencia === 0
              ? "bg-marca/10 text-marca"
              : diferencia > 0
                ? "bg-aviso/10 text-aviso"
                : "bg-peligro/10 text-peligro"
          }`}
        >
          <span className="font-medium">
            {diferencia === 0 ? "Cuadra exacto" : diferencia > 0 ? "Sobra" : "Falta"}
          </span>
          <span className="text-2xl font-bold tabular-nums">
            {formatearLempiras(Math.abs(diferencia))}
          </span>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-peligro/10 px-4 py-3 text-sm font-medium text-peligro">
          {error}
        </p>
      )}

      {confirmando && (
        <p className="text-sm text-texto-suave">
          Al cerrar ya no se podrá cobrar hasta abrir una caja nueva. ¿Confirma el cierre?
        </p>
      )}

      <button
        type="submit"
        disabled={guardando || contado === null}
        className={`h-12 rounded-lg text-lg font-semibold text-white disabled:opacity-50 ${
          confirmando ? "bg-peligro hover:bg-peligro/90" : "bg-marca hover:bg-marca-oscuro"
        }`}
      >
        {guardando ? "Cerrando..." : confirmando ? "Sí, cerrar caja" : "Cerrar caja"}
      </button>
    </form>
  );
}