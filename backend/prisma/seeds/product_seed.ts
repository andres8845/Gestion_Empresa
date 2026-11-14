import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { SEED } from './seed.constants.js';

export async function seedProducts(prisma: PrismaClient) {
  const products = [
    {
      code: SEED.products.rice,
      name: 'Arroz blanco (1 lb)',
      category: SEED.categories.groceries,
      cost: '14.00',
      salePrice: '18.00',
      unitType: 'libra' as const,
      stock: '25.00',
      minStock: '8.00',
    },
    {
      code: SEED.products.beans,
      name: 'Frijol rojo (1 lb)',
      category: SEED.categories.groceries,
      cost: '16.00',
      salePrice: '20.00',
      unitType: 'libra' as const,
      stock: '18.00',
      minStock: '6.00',
    },
    {
      code: SEED.products.sugar,
      name: 'Azúcar (1 lb)',
      category: SEED.categories.groceries,
      cost: '12.00',
      salePrice: '15.00',
      unitType: 'libra' as const,
      stock: '30.00',
      minStock: '8.00',
    },
    {
      code: SEED.products.water,
      name: 'Agua purificada 600 ml',
      category: SEED.categories.beverages,
      cost: '5.00',
      salePrice: '8.00',
      unitType: 'unidad' as const,
      stock: '45.00',
      minStock: '12.00',
    },
    {
      code: SEED.products.soda,
      name: 'Refresco cola 1.5 L',
      category: SEED.categories.beverages,
      cost: '21.00',
      salePrice: '28.00',
      unitType: 'unidad' as const,
      stock: '20.00',
      minStock: '6.00',
    },
    {
      code: SEED.products.tomato,
      name: 'Tomate (1 lb)',
      category: SEED.categories.produce,
      cost: '12.00',
      salePrice: '18.00',
      unitType: 'libra' as const,
      stock: '12.00',
      minStock: '5.00',
    },
    {
      code: SEED.products.orange,
      name: 'Naranja (1 lb)',
      category: SEED.categories.produce,
      cost: '10.00',
      salePrice: '15.00',
      unitType: 'libra' as const,
      stock: '20.00',
      minStock: '5.00',
    },
    {
      code: SEED.products.detergent,
      name: 'Detergente 500 g',
      category: SEED.categories.cleaning,
      cost: '20.00',
      salePrice: '28.00',
      unitType: 'unidad' as const,
      stock: '15.00',
      minStock: '4.00',
    },
    {
      code: SEED.products.soap,
      name: 'Jabón de baño',
      category: SEED.categories.personalCare,
      cost: '8.00',
      salePrice: '12.00',
      unitType: 'unidad' as const,
      stock: '25.00',
      minStock: '6.00',
    },
    {
      code: SEED.products.notebook,
      name: 'Cuaderno rayado',
      category: SEED.categories.school,
      cost: '15.00',
      salePrice: '22.00',
      unitType: 'unidad' as const,
      stock: '18.00',
      minStock: '5.00',
    },
    {
      code: SEED.products.pen,
      name: 'Lapicero azul',
      category: SEED.categories.school,
      cost: '3.00',
      salePrice: '5.00',
      unitType: 'unidad' as const,
      stock: '50.00',
      minStock: '10.00',
    },
  ];

  for (const product of products) {
    const category = await prisma.category.findUnique({
      where: { name: product.category },
    });

    if (!category) {
      throw new Error(`Category not found: ${product.category}`);
    }

    const data = {
      name: product.name,
      categoryId: category.id,
      cost: product.cost,
      salePrice: product.salePrice,
      unitType: product.unitType,
      stock: product.stock,
      minStock: product.minStock,
      isvRate: '15.00',
      requiresAgeVerification: false,
      isActive: true,
      parentProductId: null,
      unitsPerPackage: '1.00',
      updatedAt: new Date(),
    };

    await prisma.product.upsert({
      where: { code: product.code },
      update: data,
      create: {
        code: product.code,
        ...data,
      },
    });
  }

  // Producto de paquete: 6 botellas de agua.
  const water = await prisma.product.findUnique({
    where: { code: SEED.products.water },
  });

  const beverages = await prisma.category.findUnique({
    where: { name: SEED.categories.beverages },
  });

  if (!water || !beverages) {
    throw new Error('Water product or beverages category not found');
  }

  const packageData = {
    name: 'Paquete de agua (6 unidades)',
    categoryId: beverages.id,
    cost: '30.00',
    salePrice: '42.00',
    unitType: 'unidad' as const,
    stock: '0.00',
    minStock: '0.00',
    isvRate: '15.00',
    requiresAgeVerification: false,
    isActive: true,
    parentProductId: water.id,
    unitsPerPackage: '6.00',
    updatedAt: new Date(),
  };

  await prisma.product.upsert({
    where: { code: SEED.products.waterPackage },
    update: packageData,
    create: {
      code: SEED.products.waterPackage,
      ...packageData,
    },
  });

  console.log('Products seeded successfully');
}