import { Controller, Get, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service.js';
import { UsersService } from './users.service.js';
import { readSessionToken } from '../auth/session-cookie.js';

@ApiTags('Usuarios autorizados')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService, private readonly auth: AuthService) {}

  @Get('authorized')
  @ApiCookieAuth('md_session')
  @ApiOperation({ summary: 'Consultar usuarios activos', description: 'Requiere sesión válida. La base de datos no contiene parentescos; devuelve únicamente campos públicos de cuentas activas.' })
  @ApiResponse({ status: 200, description: 'Arreglo de usuarios activos sin información de credenciales.', content: { 'application/json': { example: { success: true, data: [{ id: 1, username: 'admin.demo', isActive: true }] } } } })
  @ApiResponse({ status: 401, description: 'Sesión ausente, inválida o expirada.', content: { 'application/json': { example: { success: false, message: 'Sesión inválida o expirada' } } } })
  @ApiResponse({ status: 500, description: 'Error interno.' })
  async authorized(@Req() request: Request) {
    await this.auth.currentUser(readSessionToken(request.headers.cookie));
    return { success: true, data: await this.users.authorized() };
  }
}
