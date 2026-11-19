
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { createHash } from 'node:crypto';
import { SESSION_TTL_MS } from '../auth/auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

import type { ProductResponseDto } from './dto/product-response.dto.js';
import type { CreateProductDto } from './dto/create-product.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== CREATE ====================

  async create(
    token: string | undefined,
    dto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const user = await this.requireSession(token);

    const code = dto.code.trim();
    const name = dto.name.trim();
    const initialStock = dto.stock ?? 0;

    if (!code || !name) {
      throw new BadRequestException({
        success: false,
        message: 'El código y el nombre son obligatorios.',
      });
    }

    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const category = await tx.category.findUnique({
          where: { id: dto.categoryId },
          select: { id: true },
        });

        if (!category) {
          throw new NotFoundException({
            success: false,
            message: 'La categoría indicada no existe.',
          });
        }

        if (
          dto.parentProductId !== undefined &&
          dto.parentProductId !== null
        ) {
          const parent = await tx.product.findUnique({
            where: { id: dto.parentProductId },
            select: {
              id: true,
              parentProductId: true,
              isActive: true,
            },
          });

          if (
            !parent ||
            !parent.isActive ||
            parent.parentProductId !== null
          ) {
            throw new BadRequestException({
              success: false,
              message:
                'El producto base no existe, está inactivo o es otro paquete.',
            });
          }

          if (initialStock > 0) {
            throw new BadRequestException({
              success: false,
              message:
                'Los paquetes utilizan las existencias de su producto base.',
            });
          }
        }

        const created = await tx.product.create({
          data: {
            code,
            name,
            categoryId: dto.categoryId,
            cost: dto.cost ?? 0,
            salePrice: dto.salePrice,
            unitType: dto.unitType ?? 'unidad',
            stock: initialStock,
            minStock: dto.minStock ?? 0,
            isvRate: dto.isvRate ?? 15,
            requiresAgeVerification:
              dto.requiresAgeVerification ?? false,
            isActive: true,
            parentProductId: dto.parentProductId ?? null,
            unitsPerPackage: dto.unitsPerPackage ?? 1,
          },
          select: {
            id: true,
            code: true,
            name: true,
            categoryId: true,
            cost: true,
            salePrice: true,
            unitType: true,
            stock: true,
            minStock: true,
            isvRate: true,
            requiresAgeVerification: true,
            isActive: true,
            parentProductId: true,
            unitsPerPackage: true,
          },
        });

        if (initialStock > 0) {
          await tx.stockMovement.create({
            data: {
              productId: created.id,
              movementType: 'entrada_mercaderia',
              quantity: initialStock,
              previousStock: 0,
              newStock: initialStock,
              reason: 'Stock inicial del producto',
              userId: user.id,
            },
          });
        }

        return created;
      });

      return {
        ...product,
        cost: product.cost?.toNumber() ?? 0,
        salePrice: product.salePrice.toNumber(),
        stock: product.stock.toNumber(),
        minStock: product.minStock.toNumber(),
        isvRate: product.isvRate.toNumber(),
        unitsPerPackage: product.unitsPerPackage.toNumber(),
      };
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          success: false,
          message: 'Ya existe un producto con ese código.',
        });
      }

      throw error;
    }
  }

  // ==================== UPDATE ====================

  async update(
    token: string | undefined,
    id: number,
    dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    await this.requireSession(token);

    if (Object.keys(dto).length === 0) {
      throw new BadRequestException({
        success: false,
        message:
          'Debes proporcionar al menos un campo para actualizar.',
      });
    }

    if (dto.code !== undefined && !dto.code.trim()) {
      throw new BadRequestException({
        success: false,
        message: 'El código no puede estar vacío.',
      });
    }

    if (dto.name !== undefined && !dto.name.trim()) {
      throw new BadRequestException({
        success: false,
        message: 'El nombre no puede estar vacío.',
      });
    }

    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.product.findUnique({
          where: { id },
          select: { id: true },
        });

        if (!existing) {
          throw new NotFoundException({
            success: false,
            message: 'El producto no existe.',
          });
        }

        if (dto.categoryId !== undefined) {
          const category = await tx.category.findUnique({
            where: { id: dto.categoryId },
            select: { id: true },
          });

          if (!category) {
            throw new NotFoundException({
              success: false,
              message: 'La categoría indicada no existe.',
            });
          }
        }

        return tx.product.update({
          where: { id },
          data: {
            ...(dto.code !== undefined && {
              code: dto.code.trim(),
            }),
            ...(dto.name !== undefined && {
              name: dto.name.trim(),
            }),
            ...(dto.categoryId !== undefined && {
              categoryId: dto.categoryId,
            }),
            ...(dto.cost !== undefined && {
              cost: dto.cost,
            }),
            ...(dto.salePrice !== undefined && {
              salePrice: dto.salePrice,
            }),
            ...(dto.unitType !== undefined && {
              unitType: dto.unitType,
            }),
            ...(dto.minStock !== undefined && {
              minStock: dto.minStock,
            }),
            ...(dto.isvRate !== undefined && {
              isvRate: dto.isvRate,
            }),
            ...(dto.requiresAgeVerification !== undefined && {
              requiresAgeVerification:
                dto.requiresAgeVerification,
            }),
            ...(dto.isActive !== undefined && {
              isActive: dto.isActive,
            }),
          },
          select: {
            id: true,
            code: true,
            name: true,
            categoryId: true,
            cost: true,
            salePrice: true,
            unitType: true,
            stock: true,
            minStock: true,
            isvRate: true,
            requiresAgeVerification: true,
            isActive: true,
            parentProductId: true,
            unitsPerPackage: true,
          },
        });
      });

      return {
        ...product,
        cost: product.cost?.toNumber() ?? 0,
        salePrice: product.salePrice.toNumber(),
        stock: product.stock.toNumber(),
        minStock: product.minStock.toNumber(),
        isvRate: product.isvRate.toNumber(),
        unitsPerPackage: product.unitsPerPackage.toNumber(),
      };
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          success: false,
          message: 'Ya existe un producto con ese código.',
        });
      }

      throw error;
    }
  }

  // ==================== LIST ====================

  async list(
    token: string | undefined,
    onlyActive: boolean,
  ): Promise<ProductResponseDto[]> {
    await this.requireSession(token);

    const products = await this.prisma.product.findMany({
      where: onlyActive ? { isActive: true } : {},
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        categoryId: true,
        cost: true,
        salePrice: true,
        unitType: true,
        stock: true,
        minStock: true,
        isvRate: true,
        requiresAgeVerification: true,
        isActive: true,
        parentProductId: true,
        unitsPerPackage: true,
      },
    });

    return products.map((product) => ({
      ...product,
      cost: product.cost?.toNumber() ?? 0,
      salePrice: product.salePrice.toNumber(),
      stock: product.stock.toNumber(),
      minStock: product.minStock.toNumber(),
      isvRate: product.isvRate.toNumber(),
      unitsPerPackage: product.unitsPerPackage.toNumber(),
    }));
  }

  // ==================== SESSION ====================

  private async requireSession(
    token?: string,
  ): Promise<{ id: number }> {
    const session =
      token && token.length <= 200
        ? await this.prisma.authSession.findUnique({
            where: {
              tokenHash: createHash('sha256')
                .update(token)
                .digest('hex'),
            },
            select: {
              expiresAt: true,
              lastActivity: true,
              user: {
                select: {
                  id: true,
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

    return { id: session.user.id };
  }
}
