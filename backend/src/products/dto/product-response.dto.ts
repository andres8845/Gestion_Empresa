import { ApiProperty } from '@nestjs/swagger';
import { UnitType } from '../../generated/prisma/enums.js';

export class ProductResponseDto {
  @ApiProperty({ type: 'integer' })
  id!: number;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: 'integer' })
  categoryId!: number;

  @ApiProperty({ type: 'number', multipleOf: 0.01 })
  salePrice!: number;

  @ApiProperty({ enum: UnitType })
  unitType!: UnitType;

  @ApiProperty()
  stock!: number;

  @ApiProperty()
  minStock!: number;

  @ApiProperty()
  isvRate!: number;

  @ApiProperty()
  requiresAgeVerification!: boolean;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: 'integer', nullable: true })
  parentProductId!: number | null;

  @ApiProperty()
  unitsPerPackage!: number;
}

const productExample: ProductResponseDto = {
  id: 1,
  code: 'ARR-001',
  name: 'Arroz blanco',
  categoryId: 1,
  salePrice: 18.25,
  unitType: UnitType.libra,
  stock: 25,
  minStock: 8,
  isvRate: 0,
  requiresAgeVerification: false,
  isActive: true,
  parentProductId: null,
  unitsPerPackage: 1,
};

export class ProductsResponseDto {
  @ApiProperty({ type: Boolean, example: true })
  success!: true;

  @ApiProperty({ type: [ProductResponseDto], example: [productExample] })
  data!: ProductResponseDto[];
}
