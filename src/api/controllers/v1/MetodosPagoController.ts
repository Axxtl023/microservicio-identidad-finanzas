import {
  Controller, Get, Inject, HttpException, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { IMetodosPagoService } from '../../../business/facturacion/interfaces/i-metodos-pago.service';
import { IMETODOS_PAGO_SERVICE } from '../../../business/facturacion/interfaces/i-metodos-pago.service';
import { MetodoPagoResponseDto } from '../../../business/facturacion/dtos/factura.dto';
import { ApiResponse as ApiResult } from '../../common/api-response';
import { JwtAuthGuard } from '../../../business/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';

@ApiTags('Métodos de Pago')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/metodos-pago')
export class MetodosPagoController {
  constructor(
    @Inject(IMETODOS_PAGO_SERVICE)
    private readonly metodosPagoService: IMetodosPagoService,
  ) {}

  @Get()
  @Roles('admin', 'cliente')
  @ApiOperation({ summary: 'Listar métodos de pago disponibles' })
  @ApiResponse({ status: 200, type: [MetodoPagoResponseDto] })
  async findAll(): Promise<ApiResult<MetodoPagoResponseDto[]>> {
    try {
      const result = await this.metodosPagoService.findAll();
      return ApiResult.ok(result, 'Métodos de pago obtenidos exitosamente');
    } catch (error) {
      const status =
        error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error instanceof Error ? error.message : 'Error interno';
      throw new HttpException(ApiResult.fail(message), status);
    }
  }
}
