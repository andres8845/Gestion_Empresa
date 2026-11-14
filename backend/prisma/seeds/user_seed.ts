import { hash } from 'bcryptjs';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { SEED } from './seed.constants.js';

export async function seedUsers(prisma: PrismaClient) {
  const password = process.env.SEED_USER_PASSWORD;

  if (!password) {
    throw new Error('SEED_USER_PASSWORD is not configured');
  }

  const passwordHash = await hash(password, 12);

  const users = [
    SEED.users.admin,
    SEED.users.cashier,
  ];

  for (const username of users) {
    await prisma.user.upsert({
      where: { username },
      update: {
        isActive: true,
      },
      create: {
        username,
        passwordHash,
        isActive: true,
      },
    });
  }

  console.log('Users seeded successfully');
}