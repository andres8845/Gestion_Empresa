import { Suspense } from "react";
import { MenuLateral } from "@/components/menu-lateral";
import { EstadoSesion } from "@/components/estado-sesion";

// Marco que comparten todas las pantallas del sistema (menos el login):
// menú a la izquierda y la pantalla a la derecha.
export default function SistemaLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-borde bg-white p-4">
        <div className="mb-6 flex items-center gap-2 px-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-marca text-sm font-bold text-white">
            MD
          </div>
          <span className="font-bold leading-tight">Mercadito Daniela</span>
        </div>

        <MenuLateral />

        <div className="mt-auto border-t border-borde pt-4">
          {/* Lee la sesión en cada petición, por eso va dentro de Suspense */}
          <Suspense fallback={<div className="h-20" />}>
            <EstadoSesion />
          </Suspense>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}