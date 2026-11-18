import { Controller, Get, Header, Query, Req } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { readSessionToken } from '../auth/session-cookie.js';
import { ProductsResponseDto } from './dto/product-response.dto.js';
import { ProductsService } from './products.service.js';

@ApiTags('Productos')
@Controller('productos')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  // «cookie» es el nombre del esquema que Swagger registra para md_session.
  @ApiCookieAuth('md_session')
  @ApiOperation({
    summary: 'Consultar productos',
    description: 'Consulta de solo lectura de productos en PostgreSQL mediante Prisma. Requiere la cookie md_session.',
  })
  @ApiQuery({
    name: 'activos',
    required: false,
    type: Boolean,
    description: 'Use true para consultar solo productos activos. Si se omite o es false, devuelve todos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Productos ordenados por nombre e ID. Devuelve un arreglo vacío si no hay resultados.',
    type: ProductsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Sesión ausente, inválida, expirada o usuario desactivado.',
    content: { 'application/json': { example: { success: false, message: 'Sesión inválida o expirada' } } },
  })
  @ApiResponse({ status: 500, description: 'Error interno inesperado.' })
  async list(
    @Req() request: Request,
    @Query('activos') activos?: string,
  ): Promise<ProductsResponseDto> {
    const token = readSessionToken(request.headers.cookie);
    const data = await this.products.list(token, activos === 'true');
    return { success: true, data };
  }
}
