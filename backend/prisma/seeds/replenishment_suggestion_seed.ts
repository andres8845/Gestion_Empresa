import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { SEED } from './seed.constants.js';

export async function seedReplenishmentSuggestions(
  prisma: PrismaClient,
) {
  const products = await prisma.product.findMany();

  const averageSales: Record<string, number> = {
    [SEED.products.rice]: 2.5,
    [SEED.products.beans]: 1.2,
    [SEED.products.sugar]: 1.8,
    [SEED.products.water]: 3.0,
    [SEED.products.soda]: 1.5,
    [SEED.products.waterPackage]: 0,
    [SEED.products.tomato]: 0.8,
    [SEED.products.orange]: 0.6,
    [SEED.products.detergent]: 0.4,
    [SEED.products.soap]: 0.6,
    [SEED.products.notebook]: 0.2,
    [SEED.products.pen]: 1.1,
  };

  for (const product of products) {
    const average = averageSales[product.code] ?? 0;
    const stock = Number(product.stock.toString());

    const daysOfStock =
      average > 0
        ? (stock / average).toFixed(2)
        : null;

    const suggestedQuantity = Math.max(
      0,
      Math.ceil(average * 7 * 1.2 - stock),
    );

    const data = {
      avgDailySales: average.toFixed(2),
      daysOfStock,
      suggestedQuantity,
      isSlowMover: average === 0,
    };

    await prisma.replenishmentSuggestion.upsert({
      where: {
        runDate_productId: {
          runDate: SEED.dates.replenishment,
          productId: product.id,
        },
      },
      update: data,
      create: {
        runDate: SEED.dates.replenishment,
        productId: product.id,
        ...data,
      },
    });
  }

  console.log('Replenishment suggestions seeded successfully');
}