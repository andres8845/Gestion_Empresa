"use client";

import { useMemo, useState } from "react";
import { ArrowDownToLine, IdCard, Package, Pencil, Plus, Search, SlidersHorizontal } from "lucide-react";
import { formatearLempiras } from "@/lib/formato";
import type { Categoria, ProductoInventario } from "@/lib/api/inventario";
import { FormularioProducto } from "./formulario-producto";
import { DialogoStock } from "./dialogo-stock";

type Filtro = "todos" | "bajo" | "negativo" | "inactivos";

type Abierto =
  | { tipo: "nuevo" }
  | { tipo: "editar"; producto: ProductoInventario }
  | { tipo: "entrada" | "ajuste"; producto: ProductoInventario };

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// Estado del stock de un producto activo, para las alertas.
// RN-17: puede quedar negativo. RN-18: alerta al llegar al mínimo.
function estadoStock(p: ProductoInventario): "negativo" | "bajo" | "ok" | "paquete" {
  if (p.parentProductId !== null) return "paquete";
  if (p.stock < 0) return "negativo";
  if (p.stock <= p.minStock) return "bajo";
  return "ok";
}

type Props = {
  productos: ProductoInventario[];
  categorias: Categoria[];
};

export function PantallaInventario({ productos, categorias }: Props) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [categoria, setCategoria] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState<Abierto | null>(null);

  const nombreCategoria = useMemo(
    () => new Map(categorias.map((c) => [c.id, c.name])),
    [categorias],
  );
  const porId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);

  const conteo = useMemo(() => {
    const activos = productos.filter((p) => p.isActive);
    return {
      activos: activos.length,
      bajo: activos.filter((p) => estadoStock(p) === "bajo").length,
      negativo: activos.filter((p) => estadoStock(p) === "negativo").length,
      inactivos: productos.length - activos.length,
    };
  }, [productos]);

  const filtrados = useMemo(() => {
    const buscado = normalizar(busqueda);
    return productos.filter((p) => {
      if (filtro === "inactivos" ? p.isActive : !p.isActive) return false;
      if (filtro === "bajo" && estadoStock(p) !== "bajo") return false;
      if (filtro === "negativo" && estadoStock(p) !== "negativo") return false;
      if (categoria && p.categoryId !== categoria) return false;
      if (buscado && !normalizar(p.name).includes(buscado) && !normalizar(p.code).includes(buscado)) {
        return false;
      }
      return true;
    });
  }, [productos, filtro, categoria, busqueda]);

  const filtros: { valor: Filtro; texto: string; cantidad: number; color: string }[] = [
    { valor: "todos", texto: "Activos", cantidad: conteo.activos, color: "text-texto" },
    { valor: "bajo", texto: "Stock bajo", cantidad: conteo.bajo, color: "text-aviso" },
    { valor: "negativo", texto: "En negativo", cantidad: conteo.negativo, color: "text-peligro" },
    { valor: "inactivos", texto: "Desactivados", cantidad: conteo.inactivos, color: "text-texto-suave" },
  ];

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inventario</h1>
          <p className="text-texto-suave">Productos, precios y existencias de la tienda.</p>
        </div>
        <button
          type="button"
          onClick={() => setAbierto({ tipo: "nuevo" })}
          className="flex h-11 items-center gap-2 rounded-lg bg-marca px-4 font-semibold text-white hover:bg-marca-oscuro"
        >
          <Plus size={20} />
          Nuevo producto
        </button>
      </div>

      {/* ---------- Alertas como filtros ---------- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {filtros.map((f) => (
          <button
            key={f.valor}
            type="button"
            onClick={() => setFiltro(f.valor)}
            aria-pressed={filtro === f.valor}
            className={`rounded-xl border-2 bg-white p-4 text-left transition ${
              filtro === f.valor ? "border-marca" : "border-borde hover:border-marca/40"
            }`}
          >
            <p className="text-sm text-texto-suave">{f.texto}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${f.cantidad > 0 ? f.color : ""}`}>
              {f.cantidad}
            </p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex h-10 min-w-64 flex-1 items-center gap-2 rounded-lg border border-borde bg-white px-3 focus-within:border-marca">
          <Search size={18} className="text-texto-suave" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar producto"
            placeholder="Buscar por nombre o código"
            className="h-full flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={categoria}
          onChange={(e) => setCategoria(Number(e.target.value))}
          aria-label="Categoría"
          className="h-10 rounded-lg border border-borde bg-white px-3 text-sm"
        >
          <option value={0}>Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* ---------- Tabla ---------- */}
      <div className="overflow-hidden rounded-xl border border-borde bg-white">
        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-texto-suave">
            <Package size={36} strokeWidth={1.5} />
            <p>No hay productos con estos filtros.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-borde bg-fondo/60 text-left text-texto-suave">
              <tr>
                <th className="px-4 py-2.5 font-medium">Producto</th>
                <th className="px-4 py-2.5 font-medium">Categoría</th>
                <th className="px-4 py-2.5 text-right font-medium">Precio</th>
                <th className="px-4 py-2.5 text-right font-medium">Stock</th>
                <th className="px-4 py-2.5 text-right font-medium">Mínimo</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => {
                const estado = estadoStock(p);
                const unidad = p.unitType === "libra" ? "lb" : "";
                const base = p.parentProductId !== null ? porId.get(p.parentProductId) : undefined;
                return (
                  <tr key={p.id} className="border-b border-borde/60 last:border-0">
                    <td className="px-4 py-3">
                      <p className="flex items-center gap-2 font-medium">
                        {p.name}
                        {p.requiresAgeVerification && (
                          <span title="Pide identificación" className="flex items-center gap-0.5 rounded bg-aviso/10 px-1.5 py-0.5 text-xs text-aviso">
                            <IdCard size={12} /> +18
                          </span>
                        )}
                      </p>
                      <p className="font-mono text-xs text-texto-suave">{p.code}</p>
                    </td>
                    <td className="px-4 py-3 text-texto-suave">{nombreCategoria.get(p.categoryId) ?? "—"}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                      {formatearLempiras(p.salePrice)}
                      {p.unitType === "libra" && <span className="text-texto-suave"> /lb</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {estado === "paquete" ? (
                        <span className="text-xs text-texto-suave">
                          Usa el stock de {base?.name ?? "su producto"} ({p.unitsPerPackage} c/u)
                        </span>
                      ) : (
                        <span
                          className={`rounded-md px-2 py-0.5 font-semibold tabular-nums ${
                            estado === "negativo"
                              ? "bg-peligro/10 text-peligro"
                              : estado === "bajo"
                                ? "bg-aviso/10 text-aviso"
                                : ""
                          }`}
                        >
                          {p.stock} {unidad}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-texto-suave tabular-nums">
                      {estado === "paquete" ? "—" : `${p.minStock} ${unidad}`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {estado !== "paquete" && (
                          <>
                            <Accion icono={<ArrowDownToLine size={14} />} texto="Entrada" onClick={() => setAbierto({ tipo: "entrada", producto: p })} />
                            <Accion icono={<SlidersHorizontal size={14} />} texto="Ajustar" onClick={() => setAbierto({ tipo: "ajuste", producto: p })} />
                          </>
                        )}
                        <Accion icono={<Pencil size={14} />} texto="Editar" onClick={() => setAbierto({ tipo: "editar", producto: p })} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {abierto?.tipo === "nuevo" && (
        <FormularioProducto producto={null} categorias={categorias} onCerrar={() => setAbierto(null)} />
      )}
      {abierto?.tipo === "editar" && (
        <FormularioProducto producto={abierto.producto} categorias={categorias} onCerrar={() => setAbierto(null)} />
      )}
      {(abierto?.tipo === "entrada" || abierto?.tipo === "ajuste") && (
        <DialogoStock producto={abierto.producto} modo={abierto.tipo} onCerrar={() => setAbierto(null)} />
      )}
    </>
  );
}

function Accion({ icono, texto, onClick }: { icono: React.ReactNode; texto: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-lg border border-borde px-2.5 py-1.5 text-xs font-semibold hover:border-marca hover:text-marca"
    >
      {icono}
      {texto}
    </button>
  );
}