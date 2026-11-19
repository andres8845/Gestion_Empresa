"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard, UserX } from "lucide-react";
import { Modal } from "@/components/modal";
import { formatearFechaHora, formatearLempiras } from "@/lib/formato";
import { parsearMonto } from "@/lib/cobro/pago";
import type { AbonoFiado, ClienteFiado } from "@/lib/api/fiado";
import { eliminarClienteAction, registrarAbonoAction } from "./actions";

type Props = {
  cliente: ClienteFiado;
  abonos: AbonoFiado[];
  onCerrar: () => void;
};

// Detalle de un cliente: registrar abonos (RN-43) y borrarlo al pagar (RN-46).
export function DialogoCliente({ cliente, abonos, onCerrar }: Props) {
  const router = useRouter();
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState<"efectivo" | "tarjeta">("efectivo");
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [error, setError] = useState("");
  const [guardando, iniciar] = useTransition();

  const montoNum = monto.trim() === "" ? null : parsearMonto(monto);
  const montoValido = montoNum !== null && montoNum > 0 && montoNum <= cliente.balance;
  const saldoDespues = montoValido ? cliente.balance - montoNum : null;

  function abonar(e: React.FormEvent) {
    e.preventDefault();
    if (!montoValido) return;
    setError("");
    iniciar(async () => {
      const r = await registrarAbonoAction(cliente.id, montoNum, metodo);
      if (r.error) {
        setError(r.error);
        return;
      }
      setMonto("");
      router.refresh();
    });
  }

  function borrar() {
    setError("");
    iniciar(async () => {
      const r = await eliminarClienteAction(cliente.id);
      if (r.error) {
        setError(r.error);
        return;
      }
      onCerrar();
      router.refresh();
    });
  }

  return (
    <Modal titulo={cliente.aliasName} onCerrar={guardando ? () => {} : onCerrar} ancho="grande">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-3">
          <div className={`col-span-1 rounded-xl p-4 ${cliente.balance > 0 ? "bg-aviso/10 text-aviso" : "bg-marca/10 text-marca"}`}>
            <p className="text-sm">Debe</p>
            <p className="text-2xl font-bold tabular-nums">{formatearLempiras(cliente.balance)}</p>
          </div>
          <Dato titulo="Último fiado" valor={cliente.lastCreditAt ? formatearFechaHora(cliente.lastCreditAt) : "—"} />
          <Dato titulo="Último movimiento" valor={cliente.lastMovementAt ? formatearFechaHora(cliente.lastMovementAt) : "—"} />
        </div>

        {/* ---------- Registrar abono ---------- */}
        {cliente.balance > 0 && (
          <form onSubmit={abonar} className="flex flex-col gap-3 rounded-xl border border-borde p-4">
            <p className="font-semibold">Registrar abono</p>
            <div className="flex gap-2">
              <div className="flex h-12 flex-1 items-center rounded-lg border border-borde focus-within:border-marca focus-within:ring-2 focus-within:ring-marca/30">
                <span className="pl-3 font-semibold text-texto-suave">L</span>
                <input
                  value={monto}
                  onChange={(e) => {
                    setMonto(e.target.value);
                    setError("");
                  }}
                  autoFocus
                  inputMode="decimal"
                  autoComplete="off"
                  aria-label="Monto del abono"
                  placeholder="0.00"
                  className="h-full w-full bg-transparent px-2 text-xl font-semibold tabular-nums outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setMonto(String(cliente.balance))}
                className="rounded-lg border border-borde px-3 text-sm font-semibold hover:border-marca hover:text-marca"
              >
                Todo
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Forma de pago del abono">
              {(
                [
                  ["efectivo", "Efectivo", Banknote],
                  ["tarjeta", "Tarjeta", CreditCard],
                ] as const
              ).map(([valor, texto, Icono]) => (
                <button
                  key={valor}
                  type="button"
                  role="radio"
                  aria-checked={metodo === valor}
                  onClick={() => setMetodo(valor)}
                  className={`flex items-center justify-center gap-2 rounded-lg border-2 py-2 font-semibold ${
                    metodo === valor ? "border-marca bg-marca/10 text-marca" : "border-borde"
                  }`}
                >
                  <Icono size={18} /> {texto}
                </button>
              ))}
            </div>

            {monto.trim() !== "" && !montoValido && (
              <p className="text-sm text-aviso">
                El abono debe ser mayor a cero y no pasar de {formatearLempiras(cliente.balance)}.
              </p>
            )}
            {saldoDespues !== null && (
              <p className="text-sm text-texto-suave">
                Después del abono quedará debiendo{" "}
                <strong className="text-texto">{formatearLempiras(saldoDespues)}</strong>.
              </p>
            )}

            <button
              type="submit"
              disabled={!montoValido || guardando}
              className="h-11 rounded-lg bg-marca font-semibold text-white hover:bg-marca-oscuro disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Registrar abono"}
            </button>
          </form>
        )}

        {/* ---------- Abonos registrados ---------- */}
        {abonos.length > 0 && (
          <div>
            <p className="mb-2 font-semibold">Abonos</p>
            <ul className="flex flex-col divide-y divide-borde/60 rounded-xl border border-borde">
              {abonos.map((a) => (
                <li key={a.id} className="flex justify-between px-4 py-2 text-sm">
                  <span>
                    {formatearFechaHora(a.createdAt)} ·{" "}
                    <span className="text-texto-suave">{a.paymentMethod === "efectivo" ? "Efectivo" : "Tarjeta"}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatearLempiras(a.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-peligro/10 px-4 py-3 text-sm font-medium text-peligro">
            {error}
          </p>
        )}

        {/* ---------- Borrar cliente (RN-45, RN-46) ---------- */}
        {cliente.balance === 0 && (
          <div className="rounded-xl border border-peligro/30 p-4">
            {!confirmarBorrado ? (
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-texto-suave">
                  Ya no debe nada. Puede borrar su registro para no guardar datos de más.
                </p>
                <button
                  type="button"
                  onClick={() => setConfirmarBorrado(true)}
                  className="flex shrink-0 items-center gap-2 rounded-lg border border-peligro px-3 py-2 text-sm font-semibold text-peligro hover:bg-peligro/5"
                >
                  <UserX size={16} /> Borrar cliente
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm">
                  Se borrará <strong>{cliente.aliasName}</strong> con todos sus cargos y abonos.
                  Sus ventas quedan en el historial, pero sin su nombre. <strong>No se puede deshacer.</strong>
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmarBorrado(false)}
                    disabled={guardando}
                    className="h-11 flex-1 rounded-lg border border-borde font-semibold hover:bg-fondo"
                  >
                    No borrar
                  </button>
                  <button
                    type="button"
                    onClick={borrar}
                    disabled={guardando}
                    className="h-11 flex-1 rounded-lg bg-peligro font-semibold text-white hover:bg-peligro/90 disabled:opacity-50"
                  >
                    {guardando ? "Borrando..." : "Sí, borrar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl bg-fondo p-4">
      <p className="text-sm text-texto-suave">{titulo}</p>
      <p className="mt-1 text-sm font-medium">{valor}</p>
    </div>
  );
}