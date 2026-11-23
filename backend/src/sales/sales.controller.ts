
import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
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
@ApiCookieAuth('cookie')
@Controller('ventas')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Post(':id/anular')
  @HttpCode(200)
  @ApiOperation({ summary: 'Anular venta', description: 'Anula la venta, revierte sus movimientos originales de inventario y descuenta los cargos pendientes de fiado en una transacción. Rechaza la anulación si el saldo pendiente no cubre el cargo.' })
  @ApiBody({ schema: { type: 'object', required: ['voidReason'], properties: {
    voidReason: { type: 'string', minLength: 5, maxLength: 200, example: 'Error al registrar los productos' },
  } } })
  @ApiResponse({ status: 200, description: 'Venta anulada.' })
  @ApiResponse({ status: 400, description: 'ID o motivo inválido.' })
  @ApiResponse({ status: 401, description: 'Sesión inválida.' })
  @ApiResponse({ status: 404, description: 'Venta inexistente.' })
  @ApiResponse({ status: 409, description: 'Ya anulada, fiado abonado o conflicto concurrente.' })
  @ApiResponse({ status: 500, description: 'Error interno.' })
  async voidSale(@Req() request: Request, @Param('id') id: string, @Body() body: { voidReason?: unknown }) {
    return this.sales.voidSale(readSessionToken(request.headers.cookie), Number(id), body?.voidReason);
  }

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
