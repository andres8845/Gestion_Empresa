"use client";

import { useActionState, useState } from "react";
import { abrirCajaAction, type AbrirCajaState } from "./actions";

const estadoInicial: AbrirCajaState = {};

// Atajos para no escribir los montos que más se usan.
const montosRapidos = [500, 1000, 2000];

export function AbrirCajaForm() {
  const [state, formAction, pending] = useActionState(
    abrirCajaAction,
    estadoInicial,
  );
  const [monto, setMonto] = useState(state.monto ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="monto" className="text-sm font-medium">
          Efectivo con el que inicia la caja
        </label>
        <div className="flex h-14 items-center rounded-lg border border-borde bg-white focus-within:border-marca focus-within:ring-2 focus-within:ring-marca/30">
          <span className="pl-4 text-xl font-semibold text-texto-suave">L</span>
          <input
            id="monto"
            name="monto"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            placeholder="0.00"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="h-full flex-1 bg-transparent px-3 text-2xl font-semibold tabular-nums outline-none"
          />
        </div>
      </div>

      <div className="flex gap-2">
        {montosRapidos.map((valor) => (
          <button
            key={valor}
            type="button"
            onClick={() => setMonto(String(valor))}
            className="flex-1 rounded-lg border border-borde bg-white py-2 font-medium tabular-nums hover:border-marca hover:text-marca"
          >
            L {valor.toLocaleString("es-HN")}
          </button>
        ))}
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-peligro/10 px-4 py-3 text-sm font-medium text-peligro"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-lg bg-marca text-lg font-semibold text-white transition hover:bg-marca-oscuro disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Abriendo..." : "Abrir caja"}
      </button>
    </form>
  );
}