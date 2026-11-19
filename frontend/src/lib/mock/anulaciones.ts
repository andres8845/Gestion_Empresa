export type AnulacionMock = {
  voidReason: string;
  voidedAt: Date;
  userId: number;
};

const memoria = globalThis as unknown as {
  anulaciones?: Map<number, AnulacionMock>;
};
memoria.anulaciones ??= new Map();

export const anulacionesMock = memoria.anulaciones;