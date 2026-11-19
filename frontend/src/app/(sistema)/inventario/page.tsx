import type { Metadata } from "next";
import { Suspense } from "react";
import { listarCategorias, listarInventario } from "@/lib/api/inventario";
import { PantallaInventario } from "./pantalla-inventario";

export const metadata: Metadata = {
  title: "Inventario | Mercadito Daniela",
};

export default function InventarioPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 bg-fondo p-6">
      <Suspense fallback={<p className="text-texto-suave">Cargando inventario...</p>}>
        <Contenido />
      </Suspense>
    </main>
  );
}

async function Contenido() {
  const [productos, categorias] = await Promise.all([
    listarInventario(),
    listarCategorias(),
  ]);
  return <PantallaInventario productos={productos} categorias={categorias} />;
}