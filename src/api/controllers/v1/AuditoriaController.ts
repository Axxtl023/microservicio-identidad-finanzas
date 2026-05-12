import {
  Controller, Get, Query, Inject, HttpException, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { IAuditoriaService } from '../../../business/auditoria/interfaces/i-auditoria.service';
import { IAUDITORIA_SERVICE } from '../../../business/auditoria/interfaces/i-auditoria.service';
import { AuditoriaResponseDto } from '../../../business/auditoria/dtos/auditoria.dto';
import { ApiResponse as ApiResult } from '../../common/api-response';
import { buildMeta } from '../../../common/pagination.types';
import { JwtAuthGuard } from '../../../business/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';

@ApiTags('Auditoría')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/admin/auditoria')
export class AuditoriaController {
  constructor(
    @Inject(IAUDITORIA_SERVICE)
    private readonly auditoriaService: IAuditoriaService,
  ) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Listar registros de auditoría paginados (solo admin)' })
  @ApiQuery({ name: 'idUsuario', required: false })
  @ApiQuery({ name: 'fechaDesde', required: false })
  @ApiQuery({ name: 'fechaHasta', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: [AuditoriaResponseDto] })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async findAll(
    @Query('idUsuario') idUsuario?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResult<AuditoriaResponseDto[]>> {
    try {
      const result = await this.auditoriaService.findAll({
        idUsuario,
        fechaDesde,
        fechaHasta,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      });
      return ApiResult.paginated(
        result.data as AuditoriaResponseDto[],
        buildMeta(result.total, result.page, result.limit),
        'Registros de auditoría obtenidos exitosamente',
      );
    } catch (error) {
      const status =
        error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error instanceof Error ? error.message : 'Error interno';
      throw new HttpException(ApiResult.fail(message), status);
    }
  }
}
