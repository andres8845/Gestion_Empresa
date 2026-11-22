"use server";

import { requerirUsuario } from "@/lib/api/usuarios";
import { revalidatePath } from "next/cache";
import { anularVenta } from "@/lib/api/ventas";

const MOTIVO_MIN = 5;
const MOTIVO_MAX = 200;

// RN-36: anular una venta con motivo. Devuelve el error si algo falla.
export async function anularVentaAction(
  ventaId: number,
  motivo: string,
): Promise<{ error?: string }> {
  // Se vuelve a validar la sesión aquí, no basta con el proxy.
  await requerirUsuario();

  const limpio = motivo.trim().replace(/\s+/g, " ");
  if (limpio.length < MOTIVO_MIN) {
    return { error: `Escriba el motivo (mínimo ${MOTIVO_MIN} letras).` };
  }
  if (limpio.length > MOTIVO_MAX) {
    return { error: `El motivo es muy largo (máximo ${MOTIVO_MAX} letras).` };
  }

  const resultado = await anularVenta(ventaId, limpio);
  if (!resultado.ok) {
    return { error: resultado.error };
  }
  revalidatePath("/ventas");
  revalidatePath(`/ventas/${ventaId}/factura`);
  revalidatePath("/fiado");
  revalidatePath("/cobro");
  return {};
}
