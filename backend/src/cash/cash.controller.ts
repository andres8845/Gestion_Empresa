
import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { readSessionToken } from '../auth/session-cookie.js';
import { OpenCashDto } from './dto/open-cash.dto.js';
import { CashService } from './cash.service.js';

@ApiTags('Caja')
@Controller('caja')
export class CashController {
  constructor(private readonly cash: CashService) {}

  @Get('abierta')
  @Header('Cache-Control', 'no-store')
  @ApiCookieAuth('md_session')
  @ApiOperation({
    summary: 'Consultar caja abierta',
    description: 'Consulta si existe una sesión de caja abierta. Requiere autenticación.',
  })
  @ApiResponse({ status: 200, description: 'Consulta realizada correctamente.' })
  @ApiResponse({ status: 401, description: 'Sesión inválida o expirada.' })
  async getOpen(@Req() request: Request) {
    const token = readSessionToken(request.headers.cookie);

    return this.cash.getOpen(token);
  }

  @Post('abrir')
  @ApiCookieAuth('md_session')
  @ApiOperation({
    summary: 'Abrir caja',
    description: 'Registra una nueva sesión de caja con el monto inicial indicado.',
  })
  @ApiBody({ type: OpenCashDto })
  @ApiResponse({ status: 201, description: 'Caja abierta exitosamente.' })
  @ApiResponse({ status: 400, description: 'Monto inicial inválido.' })
  @ApiResponse({ status: 401, description: 'Sesión inválida o expirada.' })
  @ApiResponse({ status: 409, description: 'Ya existe una caja abierta.' })
  async open(
    @Req() request: Request,
    @Body() body: OpenCashDto,
  ) {
    const token = readSessionToken(request.headers.cookie);

    return this.cash.open(token, body?.initialAmount);
  }
}
