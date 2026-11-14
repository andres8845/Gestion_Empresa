import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { SEED } from './seed.constants.js';

export async function seedStockMovements(prisma: PrismaClient) {
  const admin = await prisma.user.findUnique({
    where: { username: SEED.users.admin },
  });

  if (!admin) {
    throw new Error('Admin user not found');
  }

  const sales = await prisma.sale.findMany({
    where: {
      invoiceNumber: {
        in: Object.values(SEED.invoices),
      },
    },
    include: {
      details: {
        include: {
          product: {
            include: {
              parentProduct: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const saleIds = sales.map((sale) => sale.id);

  // Eliminar solamente los movimientos de demostración.
  await prisma.stockMovement.deleteMany({
    where: {
      OR: [
        { reason: { startsWith: 'SEED:' } },
        { saleId: { in: saleIds } },
      ],
    },
  });

  const products = await prisma.product.findMany({
    where: { parentProductId: null },
  });

  const finalStock = new Map<number, number>();
  const netMovements = new Map<number, number>();
  const currentStock = new Map<number, number>();

  for (const product of products) {
    finalStock.set(product.id, Number(product.stock.toString()));
    netMovements.set(product.id, 0);
  }

  // Calcular las salidas netas de las ventas activas.
  for (const sale of sales) {
    if (sale.status !== 'activa') continue;

    for (const detail of sale.details) {
      const product = detail.product;
      const inventoryProduct = product.parentProduct ?? product;

      const quantity =
        Number(detail.quantity.toString()) *
        (product.parentProduct
          ? Number(product.unitsPerPackage.toString())
          : 1);

      const previous = netMovements.get(inventoryProduct.id) ?? 0;

      netMovements.set(
        inventoryProduct.id,
        previous - quantity,
      );
    }
  }

  // Ajuste de una unidad por producto dañado.
  const tomato = await prisma.product.findUnique({
    where: { code: SEED.products.tomato },
  });

  if (!tomato) {
    throw new Error('Tomato product not found');
  }

  netMovements.set(
    tomato.id,
    (netMovements.get(tomato.id) ?? 0) - 1,
  );

  // Registrar las entradas iniciales.
  for (const product of products) {
    const final = finalStock.get(product.id)!;
    const net = netMovements.get(product.id)!;
    const opening = final - net;

    if (opening < 0) {
      throw new Error(`Invalid opening stock for ${product.code}`);
    }

    currentStock.set(product.id, opening);

    if (opening === 0) continue;

    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        movementType: 'entrada_mercaderia',
        quantity: opening.toFixed(2),
        previousStock: '0.00',
        newStock: opening.toFixed(2),
        reason: 'SEED: inventario inicial',
        userId: admin.id,
        createdAt: SEED.dates.stockEntry,
      },
    });
  }

  // Registrar las salidas y anulaciones de ventas.
  for (const sale of sales) {
    for (const detail of sale.details) {
      const product = detail.product;
      const inventoryProduct = product.parentProduct ?? product;

      const quantity =
        Number(detail.quantity.toString()) *
        (product.parentProduct
          ? Number(product.unitsPerPackage.toString())
          : 1);

      const previous = currentStock.get(inventoryProduct.id)!;
      const afterSale = previous - quantity;

      await prisma.stockMovement.create({
        data: {
          productId: inventoryProduct.id,
          movementType: 'venta',
          quantity: (-quantity).toFixed(2),
          previousStock: previous.toFixed(2),
          newStock: afterSale.toFixed(2),
          reason: 'SEED: venta de demostración',
          saleId: sale.id,
          userId: sale.userId,
          createdAt: sale.createdAt,
        },
      });

      currentStock.set(inventoryProduct.id, afterSale);

      if (sale.status === 'anulada') {
        await prisma.stockMovement.create({
          data: {
            productId: inventoryProduct.id,
            movementType: 'anulacion',
            quantity: quantity.toFixed(2),
            previousStock: afterSale.toFixed(2),
            newStock: previous.toFixed(2),
            reason: 'SEED: reversión de venta anulada',
            saleId: sale.id,
            userId: sale.userId,
            createdAt: new Date(sale.createdAt.getTime() + 1000),
          },
        });

        currentStock.set(inventoryProduct.id, previous);
      }
    }
  }

  // Registrar ajuste manual por producto dañado.
  const tomatoPrevious = currentStock.get(tomato.id)!;
  const tomatoNew = tomatoPrevious - 1;

  await prisma.stockMovement.create({
    data: {
      productId: tomato.id,
      movementType: 'ajuste_manual',
      quantity: '-1.00',
      previousStock: tomatoPrevious.toFixed(2),
      newStock: tomatoNew.toFixed(2),
      reason: 'SEED: ajuste por producto dañado',
      userId: admin.id,
      createdAt: SEED.dates.adjustment,
    },
  });

  currentStock.set(tomato.id, tomatoNew);

  // Verificar que el inventario coincida con los productos.
  for (const product of products) {
    const expected = finalStock.get(product.id)!;
    const actual = currentStock.get(product.id)!;

    if (Math.abs(expected - actual) > 0.001) {
      throw new Error(
        `Stock mismatch for ${product.code}: expected ${expected}, got ${actual}`,
      );
    }
  }

  console.log('Stock movements seeded successfully');
}