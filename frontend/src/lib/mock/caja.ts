// Datos de prueba de la caja mientras el backend no está listo.
// Tienen la misma forma que la tabla `cash_register_sessions`.
// Se guardan en la memoria del servidor de Next, así que se pierden al
// reiniciar `npm run dev`. Este archivo se borra cuando exista la API.

export type SesionCaja = {
  id: number;
  user_id: number;
  opened_at: Date;
  closed_at: Date | null;
  initial_amount: number;
  expected_amount: number | null;
  actual_amount: number | null;
  difference: number | null;
  status: "abierta" | "cerrada";
};

// Se guarda en globalThis para que no se borre cada vez que Next
// recarga el código mientras desarrollamos.
const memoria = globalThis as unknown as { sesionesCaja?: SesionCaja[] };
memoria.sesionesCaja ??= [];

export const sesionesCajaMock = memoria.sesionesCaja;