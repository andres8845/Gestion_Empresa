import "server-only";
import { connection } from "next/server";
import { sesionesCajaMock, type SesionCaja } from "@/lib/mock/caja";

// Capa de datos de la caja. Las pantallas solo llaman estas funciones.
// Cuando el backend esté listo, se cambia el contenido de cada función
// por un fetch a Nest y las pantallas no se tocan.

export type { SesionCaja };

// Solo puede haber una caja abierta a la vez, porque el sistema
// funciona en una sola computadora (RN-01).
export async function obtenerCajaAbierta(): Promise<SesionCaja | null> {
  await connection(); // el dato cambia en cada petición
  // TODO: GET /caja/abierta
  return sesionesCajaMock.find((s) => s.status === "abierta") ?? null;
}

export async function abrirCaja(
  userId: number,
  montoInicial: number,
): Promise<SesionCaja> {
  // TODO: POST /caja/abrir
  const yaAbierta = sesionesCajaMock.find((s) => s.status === "abierta");
  if (yaAbierta) {
    throw new Error("Ya hay una caja abierta.");
  }

  const nueva: SesionCaja = {
    id: sesionesCajaMock.length + 1,
    user_id: userId,
    opened_at: new Date(),
    closed_at: null,
    initial_amount: montoInicial,
    expected_amount: null,
    actual_amount: null,
    difference: null,
    status: "abierta",
  };
  sesionesCajaMock.push(nueva);
  return nueva;
}