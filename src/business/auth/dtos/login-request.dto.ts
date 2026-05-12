import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({ description: 'Correo electrónico del usuario', example: 'admin@booking.com' })
  @IsEmail({}, { message: 'El formato del correo es inválido' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'Contraseña del usuario', example: 'Admin123*' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'La contraseña debe ser de al menos 6 caracteres' })
  password!: string;
}
