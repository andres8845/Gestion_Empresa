import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { hash } from 'bcryptjs';
import request from 'supertest';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const databaseUrl = process.env.COMMERCE_TEST_DATABASE_URL;
if (databaseUrl && !/(?:^|[_-])test(?:$|[_-])/i.test(new URL(databaseUrl).pathname.slice(1))) {
  throw new Error('COMMERCE_TEST_DATABASE_URL debe apuntar a una base aislada cuyo nombre incluya test.');
}

describe.skipIf(!databaseUrl)('Fiado y anulaciones con PostgreSQL aislado', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let fixtureUserId: number | undefined;
  let fixtureCategoryId: number | undefined;
  const fixtureCustomerIds: number[] = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl!;
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    const config = new DocumentBuilder().setTitle('Pruebas').setVersion('1').addCookieAuth('md_session').build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    try {
      if (prisma && fixtureUserId) {
        const userId = fixtureUserId;
        await prisma.$transaction(async (tx) => {
          await tx.creditCharge.deleteMany({ where: { sale: { userId } } });
          await tx.creditPayment.deleteMany({ where: { userId } });
          await tx.stockMovement.deleteMany({ where: { userId } });
          await tx.saleDetail.deleteMany({ where: { sale: { userId } } });
          await tx.payment.deleteMany({ where: { sale: { userId } } });
          await tx.sale.deleteMany({ where: { userId } });
          await tx.cashRegisterSession.deleteMany({ where: { userId } });
          await tx.auditLog.deleteMany({ where: { userId } });
          await tx.creditCustomer.deleteMany({ where: { id: { in: fixtureCustomerIds } } });
          if (fixtureCategoryId) {
            await tx.product.deleteMany({ where: { categoryId: fixtureCategoryId } });
            await tx.category.delete({ where: { id: fixtureCategoryId } });
          }
          await tx.user.delete({ where: { id: userId } });
        });
      }
    } finally {
      await app?.close();
    }
  });

  it('persiste abonos y anulaciones, protege el saldo concurrente y conserva la contabilidad al borrar', async () => {
    const http = request(app.getHttpServer());
    const suffix = randomUUID();
    const username = `fiado.test.${suffix}`;
    const user = await prisma.user.create({ data: {
      username, passwordHash: await hash('prueba-segura', 4),
    } });
    fixtureUserId = user.id;
    const login = await http.post('/auth/login').send({ username, password: 'prueba-segura' }).expect(200);
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    const category = await prisma.category.create({ data: { name: suffix } });
    fixtureCategoryId = category.id;
    const product = await prisma.product.create({ data: {
      code: suffix, name: 'Producto de prueba', categoryId: category.id, salePrice: 100, stock: 10,
    } });
    const customer = await prisma.creditCustomer.create({ data: { aliasName: suffix } });
    fixtureCustomerIds.push(customer.id);
    for (const path of ['/fiado/clientes', '/fiado/abonos', '/fiado/abonos/caja', '/ventas']) {
      await http.get(path).expect(401);
    }
    await http.post(`/fiado/clientes/${customer.id}/abonos`).send({ amount: 10, paymentMethod: 'efectivo' }).expect(401);
    await http.delete(`/fiado/clientes/${customer.id}`).expect(401);
    await http.post('/ventas/1/anular').send({ voidReason: 'Error de prueba' }).expect(401);
    await http.post(`/fiado/clientes/${customer.id}/abonos`).set('Cookie', cookie)
      .send({ amount: 10, paymentMethod: 'tarjeta' }).expect(409);
    await http.post('/caja/abrir').set('Cookie', cookie).send({ initialAmount: 500 }).expect(201);

    const createSale = async () => (await http.post('/ventas').set('Cookie', cookie).send({
      lineas: [{ productoId: product.id, cantidad: 1 }], edadVerificada: false,
      pago: { tarjeta: 0, fiado: 100, efectivoRecibido: 0 },
      cliente: { tipo: 'existente', id: customer.id },
    }).expect(201)).body.data;
    const sale = await createSale();
    expect(Number((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock)).toBe(9);
    await http.delete(`/fiado/clientes/${customer.id}`).set('Cookie', cookie).expect(409);
    for (const amount of [0, -1, 1.001, 101]) {
      const response = await http.post(`/fiado/clientes/${customer.id}/abonos`).set('Cookie', cookie)
        .send({ amount, paymentMethod: 'efectivo' });
      expect([400, 409]).toContain(response.status);
    }
    const abonar = (amount: number) => http.post(`/fiado/clientes/${customer.id}/abonos`).set('Cookie', cookie)
      .send({ amount, paymentMethod: 'efectivo' });
    const simultaneous = await Promise.all([abonar(60), abonar(60)]);
    expect(simultaneous.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(Number((await prisma.creditCustomer.findUniqueOrThrow({ where: { id: customer.id } })).balance)).toBe(40);
    await http.post(`/ventas/${sale.id}/anular`).set('Cookie', cookie).send({ voidReason: 'Anulación tras abono' }).expect(409);
    expect(Number((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock)).toBe(9);
    await http.post(`/fiado/clientes/${customer.id}/abonos`).set('Cookie', cookie)
      .send({ amount: 40, paymentMethod: 'tarjeta', userId: 999999 }).expect(201);
    const payments = (await http.get('/fiado/abonos').set('Cookie', cookie).expect(200)).body.data;
    expect(payments.filter((p: { customerId: number }) => p.customerId === customer.id)).toHaveLength(2);
    expect(payments.every((p: { amount: unknown }) => typeof p.amount === 'number')).toBe(true);
    expect(payments.every((p: { userId: number }) => p.userId === user.id)).toBe(true);
    await prisma.auditLog.create({ data: {
      userId: user.id, action: 'eliminacion_fiado', targetTable: 'credit_customers', details: 'Registro anterior sin JSON',
    } });
    const cashBefore = (await http.get('/fiado/abonos/caja').set('Cookie', cookie).expect(200)).body.data;
    await http.delete(`/fiado/clientes/${customer.id}`).set('Cookie', cookie).expect(200);
    expect(await prisma.creditCustomer.findUnique({ where: { id: customer.id } })).toBeNull();
    expect(await prisma.creditPayment.count({ where: { customerId: customer.id } })).toBe(0);
    const cashAfter = (await http.get('/fiado/abonos/caja').set('Cookie', cookie).expect(200)).body.data;
    const total = (rows: { amount: number }[]) => rows.reduce((sum, row) => sum + row.amount, 0);
    expect(total(cashAfter)).toBe(total(cashBefore));
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { targetId: customer.id, action: 'eliminacion_fiado' } });
    expect(audit.details).not.toContain(suffix);
    expect(audit.userId).toBe(user.id);
    await http.get(`/ventas/${sale.id}`).set('Cookie', cookie).expect(200);

    const other = await prisma.creditCustomer.create({ data: { aliasName: `otro.${suffix}` } });
    fixtureCustomerIds.push(other.id);
    const voidable = (await http.post('/ventas').set('Cookie', cookie).send({
      lineas: [{ productoId: product.id, cantidad: 1 }], edadVerificada: false,
      pago: { tarjeta: 0, fiado: 100, efectivoRecibido: 0 }, cliente: { tipo: 'existente', id: other.id },
    }).expect(201)).body.data;
    await http.post(`/ventas/${voidable.id}/anular`).set('Cookie', cookie).send({ voidReason: '  Error   de cobro  ' }).expect(200);
    await http.post(`/ventas/${voidable.id}/anular`).set('Cookie', cookie).send({ voidReason: 'Segundo intento' }).expect(409);
    const stored = (await http.get(`/ventas/${voidable.id}`).set('Cookie', cookie).expect(200)).body.data;
    expect(stored.status).toBe('anulada');
    expect(stored.voidReason).toBe('Error de cobro');
    expect(Number((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock)).toBe(9);
    expect(Number((await prisma.creditCustomer.findUniqueOrThrow({ where: { id: other.id } })).balance)).toBe(0);
    expect((await prisma.creditCustomer.findUniqueOrThrow({ where: { id: other.id } })).lastCreditAt).toBeNull();
    expect(await prisma.stockMovement.count({ where: { saleId: voidable.id, movementType: 'anulacion' } })).toBe(1);
    const history = (await http.get('/ventas?limit=100').set('Cookie', cookie).expect(200)).body.data;
    expect(history.some((entry: { id: number; status: string }) => entry.id === voidable.id && entry.status === 'anulada')).toBe(true);
    const document = (await http.get('/api/docs-json').expect(200)).body;
    expect(document.paths['/fiado/clientes/{id}/abonos'].post).toBeDefined();
    expect(document.paths['/ventas/{id}/anular'].post).toBeDefined();

    const pack = await prisma.product.create({ data: {
      code: `pack.${suffix}`, name: 'Paquete de prueba', categoryId: category.id,
      salePrice: 50, parentProductId: product.id, unitsPerPackage: 6,
    } });
    const packageSale = (await http.post('/ventas').set('Cookie', cookie).send({
      lineas: [{ productoId: pack.id, cantidad: 1 }], edadVerificada: false,
      pago: { tarjeta: 50, fiado: 0, efectivoRecibido: 0 }, cliente: null,
    }).expect(201)).body.data;
    await prisma.product.update({ where: { id: pack.id }, data: { unitsPerPackage: 12 } });
    await http.post(`/ventas/${packageSale.id}/anular`).set('Cookie', cookie).send({ voidReason: 'Devolución del paquete original' }).expect(200);
    expect(Number((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock)).toBe(9);
  }, 30000);
});
