import { UsersService } from './users.service.js';

describe('UsersService', () => {
  it('selects only public fields of active users', async () => {
    const prisma = { user: { findMany: vi.fn().mockResolvedValue([]) } };
    const service = new UsersService(prisma as any);
    await expect(service.authorized()).resolves.toEqual([]);
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: { id: true, username: true, isActive: true },
      orderBy: { id: 'asc' },
    });
  });
});
