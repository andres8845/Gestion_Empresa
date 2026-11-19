"use server";

import { requerirUsuario } from "@/lib/api/usuarios";
import { cerrarCaja } from "@/lib/api/cierre";

const MONTO_MAXIMO = 1_000_000;

export async function cerrarCajaAction(contado: number): Promise<{ error?: string }> {
  const usuario = await requerirUsuario();
  if (contado > MONTO_MAXIMO) {
    return { error: "El monto parece demasiado alto. Revise la cantidad." };
  }
  const resultado = await cerrarCaja(contado, usuario.id);
  return resultado.ok ? {} : { error: resultado.error };
}