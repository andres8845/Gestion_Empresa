
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import { CreateSaleDto } from './dto/create-sale.dto.js';

const MAX_ALIAS = 40;
const MAX_AMOUNT_CENTS = 9_999_999_999;

function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function centavos(valor: number): number {
  return Math.round(valor * 100);
}

function tieneDosDecimales(valor: number): boolean {
  return Math.abs(valor * 100 - Math.round(valor * 100)) < 0.000001;
}

function esErrorPrisma(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  private validarMonto(valor: unknown, campo: string): number {
    if (
      typeof valor !== 'number' ||
      !Number.isFinite(valor) ||
      valor < 0 ||
      !tieneDosDecimales(valor) ||
      centavos(valor) > MAX_AMOUNT_CENTS
    ) {
      throw new BadRequestException({
        success: false,
        message: `${campo} debe ser un monto válido con máximo dos decimales.`,
      });
    }

    return redondear(valor);
  }

  private serializarVenta(sale: any) {
    return {
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      cashRegisterSessionId: sale.cashRegisterSessionId,
      userId: sale.userId,
      username: sale.user.username,
      total: Number(sale.total),
      cashReceived: Number(sale.cashReceived ?? 0),
      changeGiven: Number(sale.changeGiven ?? 0),
      status: sale.status,
      voidReason: sale.voidReason,
      createdAt: sale.createdAt,
      details: sale.details.map((detail: any) => ({
        productId: detail.productId,
        productName: detail.product.name,
        unitType: detail.product.unitType,
        quantity: Number(detail.quantity),
        unitPrice: Number(detail.unitPrice),
        isvRate: Number(detail.isvRate),
        subtotal: Number(detail.subtotal),
      })),
      payments: sale.payments.map((payment: any) => ({
        paymentMethod: payment.paymentMethod,
        amount: Number(payment.amount),
      })),
    };
  }

  async create(token: string | undefined, dto: CreateSaleDto) {
    const user = await this.auth.currentUser(token);

    if (
      !dto ||
      !Array.isArray(dto.lineas) ||
      dto.lineas.length === 0 ||
      dto.lineas.length > 100
    ) {
      throw new BadRequestException({
        success: false,
        message: 'La venta debe contener entre 1 y 100 líneas de productos.',
      });
    }

    if (typeof dto.edadVerificada !== 'boolean') {
      throw new BadRequestException({
        success: false,
        message: 'Debe indicar si se verificó la edad.',
      });
    }

    if (!dto.pago || typeof dto.pago !== 'object') {
      throw new BadRequestException({
        success: false,
        message: 'Los datos del pago son obligatorios.',
      });
    }

    const tarjeta = this.validarMonto(
      dto.pago.tarjeta,
      'El pago con tarjeta',
    );

    const fiado = this.validarMonto(
      dto.pago.fiado,
      'El monto fiado',
    );

    const efectivoRecibido = this.validarMonto(
      dto.pago.efectivoRecibido,
      'El efectivo recibido',
    );


    if (dto.lineas.some((linea) => !linea || typeof linea !== 'object')) {
        throw new BadRequestException({
            success: false,
            message: 'Una o más líneas de venta son inválidas.',
        });
    }

    const ids = dto.lineas.map((linea) => linea.productoId);

    if (
      ids.some((id) => !Number.isInteger(id) || id <= 0)
    ) {
      throw new BadRequestException({
        success: false,
        message: 'Uno o más identificadores de productos son inválidos.',
      });
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Verificar caja abierta.
        const openSession = await tx.cashRegisterSession.findFirst({
          where: { status: 'abierta' },
          orderBy: { openedAt: 'desc' },
          select: { id: true },
        });

        if (!openSession) {
          throw new ConflictException({
            success: false,
            message: 'No existe una caja abierta.',
          });
        }

        // Serializar las ventas de esta caja para evitar
        // números de factura duplicados.
        await tx.$queryRaw<Array<{ id: number }>>`
          SELECT id
          FROM cash_register_sessions
          WHERE id = ${openSession.id}
          FOR UPDATE
        `;

        const currentSession = await tx.cashRegisterSession.findUnique({
          where: { id: openSession.id },
          select: { id: true, status: true },
        });

        if (!currentSession || currentSession.status !== 'abierta') {
          throw new ConflictException({
            success: false,
            message: 'La caja ya no está abierta.',
          });
        }

        // 2. Consultar productos reales.
        const products = await tx.product.findMany({
          where: {
            id: { in: [...new Set(ids)] },
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            salePrice: true,
            unitType: true,
            isvRate: true,
            requiresAgeVerification: true,
            parentProductId: true,
            unitsPerPackage: true,
          },
        });

        const productMap = new Map(
          products.map((product) => [product.id, product]),
        );

        if (productMap.size !== new Set(ids).size) {
          throw new BadRequestException({
            success: false,
            message: 'Uno o más productos no existen o están inactivos.',
          });
        }

        // 3. Validar líneas y calcular subtotales.
        const details = dto.lineas.map((linea) => {
          const product = productMap.get(linea.productoId)!;
          const quantity = linea.cantidad;

          if (
            typeof quantity !== 'number' ||
            !Number.isFinite(quantity) ||
            quantity <= 0 ||
            !tieneDosDecimales(quantity)
          ) {
            throw new BadRequestException({
              success: false,
              message: `Cantidad inválida para ${product.name}.`,
            });
          }

          if (
            product.unitType === 'unidad' &&
            !Number.isInteger(quantity)
          ) {
            throw new BadRequestException({
              success: false,
              message: `${product.name} solamente permite unidades enteras.`,
            });
          }

          if (
            product.requiresAgeVerification &&
            dto.edadVerificada !== true
          ) {
            throw new BadRequestException({
              success: false,
              message: `Falta verificar la edad para ${product.name}.`,
            });
          }

          const unitPrice = Number(product.salePrice);
          const subtotal = redondear(quantity * unitPrice);

          return {
            product,
            quantity,
            unitPrice,
            isvRate: Number(product.isvRate),
            subtotal,
          };
        });

        const totalCents = details.reduce(
          (sum, detail) => sum + centavos(detail.subtotal),
          0,
        );

        const total = totalCents / 100;
        const tarjetaCents = centavos(tarjeta);
        const fiadoCents = centavos(fiado);
        const recibidoCents = centavos(efectivoRecibido);

        // 4. Validar distribución del pago.
        if (tarjetaCents + fiadoCents > totalCents) {
          throw new BadRequestException({
            success: false,
            message: 'Tarjeta y fiado suman más que el total.',
          });
        }

        const efectivoAplicadoCents =
          totalCents - tarjetaCents - fiadoCents;

        if (recibidoCents < efectivoAplicadoCents) {
          throw new BadRequestException({
            success: false,
            message: 'El efectivo recibido es insuficiente.',
          });
        }

        const efectivoAplicado = efectivoAplicadoCents / 100;
        const cambio =
          efectivoAplicadoCents > 0
            ? (recibidoCents - efectivoAplicadoCents) / 100
            : 0;

        // 5. Validar cliente de fiado.
        let customerId: number | null = null;

        if (fiadoCents > 0) {
          if (!dto.cliente || typeof dto.cliente !== 'object') {
            throw new BadRequestException({
              success: false,
              message: 'Debe seleccionar un cliente para el fiado.',
            });
          }

          if (dto.cliente.tipo === 'existente') {
            if (
              !Number.isInteger(dto.cliente.id) ||
              dto.cliente.id <= 0
            ) {
              throw new BadRequestException({
                success: false,
                message: 'El identificador del cliente es inválido.',
              });
            }

            const customer = await tx.creditCustomer.findUnique({
              where: { id: dto.cliente.id },
              select: { id: true },
            });

            if (!customer) {
              throw new NotFoundException({
                success: false,
                message: 'El cliente de fiado no existe.',
              });
            }

            customerId = customer.id;
          } else if (dto.cliente.tipo === 'nuevo') {
            if (typeof dto.cliente.alias !== 'string') {
              throw new BadRequestException({
                success: false,
                message: 'El alias del cliente es obligatorio.',
              });
            }

            const alias = dto.cliente.alias
              .trim()
              .replace(/\s+/g, ' ');

            if (!alias || alias.length > MAX_ALIAS) {
              throw new BadRequestException({
                success: false,
                message: `El alias debe tener entre 1 y ${MAX_ALIAS} caracteres.`,
              });
            }

            const duplicate = await tx.creditCustomer.findFirst({
              where: {
                aliasName: {
                  equals: alias,
                  mode: 'insensitive',
                },
              },
              select: { id: true },
            });

            if (duplicate) {
              throw new ConflictException({
                success: false,
                message: 'Ya existe un cliente con ese nombre o apodo.',
              });
            }

            const customer = await tx.creditCustomer.create({
              data: { aliasName: alias },
              select: { id: true },
            });

            customerId = customer.id;
          } else {
            throw new BadRequestException({
              success: false,
              message: 'El tipo de cliente es inválido.',
            });
          }
        }

        
        // 6. Generar número correlativo de factura.
        const year = new Date().getFullYear();
        const invoicePrefix = `DEMO-${year}-`;

        const lastSale = await tx.sale.findFirst({
          where: {
            invoiceNumber: {
              startsWith: invoicePrefix,
            },
          },
          orderBy: { id: 'desc' },
          select: { invoiceNumber: true },
        });

        let lastNumber = 0;

        if (lastSale) {
          const suffix = lastSale.invoiceNumber.slice(invoicePrefix.length);

          if (!/^\d+$/.test(suffix)) {
            throw new ConflictException({
              success: false,
              message: 'El formato del último número de factura es inválido.',
            });
          }

          lastNumber = Number(suffix);

          if (!Number.isSafeInteger(lastNumber) || lastNumber < 0) {
            throw new ConflictException({
              success: false,
              message: 'No se pudo determinar el número correlativo de factura.',
            });
          }
        }

        const invoiceNumber = `${invoicePrefix}${String(lastNumber + 1).padStart(4, '0')}`;


        // 7. Construir pagos.
        const payments: {
          paymentMethod: 'efectivo' | 'tarjeta' | 'fiado';
          amount: number;
        }[] = [];

        if (efectivoAplicado > 0) {
          payments.push({
            paymentMethod: 'efectivo',
            amount: efectivoAplicado,
          });
        }

        if (tarjeta > 0) {
          payments.push({
            paymentMethod: 'tarjeta',
            amount: tarjeta,
          });
        }

        if (fiado > 0) {
          payments.push({
            paymentMethod: 'fiado',
            amount: fiado,
          });
        }

        // 8. Crear venta y detalles.
        const sale = await tx.sale.create({
          data: {
            invoiceNumber,
            cashRegisterSessionId: currentSession.id,
            userId: user.id,
            total,
            cashReceived:
              efectivoAplicado > 0 ? efectivoRecibido : 0,
            changeGiven: cambio,
            details: {
              create: details.map((detail) => ({
                productId: detail.product.id,
                quantity: detail.quantity,
                unitPrice: detail.unitPrice,
                isvRate: detail.isvRate,
                subtotal: detail.subtotal,
              })),
            },
            payments: {
              create: payments,
            },
          },
        });

        // 9. Descontar inventario y registrar movimientos.
        // Se permite stock negativo, conforme a RN-17.
        for (const detail of details) {
          const baseProductId =
            detail.product.parentProductId ?? detail.product.id;

          const units = redondear(
            detail.quantity * Number(detail.product.unitsPerPackage),
          );

          const baseProduct = await tx.product.findUnique({
            where: { id: baseProductId },
            select: { id: true, stock: true },
          });

          if (!baseProduct) {
            throw new NotFoundException({
              success: false,
              message: 'No se encontró el producto base del inventario.',
            });
          }

          const previousStock = Number(baseProduct.stock);

          const updatedProduct = await tx.product.update({
            where: { id: baseProductId },
            data: {
              stock: { decrement: units },
            },
            select: { stock: true },
          });

          await tx.stockMovement.create({
            data: {
              productId: baseProductId,
              movementType: 'venta',
              quantity: -units,
              previousStock,
              newStock: Number(updatedProduct.stock),
              saleId: sale.id,
              userId: user.id,
            },
          });
        }

        // 10. Registrar cargo y actualizar saldo de fiado.
        if (fiado > 0 && customerId !== null) {
          await tx.creditCharge.create({
            data: {
              customerId,
              saleId: sale.id,
              amount: fiado,
            },
          });

          await tx.creditCustomer.update({
            where: { id: customerId },
            data: {
              balance: { increment: fiado },
              lastCreditAt: new Date(),
              lastMovementAt: new Date(),
            },
          });
        }

        // 11. Devolver venta completa para la factura.
        const completeSale = await tx.sale.findUniqueOrThrow({
          where: { id: sale.id },
          include: {
            details: {
              include: {
                product: {
                  select: {
                    name: true,
                    unitType: true,
                  },
                },
              },
            },
            payments: true,
            user: {
              select: { username: true },
            },
          },
        });

        return this.serializarVenta(completeSale);
      });

      return {
        success: true,
        data: result,
        message: 'Venta registrada exitosamente.',
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      if (esErrorPrisma(error, 'P2034')) {
        throw new ConflictException({
          success: false,
          message: 'Conflicto de concurrencia. Intente registrar la venta nuevamente.',
        });
      }

      if (esErrorPrisma(error, 'P2002')) {
        throw new ConflictException({
          success: false,
          message: 'Ya existe un registro con alguno de los datos únicos de la venta.',
        });
      }

      throw error;
    }
  }

  async voidSale(token: string | undefined, id: number, reason: unknown) {
    const user = await this.auth.currentUser(token);
    if (!Number.isSafeInteger(id) || id <= 0 || typeof reason !== 'string') {
      throw new BadRequestException({ success: false, message: 'El ID y el motivo de anulación son obligatorios.' });
    }
    const voidReason = reason.trim().replace(/\s+/g, ' ');
    if (voidReason.length < 5 || voidReason.length > 200) {
      throw new BadRequestException({ success: false, message: 'El motivo debe tener entre 5 y 200 caracteres.' });
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM sales WHERE id = ${id} FOR UPDATE`;
        const sale = await tx.sale.findUnique({ where: { id }, include: {
          creditCharges: { orderBy: { customerId: 'asc' } },
          stockMovements: { where: { movementType: 'venta' }, orderBy: [{ productId: 'asc' }, { id: 'asc' }] },
        } });
        if (!sale) throw new NotFoundException({ success: false, message: 'La venta no existe.' });
        if (sale.status === 'anulada') throw new ConflictException({ success: false, message: 'Esta venta ya estaba anulada.' });
        const creditByCustomer = new Map<number, typeof sale.total>();
        for (const charge of sale.creditCharges) {
          creditByCustomer.set(charge.customerId, charge.amount.add(creditByCustomer.get(charge.customerId) ?? 0));
        }
        for (const [customerId, amount] of creditByCustomer) {
          await tx.$queryRaw`SELECT id FROM credit_customers WHERE id = ${customerId} FOR UPDATE`;
          const customer = await tx.creditCustomer.findUniqueOrThrow({ where: { id: customerId } });
          if (customer.balance.lessThan(amount)) {
            throw new ConflictException({ success: false, message: 'El saldo pendiente no cubre el fiado de esta venta. Resuelva los abonos antes de anular.' });
          }
          const previousCredit = await tx.creditCharge.aggregate({
            where: { customerId, saleId: { not: id } }, _max: { createdAt: true },
          });
          await tx.creditCustomer.update({ where: { id: customerId }, data: {
            balance: { decrement: amount }, lastMovementAt: new Date(),
            lastCreditAt: previousCredit._max.createdAt,
          } });
        }
        // Revertir lo efectivamente descontado, incluso si el paquete cambió después.
        for (const movement of sale.stockMovements) {
          await tx.$queryRaw`SELECT id FROM products WHERE id = ${movement.productId} FOR UPDATE`;
          const product = await tx.product.findUniqueOrThrow({ where: { id: movement.productId } });
          const quantity = movement.quantity.negated();
          const updated = await tx.product.update({ where: { id: product.id }, data: { stock: { increment: quantity } } });
          await tx.stockMovement.create({ data: {
            productId: product.id, movementType: 'anulacion', quantity,
            previousStock: product.stock, newStock: updated.stock,
            saleId: id, userId: user.id, reason: voidReason,
          } });
        }
        await tx.creditCharge.deleteMany({ where: { saleId: id } });
        await tx.sale.update({ where: { id }, data: { status: 'anulada', voidReason } });
        await tx.auditLog.create({ data: {
          userId: user.id, action: 'anulacion_venta', targetTable: 'sales', targetId: id, details: voidReason,
        } });
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (esErrorPrisma(error, 'P2034')) {
        throw new ConflictException({ success: false, message: 'Otra operación modificó la venta o el saldo. Actualice y vuelva a intentar.' });
      }
      throw error;
    }
    return { success: true };
  }

  async findAll(token: string | undefined, limit = 50) {
    await this.auth.currentUser(token);

    const take = Number.isInteger(limit)
      ? Math.min(Math.max(limit, 1), 100)
      : 50;

    const sales = await this.prisma.sale.findMany({
      orderBy: { id: 'desc' },
      take,
      include: {
        details: {
          include: {
            product: {
              select: { name: true, unitType: true },
            },
          },
        },
        payments: true,
        user: {
          select: { username: true },
        },
      },
    });

    return {
      success: true,
      data: sales.map((sale) => this.serializarVenta(sale)),
    };
  }

  async findOne(token: string | undefined, id: number) {
    await this.auth.currentUser(token);

    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException({
        success: false,
        message: 'El ID de venta es inválido.',
      });
    }

    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        details: {
          include: {
            product: {
              select: { name: true, unitType: true },
            },
          },
        },
        payments: true,
        user: {
          select: { username: true },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException({
        success: false,
        message: 'La venta solicitada no existe.',
      });
    }

    return {
      success: true,
      data: this.serializarVenta(sale),
    };
  }
}
