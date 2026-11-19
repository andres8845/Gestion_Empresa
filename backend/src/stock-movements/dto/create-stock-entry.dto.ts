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
    description: 'Cantidad de unidades que ingresan al inventario.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999999.99)
  quantity!: number;

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
