import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { hash } from 'bcryptjs';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Authentication and authorized users (HTTP)', () => {
  let app: INestApplication;
  const users = [
    { id: 1, username: 'active.user', passwordHash: '', isActive: true },
    { id: 2, username: 'inactive.user', passwordHash: '', isActive: false },
  ];
  const sessions = new Map<string, any>();
  const db = {
    user: {
      findUnique: vi.fn(({ where }: any) => users.find((user) => user.username === where.username) ?? null),
      findMany: vi.fn(({ where }: any) => users.filter((user) => user.isActive === where.isActive).map(({ id, username, isActive }) => ({ id, username, isActive }))),
    },
    authSession: {
      create: vi.fn(({ data }: any) => { const row = { id: crypto.randomUUID(), user: users.find((user) => user.id === data.userId), ...data }; sessions.set(data.tokenHash, row); return row; }),
      findUnique: vi.fn(({ where }: any) => sessions.get(where.tokenHash) ?? null),
      update: vi.fn(({ where, data }: any) => { const row = [...sessions.values()].find((item) => item.id === where.id); Object.assign(row, data); return row; }),
      delete: vi.fn(({ where }: any) => { const item = [...sessions.entries()].find(([, row]) => row.id === where.id); if (item) sessions.delete(item[0]); }),
      deleteMany: vi.fn(({ where }: any) => { sessions.delete(where.tokenHash); }),
    },
  };

  beforeAll(async () => {
    users[0].passwordHash = await hash('test-password', 4);
    users[1].passwordHash = await hash('test-password', 4);
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue(db).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('rejects unauthenticated and forged cookies', async () => {
    await request(app.getHttpServer()).get('/auth/yo').expect(401);
    await request(app.getHttpServer()).get('/users/authorized').set('Cookie', 'md_session=forged').expect(401);
  });

  it('logs in, authenticates, and returns only active public user fields', async () => {
    const login = await request(app.getHttpServer()).post('/auth/login').send({ username: 'active.user', password: 'test-password' }).expect(200);
    expect(login.body).toMatchObject({ success: true, data: { user: { id: 1, username: 'active.user' } } });
    expect(JSON.stringify(login.body)).not.toContain('passwordHash');
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    await request(app.getHttpServer()).get('/auth/yo').set('Cookie', cookie).expect(200).expect(({ body }) => {
      expect(body.data).toEqual({ id: 1, username: 'active.user', isActive: true });
    });
    await request(app.getHttpServer()).get('/users/authorized').set('Cookie', cookie).expect(200).expect(({ body }) => {
      expect(body.data).toEqual([{ id: 1, username: 'active.user', isActive: true }]);
      expect(JSON.stringify(body)).not.toContain('passwordHash');
    });
  });

  it('rejects incorrect credentials and inactive accounts with the same response', async () => {
    const badPassword = await request(app.getHttpServer()).post('/auth/login').send({ username: 'active.user', password: 'wrong' }).expect(401);
    const inactive = await request(app.getHttpServer()).post('/auth/login').send({ username: 'inactive.user', password: 'test-password' }).expect(401);
    const missing = await request(app.getHttpServer()).post('/auth/login').send({ username: 'missing', password: 'test-password' }).expect(401);
    expect(badPassword.body).toEqual(inactive.body);
    expect(inactive.body).toEqual(missing.body);
    await request(app.getHttpServer()).post('/auth/login').send({ username: '', password: '' }).expect(400);
  });

  it('revokes the session at logout', async () => {
    const login = await request(app.getHttpServer()).post('/auth/login').send({ username: 'active.user', password: 'test-password' }).expect(200);
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    await request(app.getHttpServer()).post('/auth/logout').set('Cookie', cookie).expect(200);
    await request(app.getHttpServer()).get('/auth/yo').set('Cookie', cookie).expect(401);
  });
});
