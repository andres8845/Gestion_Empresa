
import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';

import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import type { Request } from 'express';

import { readSessionToken } from '../auth/session-cookie.js';
import { CreateSaleDto } from './dto/create-sale.dto.js';
import { SalesService } from './sales.service.js';

@ApiTags('Ventas')
@ApiCookieAuth('md_session')
@Controller('ventas')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar una venta',
    description:
      'Registra una venta, sus detalles, pagos, movimientos de inventario y cargos de fiado mediante una transacción.',
  })
  @ApiBody({ type: CreateSaleDto })
  @ApiResponse({
    status: 201,
    description: 'Venta registrada exitosamente.',
  })
  @ApiResponse({ status: 400, description: 'Datos de venta inválidos.' })
  @ApiResponse({ status: 401, description: 'Sesión inválida o expirada.' })
  @ApiResponse({ status: 409, description: 'Conflicto con la caja o la operación.' })
  async create(
    @Req() request: Request,
    @Body() body: CreateSaleDto,
  ) {
    return this.sales.create(
      readSessionToken(request.headers.cookie),
      body,
    );
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Consultar historial de ventas',
    description: 'Devuelve las ventas más recientes.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 50,
  })
  @ApiResponse({ status: 200, description: 'Historial consultado.' })
  @ApiResponse({ status: 401, description: 'Sesión inválida o expirada.' })
  async findAll(
    @Req() request: Request,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit === undefined ? 50 : Number(limit);

    return this.sales.findAll(
      readSessionToken(request.headers.cookie),
      parsedLimit,
    );
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Consultar una venta por ID',
    description: 'Devuelve la información de una venta y sus detalles para generar la factura.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Venta encontrada.' })
  @ApiResponse({ status: 401, description: 'Sesión inválida o expirada.' })
  @ApiResponse({ status: 404, description: 'Venta no encontrada.' })
  async findOne(
    @Req() request: Request,
    @Param('id') id: string,
  ) {
    return this.sales.findOne(
      readSessionToken(request.headers.cookie),
      Number(id),
    );
  }
}
