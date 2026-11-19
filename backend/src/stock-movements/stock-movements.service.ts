import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { MovementType } from '../generated/prisma/enums.js';
import { SESSION_TTL_MS } from '../auth/auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStockEntryDto } from './dto/create-stock-entry.dto.js';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto.js';
import { StockMovementQueryDto } from './dto/stock-movement-query.dto.js';
import type { StockMovementResponseDto } from './dto/stock-movement-response.dto.js';

type StockMovementWithRelations = {
  id: number;
  productId: number;
  movementType: MovementType;
  quantity: { toNumber(): number };
  previousStock: { toNumber(): number };
  newStock: { toNumber(): number };
  reason: string | null;
  saleId: number | null;
  userId: number;
  createdAt: Date;
  product: {
    code: string;
    name: string;
  };
  user: {
    username: string;
  };
};

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // 1. REGISTRAR ENTRADA DE MERCADERÍA
  // =====================================================

  async createEntry(
    token: string | undefined,
    dto: CreateStockEntryDto,
  ): Promise<StockMovementResponseDto> {
    const userId = await this.requireSession(token);

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: dto.productId },
        select: {
          id: true,
          parentProductId: true,
        },
      });

      if (!product) {
        throw new NotFoundException({
          success: false,
          message: 'El producto indicado no existe.',
        });
      }

      if (product.parentProductId !== null) {
        throw new BadRequestException({
          success: false,
          message: 'No se pueden registrar entradas directamente a paquetes.',
        });
      }

      // Actualizar el inventario mediante incremento atómico.
      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: {
          stock: { increment: dto.quantity },
        },
        select: {
          stock: true,
        },
      });

      const newStock = updatedProduct.stock.toNumber();

      const previousStock = Number(
        (newStock - dto.quantity).toFixed(2),
      );

      // Registrar el movimiento en la misma transacción.
      const movement = await tx.stockMovement.create({
        data: {
          productId: product.id,
          movementType: MovementType.entrada_mercaderia,
          quantity: dto.quantity,
          previousStock,
          newStock,
          reason: dto.reason?.trim() || null,
          userId,
        },
        include: {
          product: {
            select: {
              code: true,
              name: true,
            },
          },
          user: {
            select: {
              username: true,
            },
          },
        },
      });

      return this.toResponse(movement);
    });
  }

  // =====================================================
  // 2. REGISTRAR AJUSTE MANUAL DE INVENTARIO
  // =====================================================

  async createAdjustment(
    token: string | undefined,
    dto: CreateStockAdjustmentDto,
  ): Promise<StockMovementResponseDto> {
    const userId = await this.requireSession(token);

    return this.prisma.$transaction(async (tx) => {
      // Bloquear la fila mientras se realiza el ajuste.
      const lockedProducts = await tx.$queryRaw<
        Array<{ id: number; stock: unknown }>
      >`
        SELECT id, stock
        FROM products
        WHERE id = ${dto.productId}
        FOR UPDATE
      `;

      if (lockedProducts.length === 0) {
        throw new NotFoundException({
          success: false,
          message: 'El producto indicado no existe.',
        });
      }

      const product = await tx.product.findUnique({
        where: { id: dto.productId },
        select: {
          id: true,
          parentProductId: true,
        },
      });

      if (!product) {
        throw new NotFoundException({
          success: false,
          message: 'El producto indicado no existe.',
        });
      }

      if (product.parentProductId !== null) {
        throw new BadRequestException({
          success: false,
          message: 'No se pueden ajustar directamente las existencias de un paquete.',
        });
      }

      const previousStock = Number(lockedProducts[0].stock);

      // Calcular diferencia entre existencias reales y registradas.
      const difference = Number(
        (dto.newStock - previousStock).toFixed(2),
      );

      if (difference === 0) {
        throw new BadRequestException({
          success: false,
          message: 'El inventario ya coincide con las existencias indicadas.',
        });
      }

      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: {
          stock: dto.newStock,
        },
        select: {
          stock: true,
        },
      });

      const newStock = updatedProduct.stock.toNumber();

      const movement = await tx.stockMovement.create({
        data: {
          productId: product.id,
          movementType: MovementType.ajuste_manual,
          quantity: difference,
          previousStock,
          newStock,
          reason: dto.reason.trim(),
          userId,
        },
        include: {
          product: {
            select: {
              code: true,
              name: true,
            },
          },
          user: {
            select: {
              username: true,
            },
          },
        },
      });

      return this.toResponse(movement);
    });
  }

  // =====================================================
  // 3. CONSULTAR HISTORIAL DE MOVIMIENTOS
  // =====================================================

  async list(
    token: string | undefined,
    query: StockMovementQueryDto,
  ): Promise<{
    data: StockMovementResponseDto[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
    };
  }> {
    await this.requireSession(token);

    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    if (from && to && from > to) {
      throw new BadRequestException({
        success: false,
        message: 'La fecha inicial no puede ser posterior a la fecha final.',
      });
    }

    const where = {
      ...(query.productId !== undefined && {
        productId: query.productId,
      }),
      ...(query.movementType !== undefined && {
        movementType: query.movementType,
      }),
      ...(query.userId !== undefined && {
        userId: query.userId,
      }),
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: from }),
          ...(to && { lte: to }),
        },
      }),
    };

    const [movements, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        skip: offset,
        take: limit,
        include: {
          product: {
            select: {
              code: true,
              name: true,
            },
          },
          user: {
            select: {
              username: true,
            },
          },
        },
      }),

      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      data: movements.map((movement) =>
        this.toResponse(movement),
      ),
      pagination: {
        total,
        limit,
        offset,
      },
    };
  }

  // =====================================================
  // 4. VALIDAR SESIÓN DEL USUARIO
  // =====================================================

  private async requireSession(token?: string): Promise<number> {
    const session = token && token.length <= 200
      ? await this.prisma.authSession.findUnique({
          where: {
            tokenHash: createHash('sha256')
              .update(token)
              .digest('hex'),
          },
          select: {
            userId: true,
            expiresAt: true,
            lastActivity: true,
            user: {
              select: {
                isActive: true,
              },
            },
          },
        })
      : null;

    const now = Date.now();

    if (
      !session ||
      session.expiresAt.getTime() <= now ||
      session.lastActivity.getTime() + SESSION_TTL_MS <= now ||
      !session.user.isActive
    ) {
      throw new UnauthorizedException({
        success: false,
        message: 'Sesión inválida o expirada',
      });
    }

    return session.userId;
  }

  // =====================================================
  // 5. CONVERTIR RESPUESTA DE PRISMA A DTO
  // =====================================================

  private toResponse(
    movement: StockMovementWithRelations,
  ): StockMovementResponseDto {
    return {
      id: movement.id,
      productId: movement.productId,
      productCode: movement.product.code,
      productName: movement.product.name,
      movementType: movement.movementType,
      quantity: movement.quantity.toNumber(),
      previousStock: movement.previousStock.toNumber(),
      newStock: movement.newStock.toNumber(),
      reason: movement.reason,
      saleId: movement.saleId,
      userId: movement.userId,
      username: movement.user.username,
      createdAt: movement.createdAt.toISOString(),
    };
  }
}
