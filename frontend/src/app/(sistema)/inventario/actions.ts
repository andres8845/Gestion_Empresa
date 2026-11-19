"use server";

import { requerirUsuario } from "@/lib/api/usuarios";
import {
  ajustarStock,
  guardarProducto,
  registrarEntrada,
  type DatosProducto,
} from "@/lib/api/inventario";

export async function guardarProductoAction(
  datos: DatosProducto,
  id: number | null,
): Promise<{ error?: string }> {
  await requerirUsuario();

  const resultado = await guardarProducto(datos, id);

  return resultado.ok
    ? {}
    : { error: resultado.error };
}

export async function registrarEntradaAction(
  id: number,
  cantidad: number,
  costo: number | null,
): Promise<{ error?: string }> {
  await requerirUsuario();

  const resultado = await registrarEntrada(
    id,
    cantidad,
    costo,
  );

  return resultado.ok
    ? {}
    : { error: resultado.error };
}

export async function ajustarStockAction(
  id: number,
  nuevoStock: number,
  motivo: string,
): Promise<{ error?: string }> {
  await requerirUsuario();

  const limpio = motivo
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 200);

  const resultado = await ajustarStock(
    id,
    nuevoStock,
    limpio,
  );

  return resultado.ok
    ? {}
    : { error: resultado.error };
}
