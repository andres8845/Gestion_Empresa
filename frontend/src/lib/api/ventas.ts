import "server-only";
import { connection } from "next/server";
import { productosMock } from "@/lib/mock/productos";
import { cargosFiadoMock, clientesFiadoMock, type ClienteFiado } from "@/lib/mock/fiado";
import {
  movimientosStockMock,
  ventasMock,
  type DetalleVenta,
  type PagoVenta,
  type Venta,
} from "@/lib/mock/ventas";
import { obtenerUsuariosAutorizados } from "@/lib/api/usuarios";
import { redondear } from "@/lib/cobro/carrito";
import { calcularPago, type DatosPago } from "@/lib/cobro/pago";

export type { Venta };

// Lo que manda la pantalla de cobro. Solo ids y cantidades: los precios
// los pone el servidor, nunca se confía en el precio que manda el navegador.
export type NuevaVenta = {
  lineas: { productoId: number; cantidad: number }[];
  edadVerificada: boolean;
  pago: DatosPago;
  cliente:
    | { tipo: "existente"; id: number }
    | { tipo: "nuevo"; alias: string }
    | null;
};

export type ResultadoVenta =
  | { ok: true; ventaId: number }
  | { ok: false; error: string };

const MAX_ALIAS = 40;

// RN-32: toda la venta se guarda como una sola transacción.
// Aquí se imita así: PRIMERO se valida todo, y solo si todo está bien
// se hacen los cambios de una sola vez. Si algo falla, no se toca nada.
// En el backend esto será un prisma.$transaction().
export async function registrarVenta(
  datos: NuevaVenta,
  userId: number,
  cajaId: number,
): Promise<ResultadoVenta> {
  // TODO: POST /ventas

  // ---------- 1. Validar productos y armar el detalle ----------
  if (datos.lineas.length === 0) {
    return { ok: false, error: "La venta no tiene productos." };
  }

  const detalles: DetalleVenta[] = [];
  for (const linea of datos.lineas) {
    const producto = productosMock.find((p) => p.id === linea.productoId);
    if (!producto || !producto.isActive) {
      return { ok: false, error: "Uno de los productos ya no está disponible." };
    }

    const cantidadValida =
      producto.unitType === "libra"
        ? linea.cantidad > 0 && redondear(linea.cantidad) === linea.cantidad
        : Number.isInteger(linea.cantidad) && linea.cantidad >= 1;
    if (!cantidadValida) {
      return { ok: false, error: `Cantidad inválida para ${producto.name}.` };
    }

    if (producto.requiresAgeVerification && !datos.edadVerificada) {
      return { ok: false, error: `Falta verificar la edad para ${producto.name}.` };
    }

    detalles.push({
      productId: producto.id,
      productName: producto.name,
      unitType: producto.unitType,
      quantity: linea.cantidad,
      unitPrice: producto.salePrice, // RN-19: se copia el precio de hoy
      isvRate: producto.isvRate,
      subtotal: redondear(linea.cantidad * producto.salePrice),
    });
  }

  const total = redondear(detalles.reduce((s, d) => s + d.subtotal, 0));

  // ---------- 2. Validar el pago ----------
  const pago = calcularPago(total, datos.pago);
  if (!pago.ok) return pago;

  // ---------- 3. Validar el cliente de fiado ----------
  let clienteExistente: ClienteFiado | undefined;
  let aliasNuevo: string | null = null;

  if (datos.pago.fiado > 0) {
    if (!datos.cliente) {
      return { ok: false, error: "Elija a qué cliente se le fía." }; // RN-31
    }
    if (datos.cliente.tipo === "existente") {
      const id = datos.cliente.id;
      clienteExistente = clientesFiadoMock.find((c) => c.id === id);
      if (!clienteExistente) {
        return { ok: false, error: "El cliente de fiado ya no existe." };
      }
    } else {
      aliasNuevo = datos.cliente.alias.trim().replace(/\s+/g, " ");
      if (!aliasNuevo || aliasNuevo.length > MAX_ALIAS) {
        return { ok: false, error: `El nombre debe tener entre 1 y ${MAX_ALIAS} letras.` };
      }
      // RN-39: el nombre o apodo es único.
      const repetido = clientesFiadoMock.some(
        (c) => c.aliasName.toLowerCase() === aliasNuevo!.toLowerCase(),
      );
      if (repetido) {
        return { ok: false, error: `Ya existe un cliente llamado "${aliasNuevo}". Use un apodo distinto.` };
      }
    }
  }

  // ---------- 4. Todo está bien: guardar todo junto ----------
  const ahora = new Date();
  const ventaId = ventasMock.length + 1;

  const pagos: PagoVenta[] = [];
  if (pago.efectivoAplicado > 0) pagos.push({ paymentMethod: "efectivo", amount: pago.efectivoAplicado });
  if (datos.pago.tarjeta > 0) pagos.push({ paymentMethod: "tarjeta", amount: datos.pago.tarjeta });
  if (datos.pago.fiado > 0) pagos.push({ paymentMethod: "fiado", amount: datos.pago.fiado });

  ventasMock.push({
    id: ventaId,
    // RN-33: número correlativo, no se repite ni se salta.
    invoiceNumber: String(ventaId).padStart(8, "0"),
    cashRegisterSessionId: cajaId,
    userId,
    total,
    cashReceived: pago.efectivoAplicado > 0 ? datos.pago.efectivoRecibido : 0,
    changeGiven: pago.cambio,
    status: "activa",
    voidReason: null,
    createdAt: ahora,
    details: detalles,
    payments: pagos,
  });

  // Descontar stock. Un paquete descuenta del producto padre.
  // RN-17: el stock puede quedar en negativo.
  for (const d of detalles) {
    const producto = productosMock.find((p) => p.id === d.productId)!;
    const base = producto.parentProductId
      ? productosMock.find((p) => p.id === producto.parentProductId)!
      : producto;
    const unidades = redondear(d.quantity * producto.unitsPerPackage);
    const anterior = base.stock;
    base.stock = redondear(base.stock - unidades);

    movimientosStockMock.push({
      id: movimientosStockMock.length + 1,
      productId: base.id,
      movementType: "venta",
      quantity: -unidades,
      previousStock: anterior,
      newStock: base.stock,
      saleId: ventaId,
      userId,
      createdAt: ahora,
    });
  }

  // Cargo de fiado ligado a la venta (RN-41).
  if (datos.pago.fiado > 0) {
    let cliente = clienteExistente;
    if (!cliente) {
      cliente = {
        id: Math.max(0, ...clientesFiadoMock.map((c) => c.id)) + 1,
        aliasName: aliasNuevo!,
        balance: 0,
        lastCreditAt: null,
        lastMovementAt: null,
        createdAt: ahora,
      };
      clientesFiadoMock.push(cliente);
    }

    cargosFiadoMock.push({
      id: cargosFiadoMock.length + 1,
      customerId: cliente.id,
      saleId: ventaId,
      amount: datos.pago.fiado,
      createdAt: ahora,
    });
    cliente.balance = redondear(cliente.balance + datos.pago.fiado);
    cliente.lastCreditAt = ahora;
    cliente.lastMovementAt = ahora;
  }

  return { ok: true, ventaId };
}

// Para la factura: la venta y el nombre de quien atendió.
export async function obtenerVenta(
  id: number,
): Promise<(Venta & { username: string }) | null> {
  await connection();
  // TODO: GET /ventas/:id
  const venta = ventasMock.find((v) => v.id === id);
  if (!venta) return null;
  const usuarios = await obtenerUsuariosAutorizados();
  const usuario = usuarios.find((u) => u.id === venta.userId);

  return { ...venta, username: usuario?.username ?? "—" };
}