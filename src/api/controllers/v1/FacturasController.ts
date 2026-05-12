import {
  Controller, Get, Post, Body, Param, Query,
  Inject, Req, HttpException, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { buildMeta } from '../../../common/pagination.types';
import type { IFacturacionService } from '../../../business/facturacion/interfaces/i-facturacion.service';
import { IFACTURACION_SERVICE } from '../../../business/facturacion/interfaces/i-facturacion.service';
import { GenerarFacturaDto, FacturaResponseDto } from '../../../business/facturacion/dtos/factura.dto';
import { ApiResponse as ApiResult } from '../../common/api-response';
import { JwtAuthGuard } from '../../../business/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import type { JwtPayload } from '../../../business/auth/interfaces/jwt-payload.interface';

@ApiTags('Facturas')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/facturas')
export class FacturasController {
  constructor(
    @Inject(IFACTURACION_SERVICE)
    private readonly facturacionService: IFacturacionService,
  ) {}

  @Post('generar')
  @Roles('admin', 'cliente')
  @ApiOperation({ summary: 'Generar factura y registrar pago para una reserva' })
  @ApiBody({ type: GenerarFacturaDto })
  @ApiResponse({ status: 201, type: FacturaResponseDto })
  @ApiResponse({ status: 403, description: 'Sin perfil de cliente registrado' })
  @ApiResponse({ status: 404, description: 'Método de pago no encontrado' })
  @ApiResponse({ status: 409, description: 'La reserva ya tiene una factura' })
  async generarFactura(
    @Req() req: { user: JwtPayload },
    @Body() dto: GenerarFacturaDto,
  ): Promise<ApiResult<FacturaResponseDto>> {
    try {
      const result = await this.facturacionService.generarFactura(req.user.email, req.user.rol, dto);
      return ApiResult.ok(result, 'Factura generada exitosamente');
    } catch (error) { this.handleError(error); }
  }

  @Get('me')
  @Roles('admin', 'cliente')
  @ApiOperation({ summary: 'Obtener historial de facturas del cliente autenticado' })
  async getMisFacturas(@Req() req: { user: JwtPayload }): Promise<ApiResult<FacturaResponseDto[]>> {
    try {
      const result = await this.facturacionService.getMisFacturas(req.user.email);
      return ApiResult.ok(result, 'Facturas obtenidas exitosamente');
    } catch (error) { this.handleError(error); }
  }

  @Get('all')
  @Roles('admin')
  @ApiOperation({ summary: 'Listar todas las facturas con paginación (admin)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAllFacturas(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResult<FacturaResponseDto[]>> {
    try {
      const p = page ? Number(page) : 1;
      const l = limit ? Number(limit) : 20;
      const result = await this.facturacionService.getAllFacturasPaginated({ search, page: p, limit: l });
      return ApiResult.paginated(result.data, buildMeta(result.total, result.page, result.limit), 'Facturas obtenidas exitosamente');
    } catch (error) { this.handleError(error); }
  }

  @Get(':id')
  @Roles('admin', 'cliente')
  @ApiOperation({ summary: 'Obtener factura por ID' })
  async getFacturaById(@Param('id') id: string): Promise<ApiResult<FacturaResponseDto>> {
    try {
      const result = await this.facturacionService.getFacturaById(id);
      return ApiResult.ok(result, 'Factura obtenida exitosamente');
    } catch (error) { this.handleError(error); }
  }

  private handleError(error: unknown): never {
    const status =
      error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = error instanceof Error ? error.message : 'Error interno';
    throw new HttpException(ApiResult.fail(message), status);
  }
}
