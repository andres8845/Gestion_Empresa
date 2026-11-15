"use client";

import { useMemo, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { formatearLempiras } from "@/lib/formato";
import type { ClienteResumen } from "@/lib/api/fiado";

export type ClienteElegido =
  | { tipo: "existente"; id: number; aliasName: string; balance: number }
  | { tipo: "nuevo"; alias: string };

type Props = {
  clientes: ClienteResumen[];
  valor: ClienteElegido | null;
  onCambiar: (cliente: ClienteElegido | null) => void;
};

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// Elegir a quién se le fía, o registrar un cliente nuevo ahí mismo (RN-40).
// RN-38: solo se pide el nombre o apodo.
export function SelectorCliente({ clientes, valor, onCambiar }: Props) {
  const [texto, setTexto] = useState("");

  const encontrados = useMemo(() => {
    const buscado = normalizar(texto);
    return clientes
      .filter((c) => normalizar(c.aliasName).includes(buscado))
      .slice(0, 6);
  }, [clientes, texto]);

  const nombreLimpio = texto.trim().replace(/\s+/g, " ");
  const existeIgual = clientes.some(
    (c) => normalizar(c.aliasName) === normalizar(nombreLimpio),
  );

  // Ya hay un cliente elegido: se muestra con opción de cambiarlo.
  if (valor) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-marca bg-marca/5 px-4 py-3">
        <div>
          <p className="font-semibold">
            {valor.tipo === "existente" ? valor.aliasName : valor.alias}
          </p>
          <p className="text-sm text-texto-suave">
            {valor.tipo === "existente"
              ? `Debe actualmente ${formatearLempiras(valor.balance)}`
              : "Cliente nuevo, se registra al confirmar"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onCambiar(null)}
          className="text-sm font-semibold text-marca hover:underline"
        >
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-11 items-center gap-2 rounded-lg border border-borde px-3 focus-within:border-marca focus-within:ring-2 focus-within:ring-marca/30">
        <Search size={18} className="text-texto-suave" />
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            // Enter dentro del buscador no debe confirmar la venta.
            if (e.key === "Enter") e.preventDefault();
          }}
          maxLength={40}
          autoComplete="off"
          aria-label="Buscar cliente de fiado"
          placeholder="Nombre o apodo del cliente"
          className="h-full flex-1 bg-transparent outline-none"
        />
      </div>

      <ul className="flex flex-col overflow-hidden rounded-lg border border-borde">
        {encontrados.map((c) => (
          <li key={c.id} className="border-b border-borde/60 last:border-0">
            <button
              type="button"
              onClick={() => onCambiar({ tipo: "existente", ...c })}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-fondo"
            >
              <span className="font-medium">{c.aliasName}</span>
              <span className="text-sm text-texto-suave tabular-nums">
                Debe {formatearLempiras(c.balance)}
              </span>
            </button>
          </li>
        ))}

        {nombreLimpio && !existeIgual && (
          <li>
            <button
              type="button"
              onClick={() => onCambiar({ tipo: "nuevo", alias: nombreLimpio })}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-medium text-marca hover:bg-marca/5"
            >
              <UserPlus size={18} />
              Registrar cliente nuevo: &quot;{nombreLimpio}&quot;
            </button>
          </li>
        )}

        {encontrados.length === 0 && !nombreLimpio && (
          <li className="px-4 py-2.5 text-sm text-texto-suave">
            No hay clientes de fiado. Escriba un nombre para registrarlo.
          </li>
        )}
      </ul>
    </div>
  );
}