
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { SESSION_TTL_MS } from '../auth/auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CreditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(token?: string) {
    await this.requireSession(token);

    const customers = await this.prisma.creditCustomer.findMany({
      orderBy: { aliasName: 'asc' },
      select: {
        id: true,
        aliasName: true,
        balance: true,
        lastCreditAt: true,
        lastMovementAt: true,
        createdAt: true,
      },
    });

    return customers.map((customer) => ({
      ...customer,
      balance: customer.balance.toNumber(),
    }));
  }

  private async requireSession(token?: string): Promise<void> {
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
                select: { isActive: true },
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
  }
}
