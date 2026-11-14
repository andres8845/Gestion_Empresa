import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { SEED } from './seed.constants.js';

export async function seedCreditCustomers(prisma: PrismaClient) {
  const customers = [
    SEED.customers.frequent,
    SEED.customers.occasional,
  ];

  for (const aliasName of customers) {
    await prisma.creditCustomer.upsert({
      where: { aliasName },
      update: {
        balance: '0.00',
        lastCreditAt: null,
        lastMovementAt: null,
      },
      create: {
        aliasName,
        balance: '0.00',
      },
    });
  }

  console.log('Credit customers seeded successfully');
}