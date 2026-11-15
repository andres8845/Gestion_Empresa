import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin.demo', minLength: 1, maxLength: 100 })
  username!: string;

  @ApiProperty({ example: 'contraseña', minLength: 1, maxLength: 200, format: 'password' })
  password!: string;
}
