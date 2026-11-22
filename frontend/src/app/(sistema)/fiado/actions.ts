"use server";

import { requerirUsuario } from "@/lib/api/usuarios";
import { revalidatePath } from "next/cache";
import { eliminarCliente, registrarAbono } from "@/lib/api/fiado";

export async function registrarAbonoAction(
  customerId: number,
  monto: number,
  metodo: "efectivo" | "tarjeta",
): Promise<{ error?: string }> {
  await requerirUsuario();
  if (metodo !== "efectivo" && metodo !== "tarjeta") {
    return { error: "Forma de pago inválida." };
  }
  const resultado = await registrarAbono(customerId, monto, metodo);
  if (resultado.ok) revalidatePath("/fiado");
  return resultado.ok ? {} : { error: resultado.error };
}

export async function eliminarClienteAction(
  customerId: number,
): Promise<{ error?: string }> {
  await requerirUsuario();
  const resultado = await eliminarCliente(customerId);
  if (resultado.ok) revalidatePath("/fiado");
  return resultado.ok ? {} : { error: resultado.error };
}
