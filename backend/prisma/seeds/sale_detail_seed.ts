import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { SEED } from './seed.constants.js';

export async function seedSaleDetails(prisma: PrismaClient) {
  const invoices = Object.values(SEED.invoices);

  const sales = await prisma.sale.findMany({
    where: {
      invoiceNumber: { in: invoices },
    },
  });

  const saleIds = sales.map((sale) => sale.id);

  await prisma.saleDetail.deleteMany({
    where: {
      saleId: { in: saleIds },
    },
  });

  const details = [
    { invoice: SEED.invoices.cash, product: SEED.products.rice, quantity: 2 },
    { invoice: SEED.invoices.cash, product: SEED.products.water, quantity: 3 },

    { invoice: SEED.invoices.card, product: SEED.products.soda, quantity: 2 },

    { invoice: SEED.invoices.mixed, product: SEED.products.beans, quantity: 1.5 },
    { invoice: SEED.invoices.mixed, product: SEED.products.soap, quantity: 2 },

    { invoice: SEED.invoices.credit, product: SEED.products.waterPackage, quantity: 1 },

    { invoice: SEED.invoices.voided, product: SEED.products.beans, quantity: 1 },
  ];

  for (const detail of details) {
    const sale = sales.find(
      (item) => item.invoiceNumber === detail.invoice,
    );

    const product = await prisma.product.findUnique({
      where: { code: detail.product },
    });

    if (!sale || !product) {
      throw new Error(`Missing sale or product: ${detail.invoice}`);
    }

    const subtotal =
      Number(product.salePrice.toString()) * detail.quantity;

    await prisma.saleDetail.create({
      data: {
        saleId: sale.id,
        productId: product.id,
        quantity: detail.quantity.toFixed(2),
        unitPrice: product.salePrice,
        isvRate: product.isvRate,
        subtotal: subtotal.toFixed(2),
      },
    });
  }

  console.log('Sale details seeded successfully');
}