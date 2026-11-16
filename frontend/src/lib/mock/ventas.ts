// Ventas de prueba mientras el backend no está listo.
// Tienen la misma forma que los modelos `Sale`, `SaleDetail`, `Payment`
// y `StockMovement` de Prisma. Se pierden al reiniciar `npm run dev`.

export type MetodoPago = "efectivo" | "tarjeta" | "fiado";

export type DetalleVenta = {
  productId: number;
  productName: string; // en la base de datos sale del producto relacionado
  unitType: "unidad" | "libra";
  quantity: number;
  unitPrice: number; // precio en el momento de la venta (RN-19)
  isvRate: number;
  subtotal: number;
};

export type PagoVenta = {
  paymentMethod: MetodoPago;
  amount: number;
};

export type Venta = {
  id: number;
  invoiceNumber: string;
  cashRegisterSessionId: number;
  userId: number;
  total: number;
  cashReceived: number;
  changeGiven: number;
  status: "activa" | "anulada";
  voidReason: string | null;
  createdAt: Date;
  details: DetalleVenta[];
  payments: PagoVenta[];
};

export type MovimientoStock = {
  id: number;
  productId: number;
  movementType: "entrada_mercaderia" | "ajuste_manual" | "venta" | "anulacion";
  quantity: number; // negativo = sale del inventario
  previousStock: number;
  newStock: number;
  saleId: number | null;
  userId: number;
  createdAt: Date;
};

const memoria = globalThis as unknown as {
  ventas?: Venta[];
  movimientosStock?: MovimientoStock[];
};
memoria.ventas ??= [];
memoria.movimientosStock ??= [];

export const ventasMock = memoria.ventas;
export const movimientosStockMock = memoria.movimientosStock;