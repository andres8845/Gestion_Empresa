import "server-only";
import { redirect } from "next/navigation";
import { obtenerTokenSesion, SESSION_COOKIE } from "@/lib/session";
import type { Producto } from "@/lib/mock/productos";
import { categoriasMock, type Categoria } from "@/lib/mock/categorias";
import {
  inventarioMock,
  type MovimientoInventario,
  type ProductoInventario,
} from "@/lib/mock/inventario";
import { redondear } from "@/lib/cobro/carrito";

export type { Categoria, ProductoInventario };

const API_URL = process.env.API_URL ?? "http://localhost:3001";

// Lo que manda el formulario de producto.
export type DatosProducto = {
  code: string;
  name: string;
  categoryId: number;
  salePrice: number;
  cost: number | null;
  unitType: "unidad" | "libra";
  minStock: number;
  isvRate: number;
  requiresAgeVerification: boolean;
  isActive: boolean;
  stockInicial: number; // solo se usa al crear
};

export type Resultado = { ok: true } | { ok: false; error: string };

// ---------- Lectura ----------

export async function listarCategorias(): Promise<Categoria[]> {
  // TODO: GET /categorias
  return categoriasMock;
}

// Todos los productos (activos e inactivos) con los cambios simulados encima.
export async function listarInventario(): Promise<ProductoInventario[]> {
  const token = await obtenerTokenSesion();
  if (!token) redirect("/login");

  const response = await fetch(`${API_URL}/productos`, {
    headers: { Cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}` },
    cache: "no-store",
  });
  if (response.status === 401) redirect("/login");
  if (!response.ok) {
    throw new Error(`La API de productos respondió con HTTP ${response.status}.`);
  }

  const result = (await response.json()) as { success?: boolean; data?: Producto[] };
  if (result.success !== true || !Array.isArray(result.data)) {
    throw new Error("La API de productos devolvió una respuesta inválida.");
  }

  const reales: ProductoInventario[] = result.data.map((p) => ({
    ...p,
    cost: null,
    ...inventarioMock.cambios.get(p.id),
  }));

  return [...reales, ...inventarioMock.creados].sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  );
}

// ---------- Escritura (simulada) ----------

function validarProducto(
  datos: DatosProducto,
  todos: ProductoInventario[],
  idActual: number | null,
): string | null {
  const code = datos.code.trim();
  const name = datos.name.trim();

  if (!code || code.length > 30) return "El código debe tener entre 1 y 30 caracteres.";
  if (!/^[A-Za-z0-9-]+$/.test(code)) return "El código solo puede tener letras, números y guiones.";
  // RN-10: el código es único.
  const repetido = todos.find(
    (p) => p.code.toUpperCase() === code.toUpperCase() && p.id !== idActual,
  );
  if (repetido) return `El código ${code} ya lo usa "${repetido.name}".`;

  // RN-11: nombre obligatorio y precio mayor a cero.
  if (!name || name.length > 80) return "El nombre debe tener entre 1 y 80 caracteres.";
  if (!(datos.salePrice > 0)) return "El precio de venta debe ser mayor a cero.";
  if (datos.cost !== null && datos.cost < 0) return "El costo no puede ser negativo.";
  if (!categoriasMock.some((c) => c.id === datos.categoryId)) return "Elija una categoría.";
  if (![0, 15, 18].includes(datos.isvRate)) return "El ISV debe ser 0%, 15% o 18%.";
  if (datos.minStock < 0) return "El stock mínimo no puede ser negativo.";
  if (idActual === null && datos.stockInicial < 0) return "El stock inicial no puede ser negativo.";
  if (datos.unitType === "unidad" && !Number.isInteger(datos.stockInicial)) {
    return "Un producto por unidad no puede tener stock con decimales.";
  }
  return null;
}

// TODO: POST /productos (crear) y PATCH /productos/:id (editar).
// El cambio de precio debe quedar en audit_logs (RN-08).
export async function guardarProducto(
  datos: DatosProducto,
  id: number | null,
  userId: number,
): Promise<Resultado> {
  const todos = await listarInventario();
  const error = validarProducto(datos, todos, id);
  if (error) return { ok: false, error };

  const campos = {
    code: datos.code.trim().toUpperCase(),
    name: datos.name.trim().replace(/\s+/g, " "),
    categoryId: datos.categoryId,
    salePrice: redondear(datos.salePrice),
    cost: datos.cost === null ? null : redondear(datos.cost),
    unitType: datos.unitType,
    minStock: datos.minStock,
    isvRate: datos.isvRate,
    requiresAgeVerification: datos.requiresAgeVerification,
    isActive: datos.isActive,
  };

  if (id === null) {
    const nuevo: ProductoInventario = {
      ...campos,
      id: inventarioMock.siguienteId++,
      stock: datos.stockInicial,
      parentProductId: null,
      unitsPerPackage: 1,
    };
    inventarioMock.creados.push(nuevo);
    if (datos.stockInicial > 0) {
      registrarMovimiento(nuevo.id, "entrada_mercaderia", 0, datos.stockInicial, "Stock inicial", userId);
    }
    return { ok: true };
  }

  const actual = todos.find((p) => p.id === id);
  if (!actual) return { ok: false, error: "El producto ya no existe." };
  aplicarCambio(id, campos);
  return { ok: true };
}

// RN-15: entrada de mercadería. Suma al stock y puede actualizar el costo.
// TODO: POST /productos/:id/entradas  body: { quantity, cost? }
export async function registrarEntrada(
  id: number,
  cantidad: number,
  costo: number | null,
  userId: number,
): Promise<Resultado> {
  const producto = (await listarInventario()).find((p) => p.id === id);
  if (!producto) return { ok: false, error: "El producto ya no existe." };
  if (producto.parentProductId !== null) {
    return { ok: false, error: "Los paquetes usan el stock de su producto suelto." };
  }
  const error = validarCantidad(producto, cantidad, false);
  if (error) return { ok: false, error };
  if (costo !== null && costo < 0) return { ok: false, error: "El costo no puede ser negativo." };

  const nuevo = redondear(producto.stock + cantidad);
  aplicarCambio(id, { stock: nuevo, ...(costo !== null ? { cost: redondear(costo) } : {}) });
  registrarMovimiento(id, "entrada_mercaderia", producto.stock, nuevo, null, userId);
  return { ok: true };
}

// RN-16: ajuste manual del stock, con el valor anterior, el nuevo y el motivo.
// TODO: POST /productos/:id/ajustes  body: { newStock, reason? }  (+ audit_logs)
export async function ajustarStock(
  id: number,
  nuevoStock: number,
  motivo: string,
  userId: number,
): Promise<Resultado> {
  const producto = (await listarInventario()).find((p) => p.id === id);
  if (!producto) return { ok: false, error: "El producto ya no existe." };
  if (producto.parentProductId !== null) {
    return { ok: false, error: "Los paquetes usan el stock de su producto suelto." };
  }
  const error = validarCantidad(producto, nuevoStock, true);
  if (error) return { ok: false, error };
  if (nuevoStock === producto.stock) return { ok: false, error: "El stock nuevo es igual al actual." };

  aplicarCambio(id, { stock: nuevoStock });
  registrarMovimiento(id, "ajuste_manual", producto.stock, nuevoStock, motivo || null, userId);
  return { ok: true };
}

// ---------- Ayudantes ----------

function validarCantidad(
  producto: ProductoInventario,
  cantidad: number,
  aceptaCero: boolean,
): string | null {
  if (!Number.isFinite(cantidad) || cantidad < 0 || (!aceptaCero && cantidad === 0)) {
    return aceptaCero ? "El stock no puede ser negativo." : "La cantidad debe ser mayor a cero.";
  }
  if (producto.unitType === "unidad" && !Number.isInteger(cantidad)) {
    return "Este producto se cuenta por unidad, sin decimales.";
  }
  if (redondear(cantidad) !== cantidad) return "Use máximo dos decimales.";
  return null;
}

function aplicarCambio(id: number, cambio: Partial<ProductoInventario>) {
  const creado = inventarioMock.creados.find((p) => p.id === id);
  if (creado) {
    Object.assign(creado, cambio);
    return;
  }
  inventarioMock.cambios.set(id, { ...inventarioMock.cambios.get(id), ...cambio });
}

function registrarMovimiento(
  productId: number,
  movementType: MovimientoInventario["movementType"],
  previousStock: number,
  newStock: number,
  reason: string | null,
  userId: number,
) {
  inventarioMock.movimientos.push({
    id: inventarioMock.movimientos.length + 1,
    productId,
    movementType,
    quantity: redondear(newStock - previousStock),
    previousStock,
    newStock,
    reason,
    userId,
    createdAt: new Date(),
  });
}