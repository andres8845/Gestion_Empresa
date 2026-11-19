"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { Ban, ChevronDown, ChevronRight, ReceiptText, Search } from "lucide-react";
import { formatearFechaHora, formatearLempiras } from "@/lib/formato";
import { redondear } from "@/lib/cobro/carrito";
import type { Venta } from "@/lib/api/ventas";
import { DialogoAnular } from "./dialogo-anular";

type Periodo = "hoy" | "ayer" | "semana" | "todas";
type Estado = "todas" | "activa" | "anulada";
type Metodo = "todos" | "efectivo" | "tarjeta" | "fiado";

const nombresPago = { efectivo: "Efectivo", tarjeta: "Tarjeta", fiado: "Fiado" } as const;

// Día de una fecha en hora de Honduras, como "2026-11-18".
const formatoDia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Tegucigalpa" });
const claveDia = (fecha: Date) => formatoDia.format(fecha);
const haceDias = (dias: number) => claveDia(new Date(Date.now() - dias * 86_400_000));

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

type Props = {
  ventas: Venta[];
  limite: number;
};

export function HistorialVentas({ ventas, limite }: Props) {
  const [periodo, setPeriodo] = useState<Periodo>("hoy");
  const [estado, setEstado] = useState<Estado>("todas");
  const [metodo, setMetodo] = useState<Metodo>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [abierta, setAbierta] = useState<number | null>(null);
  const [anulando, setAnulando] = useState<Venta | null>(null);

  // ---------- Filtros ----------
  const filtradas = useMemo(() => {
    const hoy = haceDias(0);
    const ayer = haceDias(1);
    const semana = haceDias(6);
    const buscado = normalizar(busqueda);

    return ventas.filter((v) => {
      const dia = claveDia(v.createdAt);
      if (periodo === "hoy" && dia !== hoy) return false;
      if (periodo === "ayer" && dia !== ayer) return false;
      if (periodo === "semana" && dia < semana) return false;
      if (estado !== "todas" && v.status !== estado) return false;
      if (metodo !== "todos" && !v.payments.some((p) => p.paymentMethod === metodo)) return false;
      if (buscado) {
        const enFactura = normalizar(v.invoiceNumber).includes(buscado);
        const enUsuario = normalizar(v.username).includes(buscado);
        const enProducto = v.details.some((d) => normalizar(d.productName).includes(buscado));
        if (!enFactura && !enUsuario && !enProducto) return false;
      }
      return true;
    });
  }, [ventas, periodo, estado, metodo, busqueda]);

  // ---------- Resumen (solo ventas activas) ----------
  const resumen = useMemo(() => {
    const activas = filtradas.filter((v) => v.status === "activa");
    const porMetodo = { efectivo: 0, tarjeta: 0, fiado: 0 };
    for (const v of activas) {
      for (const p of v.payments) porMetodo[p.paymentMethod] += p.amount;
    }
    return {
      cantidad: activas.length,
      anuladas: filtradas.length - activas.length,
      total: redondear(activas.reduce((s, v) => s + v.total, 0)),
      efectivo: redondear(porMetodo.efectivo),
      tarjeta: redondear(porMetodo.tarjeta),
      fiado: redondear(porMetodo.fiado),
    };
  }, [filtradas]);

  return (
    <div className="flex flex-col gap-5">
      {/* ---------- Resumen ---------- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tarjeta titulo="Total vendido" valor={formatearLempiras(resumen.total)} destacada />
        <Tarjeta
          titulo="Ventas"
          valor={String(resumen.cantidad)}
          nota={resumen.anuladas > 0 ? `${resumen.anuladas} anulada${resumen.anuladas === 1 ? "" : "s"}` : undefined}
        />
        <Tarjeta titulo="Efectivo" valor={formatearLempiras(resumen.efectivo)} />
        <Tarjeta titulo="Tarjeta" valor={formatearLempiras(resumen.tarjeta)} />
        <Tarjeta titulo="Fiado" valor={formatearLempiras(resumen.fiado)} />
      </div>

      {/* ---------- Filtros ---------- */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-borde bg-white p-1" role="radiogroup" aria-label="Periodo">
          {(
            [
              ["hoy", "Hoy"],
              ["ayer", "Ayer"],
              ["semana", "7 días"],
              ["todas", "Todas"],
            ] as const
          ).map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={periodo === valor}
              onClick={() => setPeriodo(valor)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                periodo === valor ? "bg-marca text-white" : "hover:bg-fondo"
              }`}
            >
              {texto}
            </button>
          ))}
        </div>

        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as Estado)}
          aria-label="Estado"
          className="h-10 rounded-lg border border-borde bg-white px-3 text-sm"
        >
          <option value="todas">Activas y anuladas</option>
          <option value="activa">Solo activas</option>
          <option value="anulada">Solo anuladas</option>
        </select>

        <select
          value={metodo}
          onChange={(e) => setMetodo(e.target.value as Metodo)}
          aria-label="Forma de pago"
          className="h-10 rounded-lg border border-borde bg-white px-3 text-sm"
        >
          <option value="todos">Todas las formas de pago</option>
          <option value="efectivo">Con efectivo</option>
          <option value="tarjeta">Con tarjeta</option>
          <option value="fiado">Con fiado</option>
        </select>

        <div className="flex h-10 min-w-64 flex-1 items-center gap-2 rounded-lg border border-borde bg-white px-3 focus-within:border-marca">
          <Search size={18} className="text-texto-suave" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar venta"
            placeholder="Buscar por factura, producto o usuario"
            className="h-full flex-1 bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      {/* ---------- Tabla ---------- */}
      <div className="overflow-hidden rounded-xl border border-borde bg-white">
        {filtradas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center text-texto-suave">
            <ReceiptText size={36} strokeWidth={1.5} />
            <p>No hay ventas con estos filtros.</p>
            {periodo !== "todas" && (
              <button
                type="button"
                onClick={() => setPeriodo("todas")}
                className="font-semibold text-marca hover:underline"
              >
                Ver todas las fechas
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-borde bg-fondo/60 text-left text-texto-suave">
              <tr>
                <th className="w-8" />
                <th className="px-3 py-2.5 font-medium">Factura</th>
                <th className="px-3 py-2.5 font-medium">Fecha y hora</th>
                <th className="px-3 py-2.5 font-medium">Atendió</th>
                <th className="px-3 py-2.5 font-medium">Pago</th>
                <th className="px-3 py-2.5 text-right font-medium">Total</th>
                <th className="px-3 py-2.5 font-medium">Estado</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtradas.map((v) => {
                const expandida = abierta === v.id;
                const anulada = v.status === "anulada";
                return (
                  <Fragment key={v.id}>
                    <tr
                      onClick={() => setAbierta(expandida ? null : v.id)}
                      className={`cursor-pointer border-b border-borde/60 hover:bg-fondo/50 ${
                        anulada ? "text-texto-suave" : ""
                      }`}
                    >
                      <td className="pl-3">
                        {expandida ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </td>
                      <td className="px-3 py-3 font-mono font-medium">{v.invoiceNumber}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{formatearFechaHora(v.createdAt)}</td>
                      <td className="px-3 py-3 capitalize">{v.username}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {v.payments.map((p) => (
                            <span
                              key={p.paymentMethod}
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                p.paymentMethod === "fiado"
                                  ? "bg-aviso/10 text-aviso"
                                  : "bg-fondo text-texto"
                              }`}
                            >
                              {nombresPago[p.paymentMethod]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td
                        className={`px-3 py-3 text-right font-semibold whitespace-nowrap tabular-nums ${
                          anulada ? "line-through" : ""
                        }`}
                      >
                        {formatearLempiras(v.total)}
                      </td>
                      <td className="px-3 py-3">
                        {anulada ? (
                          <span className="rounded-full bg-peligro/10 px-2 py-0.5 text-xs font-semibold text-peligro">
                            Anulada
                          </span>
                        ) : (
                          <span className="rounded-full bg-marca/10 px-2 py-0.5 text-xs font-semibold text-marca">
                            Activa
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/ventas/${v.id}/factura`}
                            className="rounded-lg border border-borde px-3 py-1.5 text-xs font-semibold hover:border-marca hover:text-marca"
                          >
                            Factura
                          </Link>
                          {!anulada && (
                            <button
                              type="button"
                              onClick={() => setAnulando(v)}
                              className="flex items-center gap-1 rounded-lg border border-borde px-3 py-1.5 text-xs font-semibold text-peligro hover:border-peligro hover:bg-peligro/5"
                            >
                              <Ban size={14} />
                              Anular
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {expandida && (
                      <tr className="border-b border-borde/60 bg-fondo/40">
                        <td />
                        <td colSpan={7} className="px-3 py-3">
                          {anulada && v.voidReason && (
                            <p className="mb-2 text-sm text-peligro">
                              <span className="font-semibold">Motivo de anulación:</span> {v.voidReason}
                            </p>
                          )}
                          <ul className="flex flex-col gap-1">
                            {v.details.map((d) => (
                              <li key={d.productId} className="flex justify-between gap-4">
                                <span>
                                  {d.unitType === "libra" ? `${d.quantity.toFixed(2)} lb` : `${d.quantity} ×`}{" "}
                                  {d.productName}
                                </span>
                                <span className="tabular-nums">{formatearLempiras(d.subtotal)}</span>
                              </li>
                            ))}
                          </ul>
                          {v.cashReceived > 0 && (
                            <p className="mt-2 text-texto-suave">
                              Recibió {formatearLempiras(v.cashReceived)} en efectivo, cambio{" "}
                              {formatearLempiras(v.changeGiven)}.
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {ventas.length >= limite && (
        <p className="text-center text-sm text-texto-suave">
          Se muestran las {limite} ventas más recientes.
        </p>
      )}

      {anulando && <DialogoAnular venta={anulando} onCerrar={() => setAnulando(null)} />}
    </div>
  );
}

function Tarjeta({
  titulo,
  valor,
  nota,
  destacada,
}: {
  titulo: string;
  valor: string;
  nota?: string;
  destacada?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        destacada ? "border-marca bg-marca text-white" : "border-borde bg-white"
      }`}
    >
      <p className={`text-sm ${destacada ? "text-white/80" : "text-texto-suave"}`}>{titulo}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{valor}</p>
      {nota && <p className="mt-0.5 text-xs text-peligro">{nota}</p>}
    </div>
  );
}