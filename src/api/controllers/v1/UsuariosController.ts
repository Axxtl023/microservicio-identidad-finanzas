import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, Inject, Req, HttpException, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { IUsuariosService } from '../../../business/usuarios/interfaces/i-usuarios.service';
import { IUSUARIOS_SERVICE } from '../../../business/usuarios/interfaces/i-usuarios.service';
import { CreateUsuarioDto, UpdateUsuarioDto, UsuarioResponseDto } from '../../../business/usuarios/dtos/usuario.dto';
import { ApiResponse as ApiResult } from '../../common/api-response';
import { JwtAuthGuard } from '../../../business/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import type { JwtPayload } from '../../../business/auth/interfaces/jwt-payload.interface';

@ApiTags('Usuarios')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/usuarios')
export class UsuariosController {
  constructor(
    @Inject(IUSUARIOS_SERVICE)
    private readonly usuariosService: IUsuariosService,
  ) {}

  @Get('me')
  @Roles('admin', 'cliente')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ status: 200, type: UsuarioResponseDto })
  async findMe(@Req() req: { user: JwtPayload }): Promise<ApiResult<UsuarioResponseDto>> {
    try {
      const result = await this.usuariosService.findMe(req.user.sub);
      return ApiResult.ok(result, 'Perfil obtenido exitosamente');
    } catch (error) { this.handleError(error); }
  }

  @Patch('me')
  @Roles('admin', 'cliente')
  @ApiOperation({ summary: 'Actualizar email o contraseña del usuario autenticado' })
  async updateMe(
    @Req() req: { user: JwtPayload },
    @Body() dto: UpdateUsuarioDto,
  ): Promise<ApiResult<UsuarioResponseDto>> {
    try {
      const result = await this.usuariosService.updateMe(req.user.sub, dto);
      return ApiResult.ok(result, 'Perfil actualizado exitosamente');
    } catch (error) { this.handleError(error); }
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Listar usuarios (admin)' })
  @ApiQuery({ name: 'search', required: false })
  async findAll(@Query('search') search?: string): Promise<ApiResult<UsuarioResponseDto[]>> {
    try {
      const result = await this.usuariosService.findAllPaginated({ search });
      return ApiResult.ok(result, 'Usuarios obtenidos exitosamente');
    } catch (error) { this.handleError(error); }
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  async findById(@Param('id') id: string): Promise<ApiResult<UsuarioResponseDto>> {
    try {
      const result = await this.usuariosService.findById(id);
      return ApiResult.ok(result);
    } catch (error) { this.handleError(error); }
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Crear nuevo usuario (crea usuario y cliente atómicamente)' })
  @ApiResponse({ status: 201, description: 'Usuario y cliente creados' })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
  async create(@Body() dto: CreateUsuarioDto): Promise<ApiResult<UsuarioResponseDto>> {
    try {
      const result = await this.usuariosService.create(dto);
      return ApiResult.ok(result, 'Usuario creado exitosamente');
    } catch (error) { this.handleError(error); }
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar usuario (admin)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUsuarioDto,
  ): Promise<ApiResult<UsuarioResponseDto>> {
    try {
      const result = await this.usuariosService.update(id, dto);
      return ApiResult.ok(result, 'Usuario actualizado exitosamente');
    } catch (error) { this.handleError(error); }
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar usuario (admin)' })
  async delete(@Param('id') id: string): Promise<ApiResult<null>> {
    try {
      await this.usuariosService.delete(id);
      return ApiResult.ok(null, 'Usuario eliminado exitosamente');
    } catch (error) { this.handleError(error); }
  }

  private handleError(error: unknown): never {
    const status =
      error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = error instanceof Error ? error.message : 'Error interno';
    throw new HttpException(ApiResult.fail(message), status);
  }
}
