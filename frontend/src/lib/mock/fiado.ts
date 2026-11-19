// Abonos y clientes eliminados de prueba mientras el backend no tiene
// los endpoints para registrar abonos ni para borrar clientes de fiado.
// Los clientes reales vienen de GET /fiado/clientes; aquí solo se guarda
// lo que se hizo desde la pantalla de Fiado, y se aplica encima.
// Se pierden al reiniciar `npm run dev`.

export type AbonoFiado = {
  id: number;
  customerId: number;
  amount: number;
  paymentMethod: "efectivo" | "tarjeta";
  cashRegisterSessionId: number | null;
  userId: number;
  createdAt: Date;
};

// Copia sin nombre de cada abono, para el cierre de caja. Así el efectivo
// que entró a la gaveta se sigue contando aunque después se borre al
// cliente con todos sus abonos (RN-46).
export type AbonoEnCaja = {
  amount: number;
  paymentMethod: "efectivo" | "tarjeta";
  cashRegisterSessionId: number | null;
  createdAt: Date;
};

type EstadoFiado = {
  abonos: AbonoFiado[];
  abonosEnCaja: AbonoEnCaja[];
  eliminados: Set<number>;
};

const memoria = globalThis as unknown as { fiado?: EstadoFiado };
memoria.fiado ??= { abonos: [], abonosEnCaja: [], eliminados: new Set() };

export const fiadoMock = memoria.fiado;