"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Minus,
  Plus,
  ScanBarcode,
  ShoppingCart,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { formatearLempiras } from "@/lib/formato";
import {
  agregarAlCarrito,
  buscarPorCodigo,
  buscarPorTexto,
  formatearCantidad,
  lineasSinStock,
  stockDisponible,
  subtotalLinea,
  totalCarrito,
  type LineaCarrito,
} from "@/lib/cobro/carrito";
import type { Producto } from "@/lib/mock/productos";
import { DialogoPeso } from "./dialogo-peso";
import { DialogoEdad } from "./dialogo-edad";

// Ventana que está abierta encima del cobro, si hay alguna.
type Pendiente =
  | { tipo: "edad"; producto: Producto }
  | { tipo: "peso"; producto: Producto; pesoActual?: number };

type Props = {
  productos: Producto[];
};

export function PantallaCobro({ productos }: Props) {
  const [lineas, setLineas] = useState<LineaCarrito[]>([]);
  const [texto, setTexto] = useState("");
  const [seleccion, setSeleccion] = useState(0);
  const [aviso, setAviso] = useState("");
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  // RN-26: la identificación se pide una vez por venta (es el mismo cliente).
  const [edadVerificada, setEdadVerificada] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sugerencias = useMemo(
    () => buscarPorTexto(productos, texto),
    [productos, texto],
  );
  const sinStock = useMemo(
    () => lineasSinStock(lineas, productos),
    [lineas, productos],
  );
  const total = totalCarrito(lineas);

  // Cuando se cierra una ventana, el cursor vuelve al campo del escáner.
  useEffect(() => {
    if (!pendiente) inputRef.current?.focus();
  }, [pendiente, lineas]);

  // ---------- Agregar productos ----------

  function intentarAgregar(producto: Producto) {
    setTexto("");
    setSeleccion(0);
    setAviso("");

    if (producto.requiresAgeVerification && !edadVerificada) {
      setPendiente({ tipo: "edad", producto });
      return;
    }
    continuarAgregar(producto);
  }

  function continuarAgregar(producto: Producto) {
    if (producto.unitType === "libra") {
      setPendiente({ tipo: "peso", producto });
      return;
    }
    setPendiente(null);
    setLineas((actual) => agregarAlCarrito(actual, producto, 1));
  }

  function alEnviar(e: React.FormEvent) {
    e.preventDefault();
    const buscado = texto.trim();
    if (!buscado) return;

    // 1. Código exacto: lo que manda el escáner (RN-20).
    const porCodigo = buscarPorCodigo(productos, buscado);
    if (porCodigo) {
      intentarAgregar(porCodigo);
      return;
    }

    // 2. El producto marcado en la lista de sugerencias.
    if (sugerencias.length > 0) {
      intentarAgregar(sugerencias[Math.min(seleccion, sugerencias.length - 1)]);
      return;
    }

    // 3. No existe: se avisa y se puede buscar por nombre (RN-21).
    setAviso(`No se encontró ningún producto con "${buscado}". Búsquelo por nombre.`);
    setTexto("");
  }

  function alPresionarTecla(e: React.KeyboardEvent<HTMLInputElement>) {
    if (sugerencias.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSeleccion((s) => (s + 1) % sugerencias.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSeleccion((s) => (s - 1 + sugerencias.length) % sugerencias.length);
    }
  }

  // ---------- Cambiar el carrito (RN-24) ----------

  function cambiarCantidad(id: number, cantidad: number) {
    setLineas((actual) =>
      actual.map((l) => (l.producto.id === id ? { ...l, cantidad } : l)),
    );
  }

  function quitar(id: number) {
    setLineas((actual) => actual.filter((l) => l.producto.id !== id));
  }

  function cancelarVenta() {
    if (lineas.length === 0) return;
    if (!window.confirm("¿Quitar todos los productos de esta venta?")) return;
    setLineas([]);
    setEdadVerificada(false);
    setAviso("");
  }

  function alAceptarPeso(libras: number) {
    if (pendiente?.tipo !== "peso") return;
    const { producto, pesoActual } = pendiente;
    if (pesoActual !== undefined) {
      cambiarCantidad(producto.id, libras); // se está corrigiendo el peso
    } else {
      setLineas((actual) => agregarAlCarrito(actual, producto, libras));
    }
    setPendiente(null);
  }

  return (
    <div className="flex flex-1 gap-6 p-6">
      {/* ---------- Izquierda: escáner y carrito ---------- */}
      <section className="flex min-w-0 flex-1 flex-col gap-4">
        <form onSubmit={alEnviar} className="relative">
          <div className="flex h-14 items-center gap-3 rounded-xl border-2 border-marca bg-white px-4 shadow-sm">
            <ScanBarcode size={24} className="shrink-0 text-marca" />
            <input
              ref={inputRef}
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setSeleccion(0);
                setAviso("");
              }}
              onKeyDown={alPresionarTecla}
              autoFocus
              autoComplete="off"
              aria-label="Código o nombre del producto"
              placeholder="Escanee el código o escriba el nombre del producto"
              className="h-full flex-1 bg-transparent text-lg outline-none"
            />
          </div>

          {sugerencias.length > 0 && (
            <ul className="absolute top-full right-0 left-0 z-10 mt-1 overflow-hidden rounded-xl border border-borde bg-white shadow-lg">
              {sugerencias.map((p, i) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => intentarAgregar(p)}
                    onMouseEnter={() => setSeleccion(i)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left ${
                      i === seleccion ? "bg-marca/10" : ""
                    }`}
                  >
                    <span className="flex-1">
                      <span className="font-medium">{p.name}</span>
                      <span className="ml-2 text-sm text-texto-suave">{p.code}</span>
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatearLempiras(p.salePrice)}
                      {p.unitType === "libra" && (
                        <span className="text-sm font-normal text-texto-suave"> /lb</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>

        {aviso && (
          <p role="alert" className="rounded-lg bg-peligro/10 px-4 py-3 font-medium text-peligro">
            {aviso}
          </p>
        )}

        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-borde bg-white">
          {lineas.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center text-texto-suave">
              <ShoppingCart size={40} strokeWidth={1.5} />
              <p>Escanee un producto para empezar la venta.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-borde bg-fondo/60 text-left text-sm text-texto-suave">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Producto</th>
                  <th className="px-4 py-2.5 text-right font-medium">Precio</th>
                  <th className="px-4 py-2.5 text-center font-medium">Cantidad</th>
                  <th className="px-4 py-2.5 text-right font-medium">Subtotal</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {lineas.map((linea) => {
                  const { producto } = linea;
                  return (
                    <tr key={producto.id} className="border-b border-borde/60 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{producto.name}</p>
                        <p className="text-sm text-texto-suave">{producto.code}</p>
                        {sinStock.has(producto.id) && (
                          <p className="mt-1 flex items-center gap-1 text-sm font-medium text-aviso">
                            <TriangleAlert size={14} />
                            Stock en sistema: {stockDisponible(producto, productos)}. Se puede vender igual.
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                        {formatearLempiras(producto.salePrice)}
                        {producto.unitType === "libra" && (
                          <span className="text-sm text-texto-suave"> /lb</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {producto.unitType === "libra" ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPendiente({ tipo: "peso", producto, pesoActual: linea.cantidad })
                            }
                            className="mx-auto block rounded-lg border border-borde px-3 py-1.5 font-medium tabular-nums hover:border-marca"
                            title="Cambiar peso"
                          >
                            {formatearCantidad(linea)}
                          </button>
                        ) : (
                          <ControlCantidad
                            cantidad={linea.cantidad}
                            onCambiar={(c) => cambiarCantidad(producto.id, c)}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {formatearLempiras(subtotalLinea(linea))}
                      </td>
                      <td className="pr-3">
                        <button
                          type="button"
                          onClick={() => quitar(producto.id)}
                          className="rounded-lg p-2 text-texto-suave hover:bg-peligro/10 hover:text-peligro"
                          title="Quitar producto"
                        >
                          <Trash2 size={18} />
                          <span className="sr-only">Quitar {producto.name}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ---------- Derecha: total ---------- */}
      <aside className="flex w-80 shrink-0 flex-col gap-4">
        <div className="rounded-xl border border-borde bg-white p-6">
          <p className="text-texto-suave">Total a pagar</p>
          <p className="mt-1 text-4xl font-bold tabular-nums">
            {formatearLempiras(total)}
          </p>
          <p className="mt-1 text-sm text-texto-suave">ISV incluido</p>

          <div className="mt-5 flex justify-between border-t border-borde pt-4 text-sm">
            <span className="text-texto-suave">Productos distintos</span>
            <span className="font-medium tabular-nums">{lineas.length}</span>
          </div>
        </div>

        <button
          type="button"
          disabled
          title="El cobro se agrega en el siguiente paso"
          className="h-16 rounded-xl bg-marca text-xl font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cobrar
        </button>

        <button
          type="button"
          onClick={cancelarVenta}
          disabled={lineas.length === 0}
          className="h-12 rounded-xl border border-borde bg-white font-semibold text-peligro hover:bg-peligro/5 disabled:cursor-not-allowed disabled:text-texto-suave disabled:opacity-60"
        >
          Cancelar venta
        </button>
      </aside>

      {pendiente?.tipo === "edad" && (
        <DialogoEdad
          producto={pendiente.producto}
          onConfirmar={() => {
            setEdadVerificada(true);
            continuarAgregar(pendiente.producto);
          }}
          onCerrar={() => setPendiente(null)}
        />
      )}

      {pendiente?.tipo === "peso" && (
        <DialogoPeso
          producto={pendiente.producto}
          pesoInicial={pendiente.pesoActual}
          onAceptar={alAceptarPeso}
          onCerrar={() => setPendiente(null)}
        />
      )}
    </div>
  );
}

// Botones - y + con un campo para escribir la cantidad directamente.
function ControlCantidad({
  cantidad,
  onCambiar,
}: {
  cantidad: number;
  onCambiar: (cantidad: number) => void;
}) {
  const [texto, setTexto] = useState(String(cantidad));
  const [anterior, setAnterior] = useState(cantidad);

  // Si la cantidad cambia desde afuera (ej. se escanea otra vez), se actualiza.
  if (cantidad !== anterior) {
    setAnterior(cantidad);
    setTexto(String(cantidad));
  }

  function confirmar() {
    const numero = Number(texto);
    if (Number.isInteger(numero) && numero >= 1) {
      onCambiar(numero);
    } else {
      setTexto(String(cantidad)); // valor inválido: se regresa al anterior
    }
  }

  return (
    <div className="mx-auto flex w-fit items-center rounded-lg border border-borde">
      <button
        type="button"
        onClick={() => onCambiar(cantidad - 1)}
        disabled={cantidad <= 1}
        className="p-2 hover:bg-fondo disabled:opacity-30"
      >
        <Minus size={16} />
        <span className="sr-only">Restar uno</span>
      </button>
      <input
        value={texto}
        inputMode="numeric"
        aria-label="Cantidad"
        onChange={(e) => setTexto(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            confirmar();
          }
        }}
        className="w-12 bg-transparent text-center font-medium tabular-nums outline-none"
      />
      <button
        type="button"
        onClick={() => onCambiar(cantidad + 1)}
        className="p-2 hover:bg-fondo"
      >
        <Plus size={16} />
        <span className="sr-only">Sumar uno</span>
      </button>
    </div>
  );
}