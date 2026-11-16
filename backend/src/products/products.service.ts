import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { SESSION_TTL_MS } from '../auth/auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ProductResponseDto } from './dto/product-response.dto.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(token: string | undefined, onlyActive: boolean): Promise<ProductResponseDto[]> {
    await this.requireSession(token);

    const products = await this.prisma.product.findMany({
      where: onlyActive ? { isActive: true } : {},
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        categoryId: true,
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

    // PostgreSQL ya almacena estos decimales con dos posiciones.
    return products.map((product) => ({
      ...product,
      salePrice: product.salePrice.toNumber(),
      stock: product.stock.toNumber(),
      minStock: product.minStock.toNumber(),
      isvRate: product.isvRate.toNumber(),
      unitsPerPackage: product.unitsPerPackage.toNumber(),
    }));
  }

  private async requireSession(token?: string): Promise<void> {
    const session = token && token.length <= 200
      ? await this.prisma.authSession.findUnique({
          where: { tokenHash: createHash('sha256').update(token).digest('hex') },
          select: { expiresAt: true, lastActivity: true, user: { select: { isActive: true } } },
        })
      : null;

    const now = Date.now();
    if (
      !session || session.expiresAt.getTime() <= now ||
      session.lastActivity.getTime() + SESSION_TTL_MS <= now || !session.user.isActive
    ) {
      throw new UnauthorizedException({ success: false, message: 'Sesión inválida o expirada' });
    }
  }
}
