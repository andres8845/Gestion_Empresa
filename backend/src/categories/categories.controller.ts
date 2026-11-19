
import {
  Controller,
  Get,
  Header,
  Req,
} from '@nestjs/common';

import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import type { Request } from 'express';

import { readSessionToken } from '../auth/session-cookie.js';
import { CategoriesService } from './categories.service.js';
import { CategoriesResponseDto } from './dto/category-response.dto.js';

@ApiTags('Categorías')
@Controller('categorias')
export class CategoriesController {
  constructor(
    private readonly categories: CategoriesService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiCookieAuth('md_session')
  @ApiOperation({
    summary: 'Consultar categorías',
    description:
      'Consulta las categorías existentes en PostgreSQL mediante Prisma. Requiere una sesión válida.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Categorías ordenadas alfabéticamente. Devuelve un arreglo vacío si no existen registros.',
    type: CategoriesResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Sesión ausente, inválida o expirada.',
    content: {
      'application/json': {
        example: {
          success: false,
          message: 'Sesión inválida o expirada',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno inesperado.',
  })
  async list(
    @Req() request: Request,
  ): Promise<CategoriesResponseDto> {
    const token = readSessionToken(request.headers.cookie);

    const data = await this.categories.list(token);

    return {
      success: true,
      data,
    };
  }
}
