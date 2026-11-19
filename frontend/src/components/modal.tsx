"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

type Props = {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  ancho?: "normal" | "grande" | "extra";
};

// Ventana que aparece encima de la pantalla. Se cierra con Escape,
// con la X o tocando fuera de ella.
export function Modal({ titulo, onCerrar, children, ancho = "normal" }: Props) {
  useEffect(() => {
    function alPresionar(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [onCerrar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`max-h-[95vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl ${
          ancho === "extra" ? "max-w-3xl" : ancho === "grande" ? "max-w-xl" : "max-w-md"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-1.5 text-texto-suave hover:bg-fondo"
          >
            <X size={20} />
            <span className="sr-only">Cerrar</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}