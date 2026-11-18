
import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { CreditService } from './credit.service.js';
import { readSessionToken } from '../auth/session-cookie.js';

@ApiTags('Fiados')
@ApiCookieAuth('md_session')
@Controller('fiado')
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  @Get('clientes')
  @ApiOperation({
    summary: 'Consultar clientes de fiado',
    description: 'Obtiene los clientes y sus saldos actuales.',
  })
  @ApiResponse({
    status: 200,
    description: 'Clientes consultados correctamente.',
    content: {
      'application/json': {
        example: {
          success: true,
          data: [
            {
              id: 1,
              aliasName: 'Cliente frecuente',
              balance: 50,
              lastCreditAt: '2026-11-18T13:21:04.000Z',
              lastMovementAt: '2026-11-18T13:21:04.000Z',
              createdAt: '2026-11-16T06:00:00.000Z',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Sesión inválida o expirada.',
  })
  async findAll(@Req() request: Request) {
    const token = readSessionToken(request.headers.cookie);

    return {
      success: true,
      data: await this.creditService.findAll(token),
    };
  }
}
