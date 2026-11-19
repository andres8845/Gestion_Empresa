
import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateProductDto } from './create-product.dto.js';

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['stock', 'parentProductId', 'unitsPerPackage'] as const,
),
) {
  @ApiPropertyOptional({
    example: true,
    description: 'Indica si el producto permanece activo.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
