// Cálculos del carrito de cobro. Son funciones puras (sin pantalla),
// así se pueden reutilizar y probar fácil.
import type { Producto } from "@/lib/mock/productos";

export type LineaCarrito = {
  producto: Producto;
  cantidad: number; // unidades o libras
};

// RN-06: todos los montos con dos decimales.
export function redondear(monto: number): number {
  return Math.round((monto + Number.EPSILON) * 100) / 100;
}

// RN-23: libras por precio, redondeado a dos decimales.
export function subtotalLinea(linea: LineaCarrito): number {
  return redondear(linea.cantidad * linea.producto.salePrice);
}

export function totalCarrito(lineas: LineaCarrito[]): number {
  return redondear(lineas.reduce((suma, l) => suma + subtotalLinea(l), 0));
}

// Busca por código exacto (lo que manda el escáner o lo que se teclea).
export function buscarPorCodigo(
  productos: Producto[],
  codigo: string,
): Producto | undefined {
  const limpio = codigo.trim().toUpperCase();
  return productos.find((p) => p.code.toUpperCase() === limpio);
}

// Quita tildes para que "azucar" encuentre "Azúcar".
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// RN-22: sugerencias desde que se escriben 2 letras, por nombre o código.
export function buscarPorTexto(
  productos: Producto[],
  texto: string,
  limite = 8,
): Producto[] {
  const buscado = normalizar(texto.trim());
  if (buscado.length < 2) return [];

  return productos
    .filter(
      (p) =>
        normalizar(p.name).includes(buscado) ||
        normalizar(p.code).includes(buscado),
    )
    .slice(0, limite);
}

// Agrega un producto. Si ya está en el carrito, suma la cantidad (RN-20).
export function agregarAlCarrito(
  lineas: LineaCarrito[],
  producto: Producto,
  cantidad: number,
): LineaCarrito[] {
  const existe = lineas.some((l) => l.producto.id === producto.id);
  if (!existe) {
    return [...lineas, { producto, cantidad }];
  }
  return lineas.map((l) =>
    l.producto.id === producto.id
      ? { ...l, cantidad: redondear(l.cantidad + cantidad) }
      : l,
  );
}

// RN-25: devuelve los ids de las líneas que piden más de lo que hay.
// Un paquete descuenta del producto padre (ej. 1 paquete = 6 aguas), así que
// se suma lo que piden el producto suelto y sus paquetes juntos.
export function lineasSinStock(
  lineas: LineaCarrito[],
  productos: Producto[],
): Set<number> {
  const pedidoPorBase = new Map<number, number>();

  for (const { producto, cantidad } of lineas) {
    const baseId = producto.parentProductId ?? producto.id;
    const unidades = cantidad * producto.unitsPerPackage;
    pedidoPorBase.set(baseId, (pedidoPorBase.get(baseId) ?? 0) + unidades);
  }

  const sinStock = new Set<number>();
  for (const { producto } of lineas) {
    const baseId = producto.parentProductId ?? producto.id;
    const base = productos.find((p) => p.id === baseId);
    const disponible = base?.stock ?? 0;
    if ((pedidoPorBase.get(baseId) ?? 0) > disponible) {
      sinStock.add(producto.id);
    }
  }
  return sinStock;
}

// Stock que se muestra al cajero, en la unidad del producto.
// Para un paquete: cuántos paquetes completos alcanzan.
export function stockDisponible(
  producto: Producto,
  productos: Producto[],
): number {
  if (producto.parentProductId === null) return producto.stock;
  const base = productos.find((p) => p.id === producto.parentProductId);
  return Math.floor((base?.stock ?? 0) / producto.unitsPerPackage);
}

// Para escribir cantidades sin decimales de más: 2 -> "2", 1.5 -> "1.50 lb"
export function formatearCantidad(linea: LineaCarrito): string {
  return linea.producto.unitType === "libra"
    ? `${linea.cantidad.toFixed(2)} lb`
    : String(linea.cantidad);
}