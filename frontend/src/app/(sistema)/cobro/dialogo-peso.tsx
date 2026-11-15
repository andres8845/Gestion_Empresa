"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { formatearLempiras } from "@/lib/formato";
import { redondear } from "@/lib/cobro/carrito";
import type { Producto } from "@/lib/mock/productos";

type Props = {
  producto: Producto;
  pesoInicial?: number; // al editar una línea que ya está en el carrito
  onAceptar: (libras: number) => void;
  onCerrar: () => void;
};

// RN-23: para productos por libra se pide el peso de la báscula.
export function DialogoPeso({ producto, pesoInicial, onAceptar, onCerrar }: Props) {
  const [texto, setTexto] = useState(pesoInicial ? String(pesoInicial) : "");
  const [error, setError] = useState("");

  const limpio = texto.trim().replace(",", ".");
  const valido = /^\d+(\.\d{1,2})?$/.test(limpio) && Number(limpio) > 0;
  const libras = valido ? Number(limpio) : 0;

  function aceptar(e: React.FormEvent) {
    e.preventDefault();
    if (!valido) {
      setError("Ingrese un peso mayor a cero, con máximo dos decimales.");
      return;
    }
    onAceptar(libras);
  }

  return (
    <Modal titulo={producto.name} onCerrar={onCerrar}>
      <form onSubmit={aceptar} className="flex flex-col gap-4">
        <p className="text-texto-suave">
          Precio: {formatearLempiras(producto.salePrice)} por libra
        </p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="libras" className="text-sm font-medium">
            Peso en la báscula
          </label>
          <div className="flex h-14 items-center rounded-lg border border-borde focus-within:border-marca focus-within:ring-2 focus-within:ring-marca/30">
            <input
              id="libras"
              inputMode="decimal"
              autoComplete="off"
              autoFocus
              placeholder="0.00"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setError("");
              }}
              className="h-full flex-1 bg-transparent px-4 text-2xl font-semibold tabular-nums outline-none"
            />
            <span className="pr-4 text-lg font-semibold text-texto-suave">lb</span>
          </div>
        </div>

        <div className="flex items-baseline justify-between rounded-lg bg-fondo px-4 py-3">
          <span className="text-texto-suave">Subtotal</span>
          <span className="text-xl font-bold tabular-nums">
            {formatearLempiras(redondear(libras * producto.salePrice))}
          </span>
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-peligro">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="h-12 rounded-lg bg-marca text-lg font-semibold text-white hover:bg-marca-oscuro"
        >
          {pesoInicial ? "Guardar peso" : "Agregar"}
        </button>
      </form>
    </Modal>
  );
}