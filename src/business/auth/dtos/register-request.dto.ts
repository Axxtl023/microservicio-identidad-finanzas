import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const PASSWORD_MSG = 'La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula y un número';
const ECUADOR_DIGITS_10 = /^\d{10}$/;
const ECUADOR_DIGITS_MSG = 'Debe tener exactamente 10 dígitos numéricos';

export class RegisterRequestDto {
  @ApiProperty({ example: 'juan.perez@example.com' })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  email!: string;

  @ApiProperty({ example: 'Admin123' })
  @IsString()
  @IsNotEmpty()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MSG })
  password!: string;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  nombre!: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  apellido!: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  @IsNotEmpty()
  @Matches(ECUADOR_DIGITS_10, { message: ECUADOR_DIGITS_MSG })
  identificacion!: string;
}
