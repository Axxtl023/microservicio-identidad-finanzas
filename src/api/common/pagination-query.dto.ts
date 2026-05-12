import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, type: Number, description: 'Número de página (desde 1)' })
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100, type: Number, description: 'Elementos por página' })
  limit?: number;

  @ApiPropertyOptional({ description: 'Texto de búsqueda' })
  search?: string;

  @ApiPropertyOptional({ description: 'Campo de ordenamiento' })
  orderBy?: string;
}
