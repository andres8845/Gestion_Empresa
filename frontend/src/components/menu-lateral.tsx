"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NotebookPen,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Sparkles,
  Vault,
  type LucideIcon,
} from "lucide-react";

type Opcion = {
  href: string;
  texto: string;
  icono: LucideIcon;
  lista: boolean; // false = la pantalla todavía no se ha construido
};

// Orden según el flujo del usuario en la tienda.
const opciones: Opcion[] = [
  { href: "/cobro", texto: "Cobro", icono: ShoppingCart, lista: true },
  { href: "/inventario", texto: "Inventario", icono: Package, lista: true },
  { href: "/fiado", texto: "Fiado", icono: NotebookPen, lista: false },
  { href: "/ventas", texto: "Ventas", icono: Receipt, lista: true },
  { href: "/sugerencias", texto: "Sugerencias", icono: Sparkles, lista: false },
  { href: "/caja/cerrar", texto: "Cerrar caja", icono: Vault, lista: false },
  { href: "/ajustes", texto: "Ajustes", icono: Settings, lista: false },
];

// Lee la página actual para marcar la opción activa.
export function MenuLateral() {
  const pathname = usePathname();
  return <MenuOpciones pathname={pathname} />;
}

// El menú en sí. Mientras carga la página actual se muestra sin
// ninguna opción marcada (pathname vacío).
export function MenuOpciones({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-col gap-1">
      {opciones.map(({ href, texto, icono: Icono, lista }) => {
        const activa = pathname.startsWith(href);

        if (!lista) {
          return (
            <span
              key={href}
              className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-texto-suave/60"
              title="Pantalla en construcción"
            >
              <Icono size={20} />
              <span className="flex-1">{texto}</span>
              <span className="rounded bg-borde/50 px-1.5 py-0.5 text-[10px] font-medium uppercase">
                Pronto
              </span>
            </span>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium transition ${
              activa
                ? "bg-marca text-white"
                : "text-texto hover:bg-fondo"
            }`}
          >
            <Icono size={20} />
            {texto}
          </Link>
        );
      })}
    </nav>
  );
}