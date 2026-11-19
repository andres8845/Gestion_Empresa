import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateStockEntryDto {
  @ApiProperty({ example: 1, description: 'ID del producto.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId!: number;

  @ApiProperty({
    example: 20,
    description: 'Cantidad que ingresa al inventario.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999999.99)
  quantity!: number;

  @ApiPropertyOptional({
    example: 12.5,
    description: 'Nuevo costo unitario del producto, si se desea actualizar.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  cost?: number;

  @ApiPropertyOptional({
    example: 'Compra de mercadería a proveedor.',
    maxLength: 250,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  reason?: string;
}
