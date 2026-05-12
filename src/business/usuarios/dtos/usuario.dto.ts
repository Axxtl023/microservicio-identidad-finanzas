import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
const PASSWORD_MSG = 'La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula y un número';

export class CreateUsuarioDto {
  @ApiProperty({ example: 'admin@booking.com' })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  email!: string;

  @ApiProperty({ example: 'Admin123' })
  @IsString()
  @IsNotEmpty()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MSG })
  password!: string;

  @ApiProperty({ required: false, description: 'Nombre del cliente a crear junto al usuario' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  nombre?: string;

  @ApiProperty({ required: false, description: 'Apellido del cliente a crear junto al usuario' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  apellido?: string;

  @ApiProperty({ required: false, description: 'UUID del rol' })
  @IsOptional()
  @IsString()
  idRol?: string;

  @ApiProperty({ required: false, description: 'Nombre del rol: ADMIN o CLIENTE', enum: ['ADMIN', 'CLIENTE'] })
  @IsOptional()
  @IsString()
  rolNombre?: string;
}

export class UpdateUsuarioDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === '' ? undefined : value))
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MSG })
  password?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  idRol?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  rolNombre?: string;
}

export class UsuarioResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ nullable: true }) rol!: string | null;
  @ApiProperty({ nullable: true }) createdAt!: Date | null;
}
