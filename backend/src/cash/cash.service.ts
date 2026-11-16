
import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';

@Injectable()
export class CashService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async open(token: string | undefined, initialAmount: unknown) {
    // 1. Validar sesión del usuario.
    const user = await this.auth.currentUser(token);

    // 2. Validar monto inicial.
    if (
      typeof initialAmount !== 'number' ||
      !Number.isFinite(initialAmount) ||
      initialAmount < 0 ||
      initialAmount > 99999999.99 ||
      !Number.isInteger(initialAmount * 100)
    ) {
      throw new BadRequestException({
        success: false,
        message: 'El monto inicial debe ser válido y tener máximo dos decimales.',
      });
    }

    // 3. Comprobar y registrar la apertura en una transacción.
    try {
      const session = await this.prisma.$transaction(
        async (tx) => {
          const existing = await tx.cashRegisterSession.findFirst({
            where: { status: 'abierta' },
            select: { id: true },
          });

          if (existing) {
            throw new ConflictException({
              success: false,
              message: 'Ya existe una caja abierta.',
            });
          }

          return tx.cashRegisterSession.create({
            data: {
              userId: user.id,
              initialAmount,
              status: 'abierta',
            },
          });
        },
        { isolationLevel: 'Serializable' },
      );

      return {
        success: true,
        data: {
          ...session,
          initialAmount: session.initialAmount.toNumber(),
          expectedAmount: session.expectedAmount?.toNumber() ?? null,
          actualAmount: session.actualAmount?.toNumber() ?? null,
          difference: session.difference?.toNumber() ?? null,
        },
        message: 'Caja abierta exitosamente.',
      };
    } catch (error) {
      if (
        error instanceof ConflictException
      ) {
        throw error;
      }

      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2034'
      ) {
        throw new ConflictException({
          success: false,
          message: 'No se pudo abrir la caja porque otra operación la abrió simultáneamente.',
        });
      }

      throw error;
    }
  }

  async getOpen(token: string | undefined) {
    // 1. Validar sesión.
    await this.auth.currentUser(token);

    // 2. Consultar caja abierta.
    const session = await this.prisma.cashRegisterSession.findFirst({
      where: { status: 'abierta' },
      orderBy: { openedAt: 'desc' },
    });

    if (!session) {
      return {
        success: true,
        data: null,
      };
    }

    // 3. Convertir Decimal a number para JSON.
    return {
      success: true,
      data: {
        ...session,
        initialAmount: session.initialAmount.toNumber(),
        expectedAmount: session.expectedAmount?.toNumber() ?? null,
        actualAmount: session.actualAmount?.toNumber() ?? null,
        difference: session.difference?.toNumber() ?? null,
      },
    };
  }
}
