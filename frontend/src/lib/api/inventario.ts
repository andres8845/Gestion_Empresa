import "server-only";
import { redirect } from "next/navigation";
import { obtenerTokenSesion, SESSION_COOKIE } from "@/lib/session";
import { redondear } from "@/lib/cobro/carrito";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

// ---------- Tipos ----------

export type Categoria = {
  id: number;
  name: string;
};

export type ProductoInventario = {
  id: number;
  code: string;
  name: string;
  categoryId: number;
  salePrice: number;
  cost: number | null;
  unitType: "unidad" | "libra";
  stock: number;
  minStock: number;
  isvRate: number;
  requiresAgeVerification: boolean;
  isActive: boolean;
  parentProductId: number | null;
  unitsPerPackage: number;
};

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
  stockInicial: number;
};

export type Resultado =
  | { ok: true }
  | { ok: false; error: string };

type RespuestaApi<T> = {
  success?: boolean;
  data?: T;
  message?: string | string[];
};

// ---------- Cliente HTTP ----------

async function solicitar(
  ruta: string,
  metodo: "GET" | "POST" | "PUT" = "GET",
  datos?: object,
): Promise<Response> {
  const token = await obtenerTokenSesion();

  if (!token) redirect("/login");

  const response = await fetch(`${API_URL}${ruta}`, {
    method: metodo,
    headers: {
      Cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
      ...(datos !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
    },
    ...(datos !== undefined
      ? { body: JSON.stringify(datos) }
      : {}),
    cache: "no-store",
  });

  if (response.status === 401) redirect("/login");

  return response;
}

async function consultar<T>(ruta: string): Promise<T[]> {
  const response = await solicitar(ruta);

  if (!response.ok) {
    throw new Error(
      `La API respondió con HTTP ${response.status}.`,
    );
  }

  const result =
    (await response.json()) as RespuestaApi<T[]>;

  if (
    result.success !== true ||
    !Array.isArray(result.data)
  ) {
    throw new Error(
      "La API devolvió una respuesta inválida.",
    );
  }

  return result.data;
}

async function guardar(
  ruta: string,
  metodo: "POST" | "PUT",
  datos: object,
): Promise<Resultado> {
  const response = await solicitar(ruta, metodo, datos);

  const result = (await response
    .json()
    .catch(() => null)) as RespuestaApi<unknown> | null;

  if (!response.ok || result?.success !== true) {
    const mensaje = result?.message;

    return {
      ok: false,
      error: Array.isArray(mensaje)
        ? mensaje.join(". ")
        : mensaje ??
          `No se pudo completar la operación (HTTP ${response.status}).`,
    };
  }

  return { ok: true };
}

// ---------- Consultas ----------

// Obtener todas las categorías desde PostgreSQL.
export async function listarCategorias(): Promise<Categoria[]> {
  return consultar<Categoria>("/categorias");
}

// Obtener todos los productos, activos e inactivos.
export async function listarInventario(): Promise<ProductoInventario[]> {
  return consultar<ProductoInventario>("/productos");
}

// ---------- Productos ----------

function validarProducto(
  datos: DatosProducto,
  todos: ProductoInventario[],
  idActual: number | null,
  categorias: Categoria[],
): string | null {
  const code = datos.code.trim();
  const name = datos.name.trim();

  if (!code || code.length > 30) {
    return "El código debe tener entre 1 y 30 caracteres.";
  }

  if (!/^[A-Za-z0-9-]+$/.test(code)) {
    return "El código solo puede tener letras, números y guiones.";
  }

  const repetido = todos.find(
    (p) =>
      p.code.toUpperCase() === code.toUpperCase() &&
      p.id !== idActual,
  );

  if (repetido) {
    return `El código ${code} ya lo usa "${repetido.name}".`;
  }

  if (!name || name.length > 80) {
    return "El nombre debe tener entre 1 y 80 caracteres.";
  }

  if (!Number.isFinite(datos.salePrice) || datos.salePrice <= 0) {
    return "El precio de venta debe ser mayor a cero.";
  }

  if (
    datos.cost !== null &&
    (!Number.isFinite(datos.cost) || datos.cost < 0)
  ) {
    return "El costo no puede ser negativo.";
  }

  if (!categorias.some((c) => c.id === datos.categoryId)) {
    return "Elija una categoría válida.";
  }

  if (![0, 15, 18].includes(datos.isvRate)) {
    return "El ISV debe ser 0%, 15% o 18%.";
  }

  if (!Number.isFinite(datos.minStock) || datos.minStock < 0) {
    return "El stock mínimo no puede ser negativo.";
  }

  if (datos.unitType === "unidad" && !Number.isInteger(datos.minStock)) {
    return "El stock mínimo debe expresarse en unidades enteras.";
  }

  if (idActual === null) {
    if (
      !Number.isFinite(datos.stockInicial) ||
      datos.stockInicial < 0
    ) {
      return "El stock inicial no puede ser negativo.";
    }

    if (
      datos.unitType === "unidad" &&
      !Number.isInteger(datos.stockInicial)
    ) {
      return "Un producto por unidad no puede tener stock con decimales.";
    }

    if (redondear(datos.stockInicial) !== datos.stockInicial) {
      return "El stock inicial admite máximo dos decimales.";
    }
  }

  return null;
}

// Crear o actualizar un producto en PostgreSQL.
export async function guardarProducto(
  datos: DatosProducto,
  id: number | null,
): Promise<Resultado> {
  const [todos, categorias] = await Promise.all([
    listarInventario(),
    listarCategorias(),
  ]);

  const error = validarProducto(
    datos,
    todos,
    id,
    categorias,
  );

  if (error) return { ok: false, error };

  const campos = {
    code: datos.code.trim().toUpperCase(),
    name: datos.name.trim().replace(/\s+/g, " "),
    categoryId: datos.categoryId,
    salePrice: redondear(datos.salePrice),
    cost: datos.cost === null ? 0 : redondear(datos.cost),
    unitType: datos.unitType,
    minStock: datos.minStock,
    isvRate: datos.isvRate,
    requiresAgeVerification: datos.requiresAgeVerification,
    isActive: datos.isActive,
  };

  // Crear producto.
  if (id === null) {
    return guardar("/productos", "POST", {
      ...campos,
      stock: datos.stockInicial,
    });
  }

  // Actualizar producto existente.
  const actual = todos.find((p) => p.id === id);

  if (!actual) {
    return {
      ok: false,
      error: "El producto ya no existe.",
    };
  }

  return guardar(`/productos/${id}`, "PUT", campos);
}

// ---------- Movimientos de inventario ----------

// Registrar entrada de mercadería.
export async function registrarEntrada(
  id: number,
  cantidad: number,
  costo: number | null,
): Promise<Resultado> {
  const producto = (await listarInventario()).find(
    (p) => p.id === id,
  );

  if (!producto) {
    return {
      ok: false,
      error: "El producto ya no existe.",
    };
  }

  if (producto.parentProductId !== null) {
    return {
      ok: false,
      error: "Los paquetes usan el stock de su producto suelto.",
    };
  }

  const error = validarCantidad(
    producto,
    cantidad,
    false,
  );

  if (error) return { ok: false, error };

  if (
    costo !== null &&
    (!Number.isFinite(costo) || costo < 0)
  ) {
    return {
      ok: false,
      error: "El costo no puede ser negativo.",
    };
  }

  return guardar("/stock-movements/entries", "POST", {
    productId: id,
    quantity: cantidad,
    ...(costo !== null
      ? { cost: redondear(costo) }
      : {}),
  });
}

// Registrar ajuste manual de existencias.
export async function ajustarStock(
  id: number,
  nuevoStock: number,
  motivo: string,
): Promise<Resultado> {
  const producto = (await listarInventario()).find(
    (p) => p.id === id,
  );

  if (!producto) {
    return {
      ok: false,
      error: "El producto ya no existe.",
    };
  }

  if (producto.parentProductId !== null) {
    return {
      ok: false,
      error: "Los paquetes usan el stock de su producto suelto.",
    };
  }

  const error = validarCantidad(
    producto,
    nuevoStock,
    true,
  );

  if (error) return { ok: false, error };

  if (nuevoStock === producto.stock) {
    return {
      ok: false,
      error: "El stock nuevo es igual al actual.",
    };
  }

  return guardar("/stock-movements/adjustments", "POST", {
    productId: id,
    newStock: nuevoStock,
    ...(motivo.trim()
      ? { reason: motivo.trim() }
      : {}),
  });
}

// ---------- Validaciones ----------

function validarCantidad(
  producto: ProductoInventario,
  cantidad: number,
  aceptaCero: boolean,
): string | null {
  if (
    !Number.isFinite(cantidad) ||
    cantidad < 0 ||
    (!aceptaCero && cantidad === 0)
  ) {
    return aceptaCero
      ? "El stock no puede ser negativo."
      : "La cantidad debe ser mayor a cero.";
  }

  if (
    producto.unitType === "unidad" &&
    !Number.isInteger(cantidad)
  ) {
    return "Este producto se cuenta por unidad, sin decimales.";
  }

  if (redondear(cantidad) !== cantidad) {
    return "Use máximo dos decimales.";
  }

  return null;
}
