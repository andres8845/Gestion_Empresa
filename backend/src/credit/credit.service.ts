
import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
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

  async payments(token?: string) {
    await this.requireSession(token);
    const payments = await this.prisma.creditPayment.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return payments.map((payment) => ({ ...payment, amount: payment.amount.toNumber() }));
  }

  async cashPayments(token?: string) {
    await this.requireSession(token);
    // Una sola instantánea evita contar dos veces un cliente borrado durante la lectura.
    return this.prisma.$transaction(async (tx) => {
      const payments = await tx.creditPayment.findMany({ select: {
        cashRegisterSessionId: true, paymentMethod: true, amount: true, createdAt: true,
      } });
      const result = payments.map((payment) => ({ ...payment, amount: payment.amount.toNumber() }));
      const deletions = await tx.auditLog.findMany({
        where: { action: 'eliminacion_fiado', targetTable: 'credit_customers' }, select: { details: true },
      });
      for (const deletion of deletions) {
        if (!deletion.details) continue;
        let archived;
        try {
          archived = JSON.parse(deletion.details);
        } catch {
          // Los registros anteriores pueden contener únicamente una descripción.
          continue;
        }
        if (!archived || archived.version !== 1 || !Array.isArray(archived.payments)) continue;
        for (const payment of archived.payments) {
          result.push({ ...payment, createdAt: new Date(payment.createdAt) });
        }
      }
      return result;
    }, { isolationLevel: 'RepeatableRead' });
  }

  async pay(token: string | undefined, id: number, amount: unknown, paymentMethod: unknown) {
    const userId = await this.requireSession(token);
    this.validateId(id);
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 ||
      amount > 99999999.99 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001) {
      throw new BadRequestException({ success: false, message: 'El abono debe ser mayor a cero, con máximo dos decimales.' });
    }
    if (paymentMethod !== 'efectivo' && paymentMethod !== 'tarjeta') {
      throw new BadRequestException({ success: false, message: 'Forma de pago inválida.' });
    }
    return this.mutate(async (tx) => {
      const cash = await tx.cashRegisterSession.findFirst({
        where: { status: 'abierta' }, orderBy: [{ openedAt: 'desc' }, { id: 'desc' }],
      });
      if (!cash) throw new ConflictException({ success: false, message: 'Abra la caja antes de registrar un abono.' });
      await tx.$queryRaw`SELECT id FROM cash_register_sessions WHERE id = ${cash.id} FOR UPDATE`;
      const currentCash = await tx.cashRegisterSession.findUnique({ where: { id: cash.id } });
      if (currentCash?.status !== 'abierta') throw new ConflictException({ success: false, message: 'La caja ya no está abierta.' });
      await tx.$queryRaw`SELECT id FROM credit_customers WHERE id = ${id} FOR UPDATE`;
      const customer = await tx.creditCustomer.findUnique({ where: { id } });
      if (!customer) throw new NotFoundException({ success: false, message: 'El cliente ya no existe.' });
      if (customer.balance.lessThan(amount)) {
        throw new ConflictException({ success: false, message: 'El abono no puede pasar del saldo actual del cliente.' });
      }
      const payment = await tx.creditPayment.create({ data: {
        customerId: id, cashRegisterSessionId: cash.id, userId,
        amount, paymentMethod,
      } });
      await tx.creditCustomer.update({ where: { id }, data: {
        balance: { decrement: amount }, lastMovementAt: payment.createdAt,
      } });
      return { ...payment, amount: payment.amount.toNumber() };
    });
  }

  async remove(token: string | undefined, id: number) {
    const userId = await this.requireSession(token);
    this.validateId(id);
    await this.mutate(async (tx) => {
      await tx.$queryRaw`SELECT id FROM credit_customers WHERE id = ${id} FOR UPDATE`;
      const customer = await tx.creditCustomer.findUnique({ where: { id } });
      if (!customer) throw new NotFoundException({ success: false, message: 'El cliente ya no existe.' });
      if (!customer.balance.isZero()) {
        throw new ConflictException({ success: false, message: 'Solo se puede borrar un cliente con saldo cero.' });
      }
      // Conservar los importes por caja sin guardar el alias ni el historial personal.
      const payments = await tx.creditPayment.findMany({
        where: { customerId: id }, select: {
          cashRegisterSessionId: true, paymentMethod: true, amount: true, createdAt: true,
        },
      });
      await tx.auditLog.create({ data: {
        userId, action: 'eliminacion_fiado', targetTable: 'credit_customers', targetId: id,
        details: JSON.stringify({ version: 1, payments: payments.map((payment) => ({
          ...payment, amount: payment.amount.toNumber(),
        })) }),
      } });
      await tx.creditCustomer.delete({ where: { id } });
    });
  }

  private validateId(id: number) {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new BadRequestException({ success: false, message: 'El ID del cliente es inválido.' });
    }
  }

  private async mutate<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(operation, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034') {
        throw new ConflictException({ success: false, message: 'El saldo cambió durante la operación. Actualice la pantalla e intente nuevamente.' });
      }
      throw error;
    }
  }

  private async requireSession(token?: string): Promise<number> {
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
                select: { id: true, isActive: true },
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
    return session.user.id;
  }
}
