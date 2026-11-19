"use client";

import { useMemo, useState } from "react";
import { NotebookPen, Search } from "lucide-react";
import { formatearFechaHora, formatearLempiras } from "@/lib/formato";
import { redondear } from "@/lib/cobro/carrito";
import type { AbonoFiado, ClienteFiado } from "@/lib/api/fiado";
import { DialogoCliente } from "./dialogo-cliente";

type Filtro = "deben" | "todos" | "borrar";

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

type Props = {
  clientes: ClienteFiado[];
  abonos: Record<number, AbonoFiado[]>;
};

export function PantallaFiado({ clientes, abonos }: Props) {
  const [filtro, setFiltro] = useState<Filtro>("deben");
  const [busqueda, setBusqueda] = useState("");
  const [abiertoId, setAbiertoId] = useState<number | null>(null);

  // Se busca por id para que el detalle se actualice después de un abono.
  const abierto = clientes.find((c) => c.id === abiertoId) ?? null;

  const resumen = useMemo(() => {
    const deben = clientes.filter((c) => c.balance > 0);
    return {
      total: redondear(deben.reduce((s, c) => s + c.balance, 0)),
      deben: deben.length,
      borrar: clientes.filter((c) => c.sugerirBorrar).length,
    };
  }, [clientes]);

  const filtrados = useMemo(() => {
    const buscado = normalizar(busqueda);
    return clientes
      .filter((c) => {
        if (filtro === "deben" && c.balance === 0) return false;
        if (filtro === "borrar" && !c.sugerirBorrar) return false;
        if (buscado && !normalizar(c.aliasName).includes(buscado)) return false;
        return true;
      })
      .sort((a, b) => b.balance - a.balance || a.aliasName.localeCompare(b.aliasName, "es"));
  }, [clientes, filtro, busqueda]);

  const tarjetas: { valor: Filtro; titulo: string; texto: string; color?: string }[] = [
    { valor: "deben", titulo: "Por cobrar", texto: formatearLempiras(resumen.total), color: "text-aviso" },
    { valor: "todos", titulo: "Todos los clientes", texto: `${clientes.length} (${resumen.deben} deben)` },
    { valor: "borrar", titulo: "Sugeridos para borrar", texto: String(resumen.borrar) },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tarjetas.map((t) => (
          <button
            key={t.valor}
            type="button"
            onClick={() => setFiltro(t.valor)}
            aria-pressed={filtro === t.valor}
            className={`rounded-xl border-2 bg-white p-4 text-left transition ${
              filtro === t.valor ? "border-marca" : "border-borde hover:border-marca/40"
            }`}
          >
            <p className="text-sm text-texto-suave">{t.titulo}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${t.color ?? ""}`}>{t.texto}</p>
          </button>
        ))}
      </div>

      <div className="flex h-10 items-center gap-2 rounded-lg border border-borde bg-white px-3 focus-within:border-marca">
        <Search size={18} className="text-texto-suave" />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar cliente"
          placeholder="Buscar por nombre o apodo"
          className="h-full flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      {filtro === "borrar" && (
        <p className="rounded-lg bg-fondo px-4 py-3 text-sm text-texto-suave">
          Clientes que ya no deben nada y no han tenido movimientos en 90 días (RN-47).
          Borrarlos evita guardar datos que ya no se necesitan.
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-borde bg-white">
        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-texto-suave">
            <NotebookPen size={36} strokeWidth={1.5} />
            <p>
              {filtro === "deben" ? "Nadie debe nada en este momento." : "No hay clientes con estos filtros."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-borde bg-fondo/60 text-left text-texto-suave">
              <tr>
                <th className="px-4 py-2.5 font-medium">Cliente</th>
                <th className="px-4 py-2.5 text-right font-medium">Debe</th>
                <th className="px-4 py-2.5 font-medium">Último fiado</th>
                <th className="px-4 py-2.5 font-medium">Último movimiento</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id} className="border-b border-borde/60 last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {c.aliasName}
                    {c.sugerirBorrar && (
                      <span className="ml-2 rounded bg-fondo px-1.5 py-0.5 text-xs font-normal text-texto-suave">
                        Sin movimiento 90+ días
                      </span>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold tabular-nums ${c.balance > 0 ? "text-aviso" : "text-texto-suave"}`}>
                    {formatearLempiras(c.balance)}
                  </td>
                  <td className="px-4 py-3 text-texto-suave">{c.lastCreditAt ? formatearFechaHora(c.lastCreditAt) : "—"}</td>
                  <td className="px-4 py-3 text-texto-suave">{c.lastMovementAt ? formatearFechaHora(c.lastMovementAt) : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setAbiertoId(c.id)}
                      className="rounded-lg border border-borde px-3 py-1.5 text-xs font-semibold hover:border-marca hover:text-marca"
                    >
                      {c.balance > 0 ? "Abonar" : "Ver"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {abierto && (
        <DialogoCliente
          cliente={abierto}
          abonos={abonos[abierto.id] ?? []}
          onCerrar={() => setAbiertoId(null)}
        />
      )}
    </>
  );
}