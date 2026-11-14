import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { SEED } from './seed.constants.js';

export async function seedSales(prisma: PrismaClient) {
  const cashier = await prisma.user.findUnique({
    where: { username: SEED.users.cashier },
  });

  if (!cashier) {
    throw new Error('Cashier user not found');
  }

  const closedSession = await prisma.cashRegisterSession.findFirst({
    where: {
      userId: cashier.id,
      openedAt: SEED.dates.closedSession,
    },
  });

  const openSession = await prisma.cashRegisterSession.findFirst({
    where: {
      userId: cashier.id,
      openedAt: SEED.dates.openSession,
    },
  });

  if (!closedSession || !openSession) {
    throw new Error('Cash register sessions not found');
  }

  const sales = [
    {
      invoiceNumber: SEED.invoices.cash,
      cashRegisterSessionId: closedSession.id,
      total: '60.00',
      cashReceived: '100.00',
      changeGiven: '40.00',
      status: 'activa' as const,
      voidReason: null,
      createdAt: SEED.dates.cashSale,
    },
    {
      invoiceNumber: SEED.invoices.card,
      cashRegisterSessionId: closedSession.id,
      total: '56.00',
      cashReceived: '0.00',
      changeGiven: '0.00',
      status: 'activa' as const,
      voidReason: null,
      createdAt: SEED.dates.cardSale,
    },
    {
      invoiceNumber: SEED.invoices.mixed,
      cashRegisterSessionId: openSession.id,
      total: '54.00',
      cashReceived: '30.00',
      changeGiven: '0.00',
      status: 'activa' as const,
      voidReason: null,
      createdAt: SEED.dates.mixedSale,
    },
    {
      invoiceNumber: SEED.invoices.credit,
      cashRegisterSessionId: openSession.id,
      total: '42.00',
      cashReceived: '0.00',
      changeGiven: '0.00',
      status: 'activa' as const,
      voidReason: null,
      createdAt: SEED.dates.creditSale,
    },
    {
      invoiceNumber: SEED.invoices.voided,
      cashRegisterSessionId: closedSession.id,
      total: '20.00',
      cashReceived: '0.00',
      changeGiven: '0.00',
      status: 'anulada' as const,
      voidReason: 'Anulación de demostración por error de captura',
      createdAt: SEED.dates.voidedSale,
    },
  ];

  for (const sale of sales) {
    const data = {
      cashRegisterSessionId: sale.cashRegisterSessionId,
      userId: cashier.id,
      total: sale.total,
      cashReceived: sale.cashReceived,
      changeGiven: sale.changeGiven,
      status: sale.status,
      voidReason: sale.voidReason,
      createdAt: sale.createdAt,
    };

    await prisma.sale.upsert({
      where: { invoiceNumber: sale.invoiceNumber },
      update: data,
      create: {
        invoiceNumber: sale.invoiceNumber,
        ...data,
      },
    });
  }

  console.log('Sales seeded successfully');
}