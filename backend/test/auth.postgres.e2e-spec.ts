import { createHash, randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { hash } from 'bcryptjs';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const testDatabaseUrl = process.env.AUTH_TEST_DATABASE_URL;
if (testDatabaseUrl) {
  const databaseName = new URL(testDatabaseUrl).pathname.replace(/^\//, '');
  if (!/(?:^|[_-])test(?:$|[_-])/i.test(databaseName)) {
    throw new Error('AUTH_TEST_DATABASE_URL debe apuntar a una base separada cuyo nombre incluya "test".');
  }
}

describe.skipIf(!testDatabaseUrl)('Authentication with isolated PostgreSQL', () => {
  let app: INestApplication | undefined;
  let prisma: PrismaService | undefined;
  let testUserId: number | undefined;
  const username = `auth.integration.${randomUUID()}`;
  const password = `integration-${randomUUID()}`;

  beforeAll(async () => {
    // This suite can only connect through AUTH_TEST_DATABASE_URL, whose database name is checked above.
    process.env.DATABASE_URL = testDatabaseUrl!;
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const user = await prisma.user.create({
      data: { username, passwordHash: await hash(password, 4), isActive: true },
      select: { id: true },
    });
    testUserId = user.id;
  }, 30000);

  afterAll(async () => {
    try {
      if (prisma && testUserId !== undefined) {
        try {
          await prisma.authSession.deleteMany({ where: { userId: testUserId } });
        } finally {
          await prisma.user.deleteMany({ where: { id: testUserId } });
        }
      }
    } finally {
      await app?.close();
    }
  }, 30000);

  it('persists only token hashes, validates access, revokes sessions, and rejects expired sessions', async () => {
    const server = app!.getHttpServer();
    const login = await request(server).post('/auth/login').send({ username, password }).expect(200);
    const cookie = login.headers['set-cookie'][0].split(';')[0] as string;
    const tokenValue = cookie.slice('md_session='.length);
    const token = decodeURIComponent(tokenValue);
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const persisted = await prisma!.authSession.findUnique({ where: { tokenHash } });
    expect(persisted).not.toBeNull();
    expect(persisted?.tokenHash).toBe(tokenHash);
    expect(persisted?.tokenHash).not.toBe(token);

    await request(server).get('/auth/yo').set('Cookie', cookie).expect(200).expect(({ body }) => {
      expect(body.data).toEqual({ id: testUserId, username, isActive: true });
      expect(JSON.stringify(body)).not.toContain('passwordHash');
    });
    await request(server).get('/users/authorized').set('Cookie', cookie).expect(200).expect(({ body }) => {
      expect(body.data).toContainEqual({ id: testUserId, username, isActive: true });
      expect(JSON.stringify(body)).not.toContain('passwordHash');
    });

    await request(server).post('/auth/logout').set('Cookie', cookie).expect(200);
    expect(await prisma!.authSession.findUnique({ where: { tokenHash } })).toBeNull();
    await request(server).get('/auth/yo').set('Cookie', cookie).expect(401);

    const expiringLogin = await request(server).post('/auth/login').send({ username, password }).expect(200);
    const expiringCookie = expiringLogin.headers['set-cookie'][0].split(';')[0] as string;
    const expiringToken = decodeURIComponent(expiringCookie.slice('md_session='.length));
    const expiringHash = createHash('sha256').update(expiringToken).digest('hex');
    await prisma!.authSession.update({
      where: { tokenHash: expiringHash },
      data: { expiresAt: new Date(Date.now() - 1000), lastActivity: new Date() },
    });
    await request(server).get('/auth/yo').set('Cookie', expiringCookie).expect(401);
    expect(await prisma!.authSession.findUnique({ where: { tokenHash: expiringHash } })).toBeNull();
  }, 30000);
});
