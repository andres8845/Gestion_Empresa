import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { obtenerCajaAbierta } from "@/lib/api/caja";
import { ErrorConsultaProductos, listarProductosActivos } from "@/lib/api/productos";
import { listarClientesFiado } from "@/lib/api/fiado";
import { PantallaCobro } from "./pantalla-cobro";

export const metadata: Metadata = {
  title: "Cobro | Mercadito Daniela",
};

export default function CobroPage() {
  return (
    <main className="flex flex-1 flex-col bg-fondo">
      <Suspense fallback={<p className="p-6 text-texto-suave">Cargando...</p>}>
        <Contenido />
      </Suspense>
    </main>
  );
}

async function Contenido() {
  const caja = await obtenerCajaAbierta();

  // No se puede cobrar sin una caja abierta, porque cada venta queda
  // ligada a la sesión de caja (para el cierre del día).
  if (!caja) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-bold">Cobro</h1>
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

  const [productos, clientes] = await Promise.all([
    listarProductosActivos().catch((error: unknown) => {
      if (!(error instanceof ErrorConsultaProductos)) throw error;
      console.error(error);
      return null;
    }),
    listarClientesFiado(),
  ]);

  if (!productos) {
    return (
      <p role="alert" className="p-6 text-peligro">
        No se pudieron cargar los productos. Vuelva a cargar la página para reintentar.
      </p>
    );
  }

  if (productos.length === 0) {
    return <p className="p-6 text-texto-suave">No hay productos activos para cobrar.</p>;
  }

  return <PantallaCobro productos={productos} clientes={clientes} />;
}
