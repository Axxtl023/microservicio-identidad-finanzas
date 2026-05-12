import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

const ECUADOR_DIGITS_10 = /^\d{10}$/;
const ECUADOR_DIGITS_MSG = 'Debe tener exactamente 10 dígitos numéricos';
const emptyToUndefined = ({ value }: { value: unknown }) => (value === '' ? undefined : value);

export class CreateClienteDto {
  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  nombre!: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @IsNotEmpty({ message: 'El apellido es requerido' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  apellido!: string;

  @ApiProperty({ example: 'juan.perez@example.com' })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  email!: string;

  @ApiProperty({ required: false, example: '1234567890' })
  @IsOptional()
  @IsString()
  @Matches(ECUADOR_DIGITS_10, { message: ECUADOR_DIGITS_MSG })
  @Transform(emptyToUndefined)
  identificacion?: string;

  @ApiProperty({ required: false, example: '0999999999' })
  @IsOptional()
  @IsString()
  @Matches(ECUADOR_DIGITS_10, { message: ECUADOR_DIGITS_MSG })
  @Transform(emptyToUndefined)
  telefono?: string;
}

export class UpdateClienteDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  nombre?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  apellido?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(ECUADOR_DIGITS_10, { message: ECUADOR_DIGITS_MSG })
  @Transform(emptyToUndefined)
  identificacion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(ECUADOR_DIGITS_10, { message: ECUADOR_DIGITS_MSG })
  @Transform(emptyToUndefined)
  telefono?: string;
}

export class ClienteResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() nombre!: string;
  @ApiProperty() apellido!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ nullable: true }) identificacion!: string | null;
  @ApiProperty({ nullable: true }) telefono!: string | null;
  @ApiProperty({ nullable: true }) createdAt!: Date | null;
}
