import "server-only";
import { connection } from "next/server";
import { productosMock, type Producto } from "@/lib/mock/productos";

export type { Producto };

// Productos que se pueden vender. Los desactivados no aparecen al cobrar (RN-14).
// La tienda tiene pocos productos, así que se mandan todos a la pantalla
// de cobro y la búsqueda es instantánea, sin esperar al servidor.
export async function listarProductosActivos(): Promise<Producto[]> {
  await connection(); // el stock cambia, siempre se lee al momento
  // TODO: GET /productos?activos=true (Nest los toma de Redis)
  return productosMock.filter((p) => p.isActive);
}