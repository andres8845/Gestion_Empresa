"use server";

import { requerirUsuario } from "@/lib/api/usuarios";
import { eliminarCliente, registrarAbono } from "@/lib/api/fiado";

export async function registrarAbonoAction(
  customerId: number,
  monto: number,
  metodo: "efectivo" | "tarjeta",
): Promise<{ error?: string }> {
  const usuario = await requerirUsuario();
  if (metodo !== "efectivo" && metodo !== "tarjeta") {
    return { error: "Forma de pago inválida." };
  }
  const resultado = await registrarAbono(customerId, monto, metodo, usuario.id);
  return resultado.ok ? {} : { error: resultado.error };
}

export async function eliminarClienteAction(
  customerId: number,
): Promise<{ error?: string }> {
  await requerirUsuario();
  const resultado = await eliminarCliente(customerId);
  return resultado.ok ? {} : { error: resultado.error };
}