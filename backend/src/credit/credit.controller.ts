
import { Body, Controller, Delete, Get, Header, Param, Post, Req } from '@nestjs/common';
import { ApiBody, ApiTags, ApiCookieAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { CreditService } from './credit.service.js';
import { readSessionToken } from '../auth/session-cookie.js';

@ApiTags('Fiados')
@ApiCookieAuth('cookie')
@ApiResponse({ status: 401, description: 'Sesión inválida o expirada.' })
@ApiResponse({ status: 500, description: 'Error interno.' })
@Controller('fiado')
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  @Get('clientes')
  @Header('Cache-Control', 'no-store')
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

  @Get('abonos')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Consultar abonos de PostgreSQL', description: 'Devuelve abonos ordenados por fecha e ID descendente, con importes numéricos.' })
  @ApiResponse({ status: 200, description: 'Abonos consultados.', schema: { example: { success: true, data: [{ id: 1, customerId: 1, amount: 25, paymentMethod: 'efectivo', cashRegisterSessionId: 1, userId: 1, createdAt: '2026-11-21T12:00:00.000Z' }] } } })
  async payments(@Req() request: Request) {
    return { success: true, data: await this.creditService.payments(readSessionToken(request.headers.cookie)) };
  }

  @Get('abonos/caja')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Consultar abonos para el resumen de caja', description: 'Incluye los importes de clientes eliminados, sin datos personales.' })
  @ApiResponse({ status: 200, description: 'Abonos contables con caja, método, importe y fecha.' })
  async cashPayments(@Req() request: Request) {
    return { success: true, data: await this.creditService.cashPayments(readSessionToken(request.headers.cookie)) };
  }

  @Post('clientes/:id/abonos')
  @ApiOperation({ summary: 'Registrar abono', description: 'Guarda el abono y descuenta el saldo en una transacción. Requiere caja abierta para ambos métodos de pago.' })
  @ApiBody({ schema: { type: 'object', required: ['amount', 'paymentMethod'], properties: {
    amount: { type: 'number', minimum: 0.01, multipleOf: 0.01, example: 25 },
    paymentMethod: { type: 'string', enum: ['efectivo', 'tarjeta'] },
  } } })
  @ApiResponse({ status: 201, description: 'Abono registrado.' })
  @ApiResponse({ status: 400, description: 'Monto, método o ID inválido.' })
  @ApiResponse({ status: 404, description: 'Cliente inexistente.' })
  @ApiResponse({ status: 409, description: 'Sin caja abierta, saldo insuficiente o conflicto concurrente.' })
  async pay(@Req() request: Request, @Param('id') id: string, @Body() body: { amount?: unknown; paymentMethod?: unknown }) {
    return { success: true, data: await this.creditService.pay(readSessionToken(request.headers.cookie), Number(id), body?.amount, body?.paymentMethod) };
  }

  @Delete('clientes/:id')
  @ApiOperation({ summary: 'Eliminar cliente sin deuda', description: 'Elimina el cliente, cargos y abonos. Conserva las ventas y una auditoría sin alias con los totales de abonos por caja.' })
  @ApiResponse({ status: 200, description: 'Cliente eliminado.' })
  @ApiResponse({ status: 400, description: 'ID inválido.' })
  @ApiResponse({ status: 404, description: 'Cliente inexistente.' })
  @ApiResponse({ status: 409, description: 'Saldo distinto de cero o conflicto concurrente.' })
  async remove(@Req() request: Request, @Param('id') id: string) {
    await this.creditService.remove(readSessionToken(request.headers.cookie), Number(id));
    return { success: true };
  }
}
