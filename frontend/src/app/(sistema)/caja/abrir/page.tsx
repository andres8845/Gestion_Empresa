import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { obtenerCajaAbierta } from "@/lib/api/caja";
import { formatearHora, formatearLempiras } from "@/lib/formato";
import { AbrirCajaForm } from "./abrir-caja-form";

export const metadata: Metadata = {
  title: "Abrir caja | Mercadito Daniela",
};

// RN-37: al iniciar el día se abre la caja con un monto inicial en efectivo.
export default function AbrirCajaPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-fondo p-8">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold">Abrir caja</h1>
        <p className="mt-1 mb-6 text-texto-suave">
          Cuente el efectivo que hay en la gaveta antes de empezar a vender.
        </p>

        <div className="rounded-2xl border border-borde bg-white p-6 shadow-sm">
          <Suspense fallback={<div className="h-64" />}>
            <Contenido />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

async function Contenido() {
  const caja = await obtenerCajaAbierta();

  // Si ya está abierta no se puede abrir otra (solo una a la vez).
  if (caja) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-lg bg-marca/10 px-4 py-3 font-medium text-marca">
          La caja ya está abierta desde las {formatearHora(caja.opened_at)} con{" "}
          {formatearLempiras(caja.initial_amount)}.
        </p>
        <Link
          href="/cobro"
          className="flex h-12 items-center justify-center rounded-lg bg-marca text-lg font-semibold text-white hover:bg-marca-oscuro"
        >
          Ir a cobrar
        </Link>
      </div>
    );
  }

  return <AbrirCajaForm />;
}