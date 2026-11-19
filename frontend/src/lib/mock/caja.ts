// Tipos de la caja y cierres de prueba mientras el backend no tiene
// POST /caja/cerrar. La caja abierta real viene de GET /caja/abierta.
// Se pierden al reiniciar `npm run dev`.

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

export type CierreCaja = {
  sessionId: number;
  userId: number;
  openedAt: Date;
  closedAt: Date;
  initialAmount: number;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
};

// Estado simulado de cada sesión real de caja.
type Tramo =
  | { estado: "cerrada" }
  | { estado: "reabierta"; openedAt: Date; initialAmount: number; userId: number };

type EstadoCaja = {
  tramos: Map<number, Tramo>;
  cierres: CierreCaja[];
};

const memoria = globalThis as unknown as { caja?: EstadoCaja };
memoria.caja ??= { tramos: new Map(), cierres: [] };

export const cajaMock = memoria.caja;