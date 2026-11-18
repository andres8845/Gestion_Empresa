
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CreditController } from './credit.controller.js';
import { CreditService } from './credit.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [CreditController],
  providers: [CreditService],
})
export class CreditModule {}
