import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { SEED } from './seed.constants.js';

export async function seedCreditCharges(prisma: PrismaClient) {
  const sale = await prisma.sale.findUnique({
    where: { invoiceNumber: SEED.invoices.credit },
  });

  const customer = await prisma.creditCustomer.findUnique({
    where: { aliasName: SEED.customers.frequent },
  });

  if (!sale || !customer) {
    throw new Error('Credit sale or customer not found');
  }

  await prisma.creditCharge.deleteMany({
    where: { saleId: sale.id },
  });

  await prisma.creditCharge.create({
    data: {
      customerId: customer.id,
      saleId: sale.id,
      amount: '42.00',
      createdAt: sale.createdAt,
    },
  });

  await prisma.creditCustomer.update({
    where: { id: customer.id },
    data: {
      balance: '42.00',
      lastCreditAt: sale.createdAt,
      lastMovementAt: sale.createdAt,
    },
  });

  console.log('Credit charges seeded successfully');
}