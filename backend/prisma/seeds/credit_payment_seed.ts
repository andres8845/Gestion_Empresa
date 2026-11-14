import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { SEED } from './seed.constants.js';

export async function seedCreditPayments(prisma: PrismaClient) {
  const customer = await prisma.creditCustomer.findUnique({
    where: { aliasName: SEED.customers.frequent },
  });

  const cashier = await prisma.user.findUnique({
    where: { username: SEED.users.cashier },
  });

  if (!customer || !cashier) {
    throw new Error('Customer or cashier not found');
  }

  const session = await prisma.cashRegisterSession.findFirst({
    where: {
      userId: cashier.id,
      openedAt: SEED.dates.openSession,
    },
  });

  if (!session) {
    throw new Error('Open cash register session not found');
  }

  await prisma.creditPayment.deleteMany({
    where: {
      customerId: customer.id,
      cashRegisterSessionId: session.id,
    },
  });

  await prisma.creditPayment.create({
    data: {
      customerId: customer.id,
      cashRegisterSessionId: session.id,
      amount: '15.00',
      paymentMethod: 'efectivo',
      userId: cashier.id,
      createdAt: SEED.dates.creditPayment,
    },
  });

  await prisma.creditCustomer.update({
    where: { id: customer.id },
    data: {
      balance: '27.00',
      lastMovementAt: SEED.dates.creditPayment,
    },
  });

  console.log('Credit payments seeded successfully');
}