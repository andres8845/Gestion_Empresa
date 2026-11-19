"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import { parsearMonto } from "@/lib/cobro/pago";
import type { Categoria, ProductoInventario } from "@/lib/api/inventario";
import { guardarProductoAction } from "./actions";

type Props = {
  producto: ProductoInventario | null; // null = producto nuevo
  categorias: Categoria[];
  onCerrar: () => void;
};

const estiloCampo =
  "h-11 w-full rounded-lg border border-borde bg-white px-3 outline-none focus:border-marca focus:ring-2 focus:ring-marca/30";

// Crear o editar un producto (RN-09 a RN-14).
export function FormularioProducto({ producto, categorias, onCerrar }: Props) {
  const router = useRouter();
  const nuevo = producto === null;
  const [guardando, iniciar] = useTransition();
  const [error, setError] = useState("");

  const [code, setCode] = useState(producto?.code ?? "");
  const [name, setName] = useState(producto?.name ?? "");
  const [categoryId, setCategoryId] = useState(producto?.categoryId ?? 0);
  const [precio, setPrecio] = useState(producto ? String(producto.salePrice) : "");
  const [costo, setCosto] = useState(producto?.cost != null ? String(producto.cost) : "");
  const [unitType, setUnitType] = useState<"unidad" | "libra">(producto?.unitType ?? "unidad");
  const [minimo, setMinimo] = useState(producto ? String(producto.minStock) : "0");
  const [stockInicial, setStockInicial] = useState("0");
  const [isvRate, setIsvRate] = useState(producto?.isvRate ?? 15);
  const [edad, setEdad] = useState(producto?.requiresAgeVerification ?? false);
  const [activo, setActivo] = useState(producto?.isActive ?? true);

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const salePrice = parsearMonto(precio);
    const cost = costo.trim() === "" ? null : parsearMonto(costo);
    const minStock = parsearMonto(minimo);
    const inicial = parsearMonto(stockInicial);

    if (!precio.trim() || salePrice === null || salePrice <= 0) {
      setError("Escriba un precio de venta mayor a cero, con máximo dos decimales.");
      return;
    }
    if (costo.trim() !== "" && cost === null) {
      setError("El costo no es válido.");
      return;
    }
    if (minStock === null || inicial === null) {
      setError("Revise las cantidades: solo números con máximo dos decimales.");
      return;
    }
    if (!categoryId) {
      setError("Elija una categoría.");
      return;
    }

    iniciar(async () => {
      const resultado = await guardarProductoAction(
        {
          code,
          name,
          categoryId,
          salePrice,
          cost,
          unitType,
          minStock,
          isvRate,
          requiresAgeVerification: edad,
          isActive: activo,
          stockInicial: inicial,
        },
        producto?.id ?? null,
      );
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
      titulo={nuevo ? "Nuevo producto" : `Editar ${producto.name}`}
      onCerrar={guardando ? () => {} : onCerrar}
      ancho="grande"
    >
      <form onSubmit={guardar} className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3">
          <Campo etiqueta="Código" id="code" className="col-span-1">
            <input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus={nuevo}
              maxLength={30}
              placeholder="Ej: 7401234 o 101"
              className={`${estiloCampo} font-mono uppercase`}
            />
          </Campo>
          <Campo etiqueta="Nombre" id="name" className="col-span-2">
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus={!nuevo}
              maxLength={80}
              placeholder="Ej: Refresco cola 1.5 L"
              className={estiloCampo}
            />
          </Campo>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Categoría" id="categoria">
            <select
              id="categoria"
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className={estiloCampo}
            >
              <option value={0} disabled>
                Elija una categoría
              </option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Se vende por" id="unidad">
            <select
              id="unidad"
              value={unitType}
              onChange={(e) => setUnitType(e.target.value as "unidad" | "libra")}
              disabled={!nuevo}
              title={nuevo ? undefined : "No se cambia en productos que ya existen, para no afectar el historial"}
              className={`${estiloCampo} disabled:bg-fondo`}
            >
              <option value="unidad">Unidad</option>
              <option value="libra">Libra (por peso)</option>
            </select>
          </Campo>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Campo etiqueta={`Precio de venta${unitType === "libra" ? " por libra" : ""} (ISV incluido)`} id="precio">
            <ConPrefijo>
              <input id="precio" value={precio} onChange={(e) => setPrecio(e.target.value)} inputMode="decimal" placeholder="0.00" className={`${estiloCampo} pl-8`} />
            </ConPrefijo>
          </Campo>
          <Campo etiqueta="Costo (opcional)" id="costo">
            <ConPrefijo>
              <input id="costo" value={costo} onChange={(e) => setCosto(e.target.value)} inputMode="decimal" placeholder="0.00" className={`${estiloCampo} pl-8`} />
            </ConPrefijo>
          </Campo>
          <Campo etiqueta="ISV" id="isv">
            <select id="isv" value={isvRate} onChange={(e) => setIsvRate(Number(e.target.value))} className={estiloCampo}>
              <option value={15}>15%</option>
              <option value={18}>18% (bebidas alcohólicas)</option>
              <option value={0}>Exento</option>
            </select>
          </Campo>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta={`Stock mínimo (${unitType === "libra" ? "libras" : "unidades"})`} id="minimo">
            <input id="minimo" value={minimo} onChange={(e) => setMinimo(e.target.value)} inputMode="decimal" className={estiloCampo} />
          </Campo>
          {nuevo ? (
            <Campo etiqueta={`Stock inicial (${unitType === "libra" ? "libras" : "unidades"})`} id="inicial">
              <input id="inicial" value={stockInicial} onChange={(e) => setStockInicial(e.target.value)} inputMode="decimal" className={estiloCampo} />
            </Campo>
          ) : (
            <p className="self-end pb-3 text-sm text-texto-suave">
              El stock se cambia con los botones Entrada o Ajustar.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 rounded-lg bg-fondo p-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={edad} onChange={(e) => setEdad(e.target.checked)} className="h-4 w-4 accent-marca" />
            Pedir identificación al venderlo (mayores de 18 años)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-4 w-4 accent-marca" />
            Activo (se puede vender)
          </label>
          {!activo && !nuevo && (
            <p className="text-sm text-aviso">
              Un producto desactivado no aparece en Cobro, pero sigue en el historial (RN-14).
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-peligro/10 px-4 py-3 text-sm font-medium text-peligro">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="h-12 rounded-lg bg-marca text-lg font-semibold text-white hover:bg-marca-oscuro disabled:opacity-60"
        >
          {guardando ? "Guardando..." : nuevo ? "Crear producto" : "Guardar cambios"}
        </button>
      </form>
    </Modal>
  );
}

function Campo({
  etiqueta,
  id,
  className = "",
  children,
}: {
  etiqueta: string;
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </label>
      {children}
    </div>
  );
}

function ConPrefijo({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="absolute top-1/2 left-3 -translate-y-1/2 font-semibold text-texto-suave">L</span>
      {children}
    </div>
  );
}