import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { ProductsModule } from './products/products.module.js';
import { CashModule } from './cash/cash.module.js';
import { SalesModule } from './sales/sales.module.js';
import { CreditModule } from './credit/credit.module.js';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, ProductsModule, CashModule, SalesModule, CreditModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
