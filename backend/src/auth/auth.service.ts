import { Injectable, UnauthorizedException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { compare } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';

export const SESSION_TTL_MS = 30 * 60 * 1000;
const GENERIC_LOGIN_ERROR = 'Usuario o contraseña incorrectos';
const DUMMY_HASH = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6qNgGGpZ5QKJ6A7dN4hT7k2gP5c3W';

@Injectable()
export class AuthService {
  private readonly attempts = new Map<string, { count: number; until: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async login(username: unknown, password: unknown) {
    if (typeof username !== 'string' || typeof password !== 'string' ||
      !username.trim() || !password || username.length > 100 || password.length > 200) {
      throw new BadRequestException({ success: false, message: 'Usuario y contraseña son obligatorios y deben tener formato válido' });
    }
    const key = username.trim().toLowerCase();
    const now = Date.now();
    const attempt = this.attempts.get(key);
    if (attempt && attempt.until > now && attempt.count >= 10) throw new HttpException({ success: false, message: 'Demasiados intentos. Intente nuevamente más tarde.' }, HttpStatus.TOO_MANY_REQUESTS);

    const user = await this.prisma.user.findUnique({ where: { username: key } });
    const valid = await compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !user.isActive || !valid) {
      const current = this.attempts.get(key);
      this.attempts.set(key, current && current.until > now
        ? { count: current.count + 1, until: current.until }
        : { count: 1, until: now + 15 * 60 * 1000 });
      throw new UnauthorizedException({ success: false, message: GENERIC_LOGIN_ERROR });
    }
    this.attempts.delete(key);
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(now + SESSION_TTL_MS);
    await this.prisma.authSession.create({ data: {
      userId: user.id,
      tokenHash: this.hashToken(token),
      expiresAt,
      lastActivity: new Date(now),
    } });
    return { token, user: { id: user.id, username: user.username } };
  }

  async currentUser(token?: string) {
    if (!token || token.length > 200) throw new UnauthorizedException({ success: false, message: 'Sesión inválida o expirada' });
    const now = new Date();
    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { user: { select: { id: true, username: true, isActive: true } } },
    });
    if (!session || session.expiresAt <= now || session.lastActivity.getTime() + SESSION_TTL_MS <= now.getTime() || !session.user.isActive) {
      if (session) await this.prisma.authSession.delete({ where: { id: session.id } });
      throw new UnauthorizedException({ success: false, message: 'Sesión inválida o expirada' });
    }
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    await this.prisma.authSession.update({ where: { id: session.id }, data: { lastActivity: now, expiresAt } });
    return { id: session.user.id, username: session.user.username, isActive: true };
  }

  async logout(token?: string) {
    if (token) await this.prisma.authSession.deleteMany({ where: { tokenHash: this.hashToken(token) } });
  }

  private hashToken(token: string) { return createHash('sha256').update(token).digest('hex'); }
}
