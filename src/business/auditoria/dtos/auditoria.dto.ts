import { ApiProperty } from '@nestjs/swagger';

export class AuditoriaResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true, type: String }) idUsuario!: string | null;
  @ApiProperty() accion!: string;
  @ApiProperty() tabla!: string;
  @ApiProperty({ nullable: true, type: String }) detalles!: string | null;
  @ApiProperty({ nullable: true, type: String }) ip!: string | null;
  @ApiProperty() fecha!: Date;
}

export class AuditoriaListResponseDto {
  @ApiProperty({ type: [AuditoriaResponseDto] }) data!: AuditoriaResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
}
