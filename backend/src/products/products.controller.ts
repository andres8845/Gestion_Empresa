import { Controller, Get, Header, Query, Req, ValidationPipe, UsePipes, Body, Post,
  Put, Param, ParseIntPipe } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags, ApiBody, ApiParam
} from '@nestjs/swagger';
import type { Request } from 'express';
import { readSessionToken } from '../auth/session-cookie.js';
import { ProductsResponseDto } from './dto/product-response.dto.js';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

@ApiTags('Productos')
@Controller('productos')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}


  @Post()
  @ApiCookieAuth('md_session')
  @ApiOperation({
    summary: 'Crear producto',
    description: 'Registra un producto nuevo y su stock inicial, si corresponde.',
  })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({
    status: 201,
    description: 'Producto creado exitosamente.',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 401, description: 'Sesión inválida o expirada.' })
  @ApiResponse({ status: 404, description: 'Categoría inexistente.' })
  @ApiResponse({ status: 409, description: 'Código de producto duplicado.' })
  async create(
    @Req() request: Request,
    @Body() body: CreateProductDto,
  ) {
    const token = readSessionToken(request.headers.cookie);

    return {
      success: true,
      data: await this.products.create(token, body),
    };
  }


  @Put(':id')
  @ApiCookieAuth('md_session')
  @ApiOperation({
    summary: 'Actualizar producto',
    description:
      'Actualiza los datos generales de un producto. No modifica las existencias.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 37,
    description: 'Identificador del producto.',
  })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({
    status: 200,
    description: 'Producto actualizado exitosamente.',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  @ApiResponse({ status: 401, description: 'Sesión inválida o expirada.' })
  @ApiResponse({ status: 404, description: 'Producto o categoría inexistente.' })
  @ApiResponse({ status: 409, description: 'Código de producto duplicado.' })
  async update(
    @Req() request: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateProductDto,
  ) {
    const token = readSessionToken(request.headers.cookie);

    return {
      success: true,
      data: await this.products.update(token, id, body),
    };
  }


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
