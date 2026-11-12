import { Suspense } from "react";
import Link from "next/link";
import { obtenerCajaAbierta } from "@/lib/api/caja";

// Pantalla temporal: la pantalla real de cobro se hará en su propia rama.
export default function CobroPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-fondo p-8">
      <h1 className="text-2xl font-bold">Cobro</h1>
      <Suspense fallback={null}>
        <RequiereCaja />
      </Suspense>
    </main>
  );
}

// No se puede cobrar sin una caja abierta, porque cada venta queda
// ligada a la sesión de caja (para el cierre del día).
async function RequiereCaja() {
  const caja = await obtenerCajaAbierta();

  if (!caja) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-texto-suave">
          La caja está cerrada. Ábrala para empezar a cobrar.
        </p>
        <Link
          href="/caja/abrir"
          className="rounded-lg bg-marca px-6 py-3 font-semibold text-white hover:bg-marca-oscuro"
        >
          Abrir caja
        </Link>
      </div>
    );
  }

  return (
    <p className="text-texto-suave">
      Caja lista. Esta pantalla se construye en el siguiente paso.
    </p>
  );
}