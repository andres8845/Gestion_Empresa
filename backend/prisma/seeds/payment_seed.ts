import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { SEED } from './seed.constants.js';

export async function seedPayments(prisma: PrismaClient) {
  const sales = await prisma.sale.findMany({
    where: {
      invoiceNumber: {
        in: Object.values(SEED.invoices),
      },
    },
  });

  const saleIds = sales.map((sale) => sale.id);

  await prisma.payment.deleteMany({
    where: {
      saleId: { in: saleIds },
    },
  });

  const payments = [
    {
      invoice: SEED.invoices.cash,
      paymentMethod: 'efectivo' as const,
      amount: '60.00',
    },
    {
      invoice: SEED.invoices.card,
      paymentMethod: 'tarjeta' as const,
      amount: '56.00',
    },
    {
      invoice: SEED.invoices.mixed,
      paymentMethod: 'efectivo' as const,
      amount: '30.00',
    },
    {
      invoice: SEED.invoices.mixed,
      paymentMethod: 'tarjeta' as const,
      amount: '24.00',
    },
    {
      invoice: SEED.invoices.credit,
      paymentMethod: 'fiado' as const,
      amount: '42.00',
    },
  ];

  for (const payment of payments) {
    const sale = sales.find(
      (item) => item.invoiceNumber === payment.invoice,
    );

    if (!sale) {
      throw new Error(`Sale not found: ${payment.invoice}`);
    }

    await prisma.payment.create({
      data: {
        saleId: sale.id,
        paymentMethod: payment.paymentMethod,
        amount: payment.amount,
      },
    });
  }

  console.log('Payments seeded successfully');
}