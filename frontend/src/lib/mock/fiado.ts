// Clientes y cargos de fiado de prueba mientras el backend no está listo.
// Tienen la misma forma que los modelos `CreditCustomer` y `CreditCharge`.
// RN-38: del cliente solo se guarda el nombre o apodo.

export type ClienteFiado = {
  id: number;
  aliasName: string;
  balance: number;
  lastCreditAt: Date | null;
  lastMovementAt: Date | null;
  createdAt: Date;
};

export type CargoFiado = {
  id: number;
  customerId: number;
  saleId: number;
  amount: number;
  createdAt: Date;
};

const memoria = globalThis as unknown as {
  clientesFiado?: ClienteFiado[];
  cargosFiado?: CargoFiado[];
};

memoria.clientesFiado ??= [
  { id: 1, aliasName: "Doña Marta", balance: 150, lastCreditAt: new Date("2026-11-10T15:00:00Z"), lastMovementAt: new Date("2026-11-10T15:00:00Z"), createdAt: new Date("2026-10-01T15:00:00Z") },
  { id: 2, aliasName: "Juan del taller", balance: 0, lastCreditAt: new Date("2026-10-20T15:00:00Z"), lastMovementAt: new Date("2026-10-28T15:00:00Z"), createdAt: new Date("2026-09-15T15:00:00Z") },
];
memoria.cargosFiado ??= [];

export const clientesFiadoMock = memoria.clientesFiado;
export const cargosFiadoMock = memoria.cargosFiado;