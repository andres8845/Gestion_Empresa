"use client";

import { Printer } from "lucide-react";

export function BotonImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-borde bg-white font-semibold hover:bg-fondo"
    >
      <Printer size={20} />
      Imprimir
    </button>
  );
}