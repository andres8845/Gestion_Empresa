
import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { createHash } from 'node:crypto';
import { SESSION_TTL_MS } from '../auth/auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

import type { CategoryResponseDto } from './dto/category-response.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    token: string | undefined,
  ): Promise<CategoryResponseDto[]> {
    await this.requireSession(token);

    const categories = await this.prisma.category.findMany({
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
      },
    });

    return categories;
  }

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
