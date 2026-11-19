
import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({ type: 'integer', example: 1 })
  id!: number;

  @ApiProperty({ example: 'Abarrotes' })
  name!: string;
}

const categoryExample: CategoryResponseDto = {
  id: 1,
  name: 'Abarrotes',
};

export class CategoriesResponseDto {
  @ApiProperty({ type: Boolean, example: true })
  success!: true;

  @ApiProperty({
    type: [CategoryResponseDto],
    example: [categoryExample],
  })
  data!: CategoryResponseDto[];
}
