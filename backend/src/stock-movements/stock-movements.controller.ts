import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Query,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { readSessionToken } from '../auth/session-cookie.js';
import { CreateStockEntryDto } from './dto/create-stock-entry.dto.js';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto.js';
import { StockMovementQueryDto } from './dto/stock-movement-query.dto.js';
import { MovementType } from '../generated/prisma/enums.js';
import { StockMovementsService } from './stock-movements.service.js';

@ApiTags('Movimientos de inventario')
@Controller('stock-movements')
@ApiCookieAuth('md_session')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class StockMovementsController {
  constructor(
    private readonly stockMovements: StockMovementsService,
  ) {}

  // Registrar entrada de mercadería.
  @Post('entries')
  @ApiOperation({
    summary: 'Registrar entrada de mercadería',
    description: 'Aumenta las existencias y registra el movimiento de inventario.',
  })
  @ApiBody({ type: CreateStockEntryDto })
  @ApiResponse({ status: 201, description: 'Entrada registrada exitosamente.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o producto no permitido.' })
  @ApiResponse({ status: 401, description: 'Sesión inválida o expirada.' })
  @ApiResponse({ status: 404, description: 'Producto inexistente.' })
  async createEntry(
    @Req() request: Request,
    @Body() body: CreateStockEntryDto,
  ) {
    const token = readSessionToken(request.headers.cookie);

    return {
      success: true,
      data: await this.stockMovements.createEntry(token, body),
    };
  }

  // Registrar ajuste manual.
  @Post('adjustments')
  @ApiOperation({
    summary: 'Registrar ajuste manual de inventario',
    description: 'Establece las existencias reales y registra la diferencia.',
  })
  @ApiBody({ type: CreateStockAdjustmentDto })
  @ApiResponse({ status: 201, description: 'Ajuste registrado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o sin diferencia de inventario.' })
  @ApiResponse({ status: 401, description: 'Sesión inválida o expirada.' })
  @ApiResponse({ status: 404, description: 'Producto inexistente.' })
  async createAdjustment(
    @Req() request: Request,
    @Body() body: CreateStockAdjustmentDto,
  ) {
    const token = readSessionToken(request.headers.cookie);

    return {
      success: true,
      data: await this.stockMovements.createAdjustment(token, body),
    };
  }

  // Consultar historial.
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Consultar movimientos de inventario',
    description: 'Consulta el historial con filtros y paginación.',
  })
  @ApiQuery({ name: 'productId', required: false, type: Number })
  @ApiQuery({ name: 'movementType', required: false, enum: MovementType })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Historial consultado exitosamente.' })
  @ApiResponse({ status: 401, description: 'Sesión inválida o expirada.' })
  async list(
    @Req() request: Request,
    @Query() query: StockMovementQueryDto,
  ) {
    const token = readSessionToken(request.headers.cookie);

    return {
      success: true,
      ...(await this.stockMovements.list(token, query)),
    };
  }
}
