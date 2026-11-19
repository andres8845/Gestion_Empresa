"use server";

import { requerirUsuario } from "@/lib/api/usuarios";
import {
  ajustarStock,
  guardarProducto,
  registrarEntrada,
  type DatosProducto,
} from "@/lib/api/inventario";

// Cada acción vuelve a validar la sesión y devuelve el error si algo falla.

export async function guardarProductoAction(
  datos: DatosProducto,
  id: number | null,
): Promise<{ error?: string }> {
  const usuario = await requerirUsuario();
  const resultado = await guardarProducto(datos, id, usuario.id);
  return resultado.ok ? {} : { error: resultado.error };
}

export async function registrarEntradaAction(
  id: number,
  cantidad: number,
  costo: number | null,
): Promise<{ error?: string }> {
  const usuario = await requerirUsuario();
  const resultado = await registrarEntrada(id, cantidad, costo, usuario.id);
  return resultado.ok ? {} : { error: resultado.error };
}

export async function ajustarStockAction(
  id: number,
  nuevoStock: number,
  motivo: string,
): Promise<{ error?: string }> {
  const usuario = await requerirUsuario();
  const limpio = motivo.trim().replace(/\s+/g, " ").slice(0, 200);
  const resultado = await ajustarStock(id, nuevoStock, limpio, usuario.id);
  return resultado.ok ? {} : { error: resultado.error };
}