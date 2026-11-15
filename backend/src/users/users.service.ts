import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  authorized() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, username: true, isActive: true },
      orderBy: { id: 'asc' },
    });
  }
}
