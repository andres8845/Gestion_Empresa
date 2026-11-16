"use client";

import { useState } from "react";
import {
  Banknote,
  CreditCard,
  NotebookPen,
  Split,
  type LucideIcon,
} from "lucide-react";
import { Modal } from "@/components/modal";
import { formatearLempiras } from "@/lib/formato";
import { calcularPago, parsearMonto, type DatosPago } from "@/lib/cobro/pago";
import type { ClienteResumen } from "@/lib/api/fiado";
import { SelectorCliente, type ClienteElegido } from "./selector-cliente";

type Modo = "efectivo" | "tarjeta" | "fiado" | "mixto";

const modos: { valor: Modo; texto: string; icono: LucideIcon }[] = [
  { valor: "efectivo", texto: "Efectivo", icono: Banknote },
  { valor: "tarjeta", texto: "Tarjeta", icono: CreditCard },
  { valor: "fiado", texto: "Fiado", icono: NotebookPen },
  { valor: "mixto", texto: "Mixto", icono: Split },
];

// Billetes de Honduras para los botones rápidos de efectivo.
const billetes = [20, 50, 100, 200, 500, 1000];

type Props = {
  total: number;
  clientes: ClienteResumen[];
  guardando: boolean;
  errorServidor: string;
  onConfirmar: (pago: DatosPago, cliente: ClienteElegido | null) => void;
  onCerrar: () => void;
};

