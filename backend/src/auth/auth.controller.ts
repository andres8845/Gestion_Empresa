import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';

const COOKIE = 'md_session';
const cookieOptions = `Path=/; HttpOnly; SameSite=Lax; Max-Age=1800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
function getToken(req: Request) {
  const raw = req.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`));
  return raw ? decodeURIComponent(raw.slice(COOKIE.length + 1)) : undefined;
}

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Iniciar sesión', description: 'Verifica las credenciales y crea una sesión HttpOnly con 30 minutos de inactividad.' })
  @ApiBody({ type: LoginDto, examples: { demo: { value: { username: 'admin.demo', password: 'contraseña' } } } })
  @ApiResponse({ status: 200, description: 'Sesión creada; el identificador viaja exclusivamente en la cookie md_session.', content: { 'application/json': { example: { success: true, data: { user: { id: 1, username: 'admin.demo' } }, message: 'Inicio de sesión exitoso' } } } })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 401, description: 'Usuario o contraseña incorrectos.', content: { 'application/json': { example: { success: false, message: 'Usuario o contraseña incorrectos' } } } })
  @ApiResponse({ status: 429, description: 'Demasiados intentos.' })
  @ApiResponse({ status: 500, description: 'Error interno.' })
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(body?.username, body?.password);
    response.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(result.token)}; ${cookieOptions}`);
    return { success: true, data: { user: result.user }, message: 'Inicio de sesión exitoso' };
  }

  @Get('yo')
  @ApiCookieAuth('md_session')
  @ApiOperation({ summary: 'Consultar usuario actual', description: 'Valida la sesión y renueva sus 30 minutos de inactividad.' })
  @ApiResponse({ status: 200, description: 'Usuario autenticado.', content: { 'application/json': { example: { success: true, data: { id: 1, username: 'admin.demo', isActive: true } } } } })
  @ApiResponse({ status: 401, description: 'Sesión ausente, inválida, expirada o usuario desactivado.', content: { 'application/json': { example: { success: false, message: 'Sesión inválida o expirada' } } } })
  @ApiResponse({ status: 500, description: 'Error interno.' })
  async me(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = getToken(request);
    const user = await this.auth.currentUser(token);
    response.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(token!)}; ${cookieOptions}`);
    return { success: true, data: user };
  }

  @Post('logout')
  @HttpCode(200)
  @ApiCookieAuth('md_session')
  @ApiOperation({ summary: 'Cerrar sesión', description: 'Revoca la sesión actual y elimina la cookie.' })
  @ApiResponse({ status: 200, description: 'Sesión cerrada.', content: { 'application/json': { example: { success: true, message: 'Sesión cerrada' } } } })
  @ApiResponse({ status: 500, description: 'Error interno.' })
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(getToken(request));
    response.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
    return { success: true, message: 'Sesión cerrada' };
  }
}
