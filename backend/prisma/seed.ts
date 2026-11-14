import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

import { seedUsers } from './seeds/user_seed.js';
import { seedCategories } from './seeds/category_seed.js';
import { seedProducts } from './seeds/product_seed.js';
import { seedStockMovements } from './seeds/stock_movement_seed.js';
import { seedCashRegisterSessions } from './seeds/cash_register_session_seed.js';
import { seedSales } from './seeds/sale_seed.js';
import { seedSaleDetails } from './seeds/sale_detail_seed.js';
import { seedPayments } from './seeds/payment_seed.js';
import { seedCreditCustomers } from './seeds/credit_customer_seed.js';
import { seedCreditCharges } from './seeds/credit_charge_seed.js';
import { seedCreditPayments } from './seeds/credit_payment_seed.js';
import { seedAuditLogs } from './seeds/audit_log_seed.js';
import { seedReplenishmentSuggestions } from './seeds/replenishment_suggestion_seed.js';

// Cargar el .env ubicado en la raíz del proyecto.
config({ path: '../.env' });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured');
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting Mercadito Daniela database seeds...');

  await seedUsers(prisma);
  await seedCategories(prisma);
  await seedProducts(prisma);
  await seedCashRegisterSessions(prisma);
  await seedCreditCustomers(prisma);
  await seedSales(prisma);
  await seedSaleDetails(prisma);
  await seedPayments(prisma);
  await seedCreditCharges(prisma);
  await seedStockMovements(prisma);
  await seedCreditPayments(prisma);
  await seedAuditLogs(prisma);
  await seedReplenishmentSuggestions(prisma);

  console.log('All database seeds completed successfully!');
}

main()
  .catch((error) => {
    console.error('Database seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });