import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateStockAdjustmentDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId!: number;

  @ApiProperty({
    example: 15,
    description: 'Existencias reales después del conteo físico.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  newStock!: number;

  @ApiPropertyOptional({
    example: 'Diferencia encontrada durante inventario físico.',
    maxLength: 250,
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  reason?: string;
}
