import type { Metadata } from "next";
import { Suspense } from "react";
import { listarAbonos, listarClientes } from "@/lib/api/fiado";
import { PantallaFiado } from "./pantalla-fiado";

export const metadata: Metadata = {
  title: "Fiado | Mercadito Daniela",
};

export default function FiadoPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 bg-fondo p-6">
      <div>
        <h1 className="text-2xl font-bold">Fiado</h1>
        <p className="text-texto-suave">
          Clientes con cuenta. Del cliente solo se guarda su nombre o apodo.
        </p>
      </div>

      <Suspense fallback={<p className="text-texto-suave">Cargando clientes...</p>}>
        <Contenido />
      </Suspense>
    </main>
  );
}

async function Contenido() {
  const [clientes, abonos] = await Promise.all([listarClientes(), listarAbonos()]);
  return <PantallaFiado clientes={clientes} abonos={abonos} />;
}