export function DialogoPago({
  total,
  clientes,
  guardando,
  errorServidor,
  onConfirmar,
  onCerrar,
}: Props) {
  const [modo, setModo] = useState<Modo>("efectivo");
  const [recibido, setRecibido] = useState("");
  const [tarjeta, setTarjeta] = useState("");
  const [fiado, setFiado] = useState("");
  const [cliente, setCliente] = useState<ClienteElegido | null>(null);

  // ---------- Armar el pago según el modo ----------
  const recibidoNum = parsearMonto(recibido);
  const tarjetaNum = parsearMonto(tarjeta);
  const fiadoNum = parsearMonto(fiado);
  const montosValidos =
    recibidoNum !== null && tarjetaNum !== null && fiadoNum !== null;

  let datos: DatosPago = { tarjeta: 0, fiado: 0, efectivoRecibido: 0 };
  if (montosValidos) {
    if (modo === "efectivo") datos = { tarjeta: 0, fiado: 0, efectivoRecibido: recibidoNum };
    if (modo === "tarjeta") datos = { tarjeta: total, fiado: 0, efectivoRecibido: 0 };
    if (modo === "fiado") datos = { tarjeta: 0, fiado: total, efectivoRecibido: 0 };
    if (modo === "mixto") datos = { tarjeta: tarjetaNum, fiado: fiadoNum, efectivoRecibido: recibidoNum };
  }

  const resultado = calcularPago(total, datos);
  const necesitaCliente = datos.fiado > 0;
  const faltaCliente = necesitaCliente && !cliente;
  const efectivoDebido = Math.max(0, total - datos.tarjeta - datos.fiado);
  const puedeConfirmar = montosValidos && resultado.ok && !faltaCliente && !guardando;

  function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!puedeConfirmar) return;
    onConfirmar(datos, necesitaCliente ? cliente : null);
  }

  // Botones rápidos: monto exacto y los billetes que alcanzan para pagar.
  const atajos = [
    efectivoDebido,
    ...billetes.filter((b) => b > efectivoDebido).slice(0, 3),
  ];

  return (
    <Modal titulo="Cobrar" onCerrar={guardando ? () => {} : onCerrar} ancho="grande">
      <form onSubmit={confirmar} className="flex flex-col gap-5">
        <div className="rounded-xl bg-fondo px-5 py-4">
          <p className="text-sm text-texto-suave">Total a pagar (ISV incluido)</p>
          <p className="text-4xl font-bold tabular-nums">{formatearLempiras(total)}</p>
        </div>

        {/* RN-27: efectivo, tarjeta, fiado o una combinación */}
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Forma de pago">
          {modos.map(({ valor, texto, icono: Icono }) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={modo === valor}
              onClick={() => setModo(valor)}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 font-semibold transition ${
                modo === valor
                  ? "border-marca bg-marca/10 text-marca"
                  : "border-borde hover:border-marca/50"
              }`}
            >
              <Icono size={22} />
              {texto}
            </button>
          ))}
        </div>

        {modo === "tarjeta" && (
          <p className="rounded-lg bg-marca/10 px-4 py-3 text-marca">
            Cobre <strong>{formatearLempiras(total)}</strong> en el POS de Banco
            Atlántida y confirme cuando salga aprobado.
          </p>
        )}

        {modo === "mixto" && (
          <div className="grid grid-cols-2 gap-3">
            <CampoMonto id="tarjeta" etiqueta="Con tarjeta" valor={tarjeta} onCambiar={setTarjeta} autoFocus />
            <CampoMonto id="fiado" etiqueta="Fiado" valor={fiado} onCambiar={setFiado} />
          </div>
        )}

        {necesitaCliente && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">¿A quién se le fía?</span>
            <SelectorCliente clientes={clientes} valor={cliente} onCambiar={setCliente} />
          </div>
        )}

        {(modo === "efectivo" || (modo === "mixto" && efectivoDebido > 0)) && (
          <div className="flex flex-col gap-2">
            {modo === "mixto" && (
              <p className="text-sm text-texto-suave">
                Falta pagar en efectivo:{" "}
                <strong className="text-texto">{formatearLempiras(efectivoDebido)}</strong>
              </p>
            )}
            <CampoMonto
              id="recibido"
              etiqueta="Efectivo recibido"
              valor={recibido}
              onCambiar={setRecibido}
              autoFocus={modo === "efectivo"}
              grande
            />
            <div className="flex gap-2">
              {atajos.map((monto, i) => (
                <button
                  key={monto}
                  type="button"
                  onClick={() => setRecibido(String(monto))}
                  className="flex-1 rounded-lg border border-borde py-2 text-sm font-medium tabular-nums hover:border-marca hover:text-marca"
                >
                  {i === 0 ? "Exacto" : formatearLempiras(monto)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Resultado: cambio o lo que falta */}
        {!montosValidos ? (
          <p className="text-sm font-medium text-peligro">
            Revise los montos: solo números con máximo dos decimales.
          </p>
        ) : resultado.ok ? (
          efectivoDebido > 0 && (
            <div className="flex items-baseline justify-between rounded-xl bg-marca/10 px-5 py-3 text-marca">
              <span className="font-medium">Cambio</span>
              <span className="text-3xl font-bold tabular-nums">
                {formatearLempiras(resultado.cambio)}
              </span>
            </div>
          )
        ) : (
          (recibido !== "" || modo === "mixto") && (
            <p className="text-sm font-medium text-aviso">{resultado.error}</p>
          )
        )}

        {errorServidor && (
          <p role="alert" className="rounded-lg bg-peligro/10 px-4 py-3 font-medium text-peligro">
            {errorServidor}
          </p>
        )}

        <button
          type="submit"
          disabled={!puedeConfirmar}
          className="h-14 rounded-xl bg-marca text-lg font-bold text-white hover:bg-marca-oscuro disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando ? "Guardando venta..." : "Confirmar venta"}
        </button>
      </form>
    </Modal>
  );
}

function CampoMonto({
  id,
  etiqueta,
  valor,
  onCambiar,
  autoFocus,
  grande,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  onCambiar: (valor: string) => void;
  autoFocus?: boolean;
  grande?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </label>
      <div
        className={`flex items-center rounded-lg border border-borde focus-within:border-marca focus-within:ring-2 focus-within:ring-marca/30 ${
          grande ? "h-14" : "h-11"
        }`}
      >
        <span className="pl-4 font-semibold text-texto-suave">L</span>
        <input
          id={id}
          value={valor}
          onChange={(e) => onCambiar(e.target.value)}
          inputMode="decimal"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder="0.00"
          className={`h-full w-full bg-transparent px-3 font-semibold tabular-nums outline-none ${
            grande ? "text-2xl" : "text-lg"
          }`}
        />
      </div>
    </div>
  );
}