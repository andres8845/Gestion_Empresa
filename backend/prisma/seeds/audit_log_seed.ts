import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { SEED } from './seed.constants.js';

export async function seedAuditLogs(prisma: PrismaClient) {
  const admin = await prisma.user.findUnique({
    where: { username: SEED.users.admin },
  });

  const voidedSale = await prisma.sale.findUnique({
    where: { invoiceNumber: SEED.invoices.voided },
  });

  const tomato = await prisma.product.findUnique({
    where: { code: SEED.products.tomato },
  });

  const soap = await prisma.product.findUnique({
    where: { code: SEED.products.soap },
  });

  if (!admin || !voidedSale || !tomato || !soap) {
    throw new Error('Required audit seed records not found');
  }

  await prisma.auditLog.deleteMany({
    where: {
      details: { startsWith: 'SEED:' },
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: 'anulacion_venta',
        targetTable: 'sales',
        targetId: voidedSale.id,
        details: 'SEED: Venta de demostración anulada por error de captura.',
      },
      {
        userId: admin.id,
        action: 'ajuste_stock',
        targetTable: 'products',
        targetId: tomato.id,
        details: 'SEED: Ajuste de inventario por producto dañado.',
      },
      {
        userId: admin.id,
        action: 'cambio_precio',
        targetTable: 'products',
        targetId: soap.id,
        details: 'SEED: Actualización de precio de demostración.',
      },
    ],
  });

  console.log('Audit logs seeded successfully');
}