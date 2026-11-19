import type { Metadata } from "next";
import { Suspense } from "react";
import { listarVentas } from "@/lib/api/ventas";
import { HistorialVentas } from "./historial-ventas";

export const metadata: Metadata = {
  title: "Ventas | Mercadito Daniela",
};

// La API devuelve como máximo las 100 ventas más recientes.
const LIMITE = 100;

export default function VentasPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 bg-fondo p-6">
      <div>
        <h1 className="text-2xl font-bold">Ventas</h1>
        <p className="text-texto-suave">
          Historial de ventas. Desde aquí puede ver la factura o anular una venta.
        </p>
      </div>

      <Suspense fallback={<p className="text-texto-suave">Cargando ventas...</p>}>
        <Contenido />
      </Suspense>
    </main>
  );
}

async function Contenido() {
  const ventas = await listarVentas(LIMITE);
  return <HistorialVentas ventas={ventas} limite={LIMITE} />;
}