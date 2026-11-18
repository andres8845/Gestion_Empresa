
"use server";

import { redirect } from "next/navigation";
import { registrarVenta, type NuevaVenta } from "@/lib/api/ventas";

export async function registrarVentaAction(
  datos: NuevaVenta,
): Promise<{ error: string }> {
  const resultado = await registrarVenta(datos);

  if (!resultado.ok) {
    return { error: resultado.error };
  }

  redirect(`/ventas/${resultado.ventaId}/factura`);
}
