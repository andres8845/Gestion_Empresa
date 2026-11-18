"use server";

import { redirect } from "next/navigation";
import { abrirCaja, obtenerCajaAbierta } from "@/lib/api/caja";

export type AbrirCajaState = {
  error?: string;
  monto?: string;
};

const MONTO_MAXIMO = 100000;

export async function abrirCajaAction(
  _prevState: AbrirCajaState,
  formData: FormData,
): Promise<AbrirCajaState> {
  const texto = String(formData.get("monto") ?? "")
    .trim()
    .replace(",", ".");

  if (texto === "") {
    return { error: "Ingrese el monto inicial.", monto: texto };
  }

  // Solo números con hasta dos decimales (RN-06).
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

  // Si ya existe una caja abierta, continuar con ella.
  if (await obtenerCajaAbierta()) {
    redirect("/cobro");
  }

  // Registrar la apertura mediante la API de NestJS.
  try {
    await abrirCaja(monto);
  } catch (error) {
    // No interceptar las redirecciones de Next.js.
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    return {
      error: error instanceof Error
        ? error.message
        : "No se pudo abrir la caja.",
      monto: texto,
    };
  }

  redirect("/cobro");
}
