import { ApiProperty } from '@nestjs/swagger';
import { MovementType } from '../../generated/prisma/enums.js';

export class StockMovementResponseDto {
  @ApiProperty({ type: 'integer' })
  id!: number;

  @ApiProperty()
  productId!: number;

  @ApiProperty()
  productCode!: string;

  @ApiProperty()
  productName!: string;

  @ApiProperty({ enum: MovementType })
  movementType!: MovementType;

  @ApiProperty({ type: 'number', example: 20 })
  quantity!: number;

  @ApiProperty({ type: 'number', example: 10 })
  previousStock!: number;

  @ApiProperty({ type: 'number', example: 30 })
  newStock!: number;

  @ApiProperty({ nullable: true })
  reason!: string | null;

  @ApiProperty({ type: 'integer', nullable: true })
  saleId!: number | null;

  @ApiProperty({ type: 'integer' })
  userId!: number;

  @ApiProperty()
  username!: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt!: string;
}
