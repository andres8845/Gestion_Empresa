"use server";

import { redirect } from "next/navigation";
import { requerirUsuario } from "@/lib/api/usuarios";
import { obtenerCajaAbierta } from "@/lib/api/caja";
import { registrarVenta, type NuevaVenta } from "@/lib/api/ventas";

// Guarda la venta y abre la factura. Si algo falla, devuelve el error
// para mostrarlo en la ventana de pago (y no se guarda nada).
export async function registrarVentaAction(
  datos: NuevaVenta,
): Promise<{ error: string }> {
  // Se vuelve a validar la sesión aquí, no basta con el proxy.
  const usuario = await requerirUsuario();

  const caja = await obtenerCajaAbierta();
  if (!caja) {
    return { error: "La caja está cerrada. Ábrala antes de cobrar." };
  }

  const resultado = await registrarVenta(datos, usuario.id, caja.id);
  if (!resultado.ok) {
    return { error: resultado.error };
  }

  redirect(`/ventas/${resultado.ventaId}/factura`);
}