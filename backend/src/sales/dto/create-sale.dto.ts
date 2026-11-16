
import { ApiProperty } from '@nestjs/swagger';

export class SaleLineDto {
  @ApiProperty({
    example: 1,
    description: 'ID del producto que se desea vender.',
  })
  productoId!: number;

  @ApiProperty({
    example: 2,
    description: 'Cantidad de unidades o libras.',
    minimum: 0.01,
  })
  cantidad!: number;
}

export class SalePaymentDto {
  @ApiProperty({
    example: 0,
    description: 'Monto pagado con tarjeta.',
    minimum: 0,
  })
  tarjeta!: number;

  @ApiProperty({
    example: 0,
    description: 'Monto que se registra como fiado.',
    minimum: 0,
  })
  fiado!: number;

  @ApiProperty({
    example: 100,
    description: 'Efectivo entregado por el cliente.',
    minimum: 0,
  })
  efectivoRecibido!: number;
}

export class CreateSaleDto {
  @ApiProperty({
    type: [SaleLineDto],
    example: [
      {
        productoId: 1,
        cantidad: 2,
      },
    ],
  })
  lineas!: SaleLineDto[];

  @ApiProperty({
    example: false,
    description: 'Indica si se verificó la edad cuando corresponde.',
  })
  edadVerificada!: boolean;

  @ApiProperty({
    type: SalePaymentDto,
    example: {
      tarjeta: 0,
      fiado: 0,
      efectivoRecibido: 100,
    },
  })
  pago!: SalePaymentDto;

  @ApiProperty({
    nullable: true,
    description:
      'Cliente de fiado. Puede ser existente, nuevo o null si no hay fiado.',
    oneOf: [
      {
        type: 'object',
        properties: {
          tipo: { type: 'string', enum: ['existente'] },
          id: { type: 'integer', example: 1 },
        },
        required: ['tipo', 'id'],
      },
      {
        type: 'object',
        properties: {
          tipo: { type: 'string', enum: ['nuevo'] },
          alias: { type: 'string', example: 'Doña Marta' },
        },
        required: ['tipo', 'alias'],
      },
    ],
    example: null,
  })
  cliente!:
    | { tipo: 'existente'; id: number }
    | { tipo: 'nuevo'; alias: string }
    | null;
}
