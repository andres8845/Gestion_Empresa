import { hash } from 'bcryptjs';
import { AuthService, SESSION_TTL_MS } from './auth.service.js';

describe('AuthService', () => {
  const user = { id: 7, username: 'demo.user', isActive: true, passwordHash: '' };
  let prisma: any;
  let service: AuthService;

  beforeEach(async () => {
    user.passwordHash = await hash('secret-pass', 4);
    prisma = {
      user: { findUnique: vi.fn(async () => user) },
      authSession: {
        create: vi.fn(async ({ data }) => ({ id: 'session-1', ...data })),
        findUnique: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(),
      },
    };
    service = new AuthService(prisma);
  });

  it('creates a random session while only persisting a token hash', async () => {
    const result = await service.login('demo.user', 'secret-pass');
    expect(result.user).toEqual({ id: 7, username: 'demo.user' });
    expect(result.token).toHaveLength(43);
    expect(prisma.authSession.create.mock.calls[0][0].data.tokenHash).not.toBe(result.token);
    expect(prisma.authSession.create.mock.calls[0][0].data.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('uses the same unauthorized error for absent users and bad passwords', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(service.login('missing', 'anything')).rejects.toMatchObject({ status: 401 });
    await expect(service.login('demo.user', 'incorrect')).rejects.toMatchObject({ status: 401 });
  });

  it('rejects inactive users and malformed fields', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ ...user, isActive: false });
    await expect(service.login('demo.user', 'secret-pass')).rejects.toMatchObject({ status: 401 });
    await expect(service.login('', 'secret-pass')).rejects.toMatchObject({ status: 400 });
    await expect(service.login('demo.user', '')).rejects.toMatchObject({ status: 400 });
  });

  it('slides a valid session and rejects expired, revoked, and inactive sessions', async () => {
    const session = { id: 's1', tokenHash: '', expiresAt: new Date(Date.now() + SESSION_TTL_MS), lastActivity: new Date(), user: { id: 7, username: 'demo.user', isActive: true } };
    prisma.authSession.findUnique.mockResolvedValue(session);
    expect(await service.currentUser('opaque-token')).toMatchObject({ id: 7, isActive: true });
    expect(prisma.authSession.update).toHaveBeenCalled();

    prisma.authSession.findUnique.mockResolvedValueOnce({ ...session, expiresAt: new Date(Date.now() - 1) });
    await expect(service.currentUser('expired')).rejects.toMatchObject({ status: 401 });
    prisma.authSession.findUnique.mockResolvedValueOnce({ ...session, lastActivity: new Date(Date.now() - SESSION_TTL_MS - 1) });
    await expect(service.currentUser('inactive-session')).rejects.toMatchObject({ status: 401 });
    prisma.authSession.findUnique.mockResolvedValueOnce(null);
    await expect(service.currentUser('revoked')).rejects.toMatchObject({ status: 401 });
    prisma.authSession.findUnique.mockResolvedValueOnce({ ...session, user: { ...session.user, isActive: false } });
    await expect(service.currentUser('inactive')).rejects.toMatchObject({ status: 401 });
  });

  it('revokes the hashed session token on logout', async () => {
    await service.logout('opaque-token');
    expect(prisma.authSession.deleteMany).toHaveBeenCalledWith({ where: { tokenHash: expect.any(String) } });
  });

  it('limits repeated failed attempts', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    for (let i = 0; i < 10; i++) await expect(service.login('blocked-user', 'bad')).rejects.toMatchObject({ status: 401 });
    await expect(service.login('blocked-user', 'bad')).rejects.toMatchObject({ status: 429 });
  }, 15000);
});
