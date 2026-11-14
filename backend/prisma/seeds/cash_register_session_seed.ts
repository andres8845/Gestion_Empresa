import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { SEED } from './seed.constants.js';

export async function seedCashRegisterSessions(prisma: PrismaClient) {
  const cashier = await prisma.user.findUnique({
    where: { username: SEED.users.cashier },
  });

  if (!cashier) {
    throw new Error('Cashier user not found');
  }

  const sessions = [
    {
      openedAt: SEED.dates.closedSession,
      closedAt: SEED.dates.closedAt,
      initialAmount: '500.00',
      expectedAmount: '560.00',
      actualAmount: '560.00',
      difference: '0.00',
      status: 'cerrada' as const,
    },
    {
      openedAt: SEED.dates.openSession,
      closedAt: null,
      initialAmount: '300.00',
      expectedAmount: null,
      actualAmount: null,
      difference: null,
      status: 'abierta' as const,
    },
  ];

  for (const session of sessions) {
    const existing = await prisma.cashRegisterSession.findFirst({
      where: {
        userId: cashier.id,
        openedAt: session.openedAt,
      },
    });

    if (existing) {
      await prisma.cashRegisterSession.update({
        where: { id: existing.id },
        data: session,
      });
    } else {
      await prisma.cashRegisterSession.create({
        data: {
          userId: cashier.id,
          ...session,
        },
      });
    }
  }

  console.log('Cash register sessions seeded successfully');
}