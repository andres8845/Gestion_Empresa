"use server";

import { redirect } from "next/navigation";
import { abrirCaja, obtenerCajaAbierta } from "@/lib/api/caja";
import { requerirUsuario } from "@/lib/api/usuarios";

export type AbrirCajaState = {
  error?: string;
  monto?: string;
};

const MONTO_MAXIMO = 100000;

export async function abrirCajaAction(
  _prevState: AbrirCajaState,
  formData: FormData,
): Promise<AbrirCajaState> {
  // Se vuelve a validar la sesión aquí, no basta con el proxy.
  const usuario = await requerirUsuario();

  const texto = String(formData.get("monto") ?? "")
    .trim()
    .replace(",", ".");

  if (texto === "") {
    return { error: "Ingrese el monto inicial.", monto: texto };
  }

  // Solo números con hasta dos decimales (RN-06). Ej: 500 o 500.50
  if (!/^\d+(\.\d{1,2})?$/.test(texto)) {
    return {
      error: "Ingrese un monto válido, con máximo dos decimales.",
      monto: texto,
    };
  }

  const monto = Number(texto);

  if (monto > MONTO_MAXIMO) {
    return {
      error: "El monto parece demasiado alto. Revise la cantidad.",
      monto: texto,
    };
  }

  if (await obtenerCajaAbierta()) {
    // Otra persona ya la abrió: se continúa con esa caja.
    redirect("/cobro");
  }

  await abrirCaja(usuario.id, monto);
  redirect("/cobro");
}