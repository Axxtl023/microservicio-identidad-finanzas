import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, Inject, Req, HttpException, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/pagination-query.dto';
import { buildMeta } from '../../../common/pagination.types';
import type { IClientesService } from '../../../business/clientes/interfaces/i-clientes.service';
import { ICLIENTES_SERVICE } from '../../../business/clientes/interfaces/i-clientes.service';
import { CreateClienteDto, UpdateClienteDto, ClienteResponseDto } from '../../../business/clientes/dtos/cliente.dto';
import { ApiResponse as ApiResult } from '../../common/api-response';
import { JwtAuthGuard } from '../../../business/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import type { JwtPayload } from '../../../business/auth/interfaces/jwt-payload.interface';

@ApiTags('Clientes')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/clientes')
export class ClientesController {
  constructor(
    @Inject(ICLIENTES_SERVICE)
    private readonly clientesService: IClientesService,
  ) {}

  @Get('me')
  @Roles('admin', 'cliente')
  @ApiOperation({ summary: 'Obtener perfil de cliente del usuario autenticado' })
  async findMe(@Req() req: { user: JwtPayload }): Promise<ApiResult<ClienteResponseDto | null>> {
    try {
      const result = await this.clientesService.findByUserEmail(req.user.email);
      const message = result ? 'Perfil obtenido exitosamente' : 'No tiene un perfil de cliente registrado';
      return ApiResult.ok(result, message);
    } catch (error) { this.handleError(error); }
  }

  @Patch('me')
  @Roles('admin', 'cliente')
  @ApiOperation({ summary: 'Actualizar perfil de cliente del usuario autenticado' })
  @ApiBody({ type: UpdateClienteDto })
  async updateMe(
    @Req() req: { user: JwtPayload },
    @Body() dto: UpdateClienteDto,
  ): Promise<ApiResult<ClienteResponseDto>> {
    try {
      const result = await this.clientesService.updatePerfilAsync(req.user.sub, dto);
      return ApiResult.ok(result, 'Perfil actualizado exitosamente');
    } catch (error) { this.handleError(error); }
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Listar clientes con paginación (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  async findAll(@Query() query: PaginationQueryDto): Promise<ApiResult<ClienteResponseDto[]>> {
    try {
      const page = query.page ? Number(query.page) : 1;
      const limit = query.limit ? Number(query.limit) : 20;
      const result = await this.clientesService.findAllPaginated({ search: query.search, page, limit });
      return ApiResult.paginated(result.data, buildMeta(result.total, result.page, result.limit), 'Clientes obtenidos exitosamente');
    } catch (error) { this.handleError(error); }
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Obtener cliente por ID' })
  async findById(@Param('id') id: string): Promise<ApiResult<ClienteResponseDto>> {
    try {
      const result = await this.clientesService.findById(id);
      return ApiResult.ok(result);
    } catch (error) { this.handleError(error); }
  }

  @Post()
  @Roles('admin', 'cliente')
  @ApiOperation({ summary: 'Crear perfil de cliente' })
  async create(@Body() dto: CreateClienteDto): Promise<ApiResult<ClienteResponseDto>> {
    try {
      const result = await this.clientesService.create(dto);
      return ApiResult.ok(result, 'Cliente creado exitosamente');
    } catch (error) { this.handleError(error); }
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar cliente' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateClienteDto,
  ): Promise<ApiResult<ClienteResponseDto>> {
    try {
      const result = await this.clientesService.update(id, dto);
      return ApiResult.ok(result, 'Cliente actualizado exitosamente');
    } catch (error) { this.handleError(error); }
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar cliente' })
  async delete(@Param('id') id: string): Promise<ApiResult<null>> {
    try {
      await this.clientesService.delete(id);
      return ApiResult.ok(null, 'Cliente eliminado exitosamente');
    } catch (error) { this.handleError(error); }
  }

  private handleError(error: unknown): never {
    const status =
      error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = error instanceof Error ? error.message : 'Error interno';
    throw new HttpException(ApiResult.fail(message), status);
  }
}
