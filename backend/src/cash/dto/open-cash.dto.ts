
import { ApiProperty } from '@nestjs/swagger';

export class OpenCashDto {
  @ApiProperty({
    type: 'number',
    example: 500,
    minimum: 0,
    description: 'Monto inicial de efectivo disponible en caja.',
  })
  initialAmount!: number;
}
