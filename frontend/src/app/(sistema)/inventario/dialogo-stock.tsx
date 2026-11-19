"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import { parsearMonto } from "@/lib/cobro/pago";
import { redondear } from "@/lib/cobro/carrito";
import type { ProductoInventario } from "@/lib/api/inventario";
import { ajustarStockAction, registrarEntradaAction } from "./actions";

type Props = {
  producto: ProductoInventario;
  modo: "entrada" | "ajuste";
  onCerrar: () => void;
};

// Convierte lo escrito en una cantidad. Vacío o inválido = null.
function parsearCantidad(texto: string): number | null {
  if (texto.trim() === "") return null;
  return parsearMonto(texto);
}

// Entrada de mercadería (RN-15) o ajuste manual del stock (RN-16).
export function DialogoStock({ producto, modo, onCerrar }: Props) {
  const router = useRouter();
  const [cantidad, setCantidad] = useState("");
  const [costo, setCosto] = useState(producto.cost != null ? String(producto.cost) : "");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [guardando, iniciar] = useTransition();

  const unidad = producto.unitType === "libra" ? "lb" : "unid.";
  const numero = parsearCantidad(cantidad);
  const stockFinal =
    numero === null ? null : modo === "entrada" ? redondear(producto.stock + numero) : numero;

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (numero === null) {
      setError("Escriba una cantidad válida, con máximo dos decimales.");
      return;
    }
    const costoNum = costo.trim() === "" ? null : parsearMonto(costo);
    if (modo === "entrada" && costo.trim() !== "" && costoNum === null) {
      setError("El costo no es válido.");
      return;
    }

    iniciar(async () => {
      const resultado =
        modo === "entrada"
          ? await registrarEntradaAction(producto.id, numero, costoNum)
          : await ajustarStockAction(producto.id, numero, motivo);
      if (resultado.error) {
        setError(resultado.error);
        return;
      }
      onCerrar();
      router.refresh();
    });
  }

  return (
    <Modal
      titulo={modo === "entrada" ? "Entrada de mercadería" : "Ajustar stock"}
      onCerrar={guardando ? () => {} : onCerrar}
    >
      <form onSubmit={guardar} className="flex flex-col gap-4">
        <div className="rounded-lg bg-fondo px-4 py-3">
          <p className="font-semibold">{producto.name}</p>
          <p className="text-sm text-texto-suave">
            Stock actual: <span className="font-medium tabular-nums">{producto.stock} {unidad}</span>
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="cantidad" className="text-sm font-medium">
            {modo === "entrada" ? `Cantidad que llegó (${unidad})` : `Stock real contado (${unidad})`}
          </label>
          <input
            id="cantidad"
            value={cantidad}
            onChange={(e) => {
              setCantidad(e.target.value);
              setError("");
            }}
            autoFocus
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            className="h-14 rounded-lg border border-borde px-4 text-2xl font-semibold tabular-nums outline-none focus:border-marca focus:ring-2 focus:ring-marca/30"
          />
        </div>

        {modo === "entrada" ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="costo" className="text-sm font-medium">
              Costo por {producto.unitType === "libra" ? "libra" : "unidad"} (opcional)
            </label>
            <input
              id="costo"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="h-11 rounded-lg border border-borde px-3 outline-none focus:border-marca"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="motivo" className="text-sm font-medium">
              Motivo (opcional)
            </label>
            <input
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={200}
              placeholder="Ej: producto dañado, conteo físico"
              className="h-11 rounded-lg border border-borde px-3 outline-none focus:border-marca"
            />
          </div>
        )}

        {stockFinal !== null && (
          <p className="rounded-lg bg-marca/10 px-4 py-3 text-marca">
            Quedará en <strong className="tabular-nums">{stockFinal} {unidad}</strong>
            {modo === "ajuste" && stockFinal !== producto.stock && (
              <> ({stockFinal > producto.stock ? "+" : ""}{redondear(stockFinal - producto.stock)})</>
            )}
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-peligro/10 px-4 py-3 text-sm font-medium text-peligro">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={guardando || numero === null}
          className="h-12 rounded-lg bg-marca text-lg font-semibold text-white hover:bg-marca-oscuro disabled:opacity-50"
        >
          {guardando ? "Guardando..." : modo === "entrada" ? "Registrar entrada" : "Guardar ajuste"}
        </button>
      </form>
    </Modal>
  );
}