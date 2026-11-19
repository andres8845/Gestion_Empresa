
import type { Producto } from "@/lib/mock/productos";

export type ProductoInventario = Producto & {
  cost: number | null; // la API todavía no devuelve el costo
};

export type MovimientoInventario = {
  id: number;
  productId: number;
  movementType: "entrada_mercaderia" | "ajuste_manual";
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string | null;
  userId: number;
  createdAt: Date;
};

type EstadoInventario = {
  creados: ProductoInventario[];
  cambios: Map<number, Partial<ProductoInventario>>;
  movimientos: MovimientoInventario[];
  siguienteId: number;
};

const memoria = globalThis as unknown as { inventario?: EstadoInventario };
memoria.inventario ??= {
  creados: [],
  cambios: new Map(),
  movimientos: [],
  // Ids altos para que no choquen con los de la base de datos.
  siguienteId: 100000,
};

export const inventarioMock = memoria.inventario;