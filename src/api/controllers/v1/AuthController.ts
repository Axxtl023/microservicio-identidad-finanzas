import { Controller, Post, Body, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { IAuthService } from '../../../business/auth/interfaces/i-auth.service';
import { IAUTH_SERVICE } from '../../../business/auth/interfaces/i-auth.service';
import { LoginRequestDto } from '../../../business/auth/dtos/login-request.dto';
import type { LoginResponseDto } from '../../../business/auth/dtos/login-response.dto';
import { RegisterRequestDto } from '../../../business/auth/dtos/register-request.dto';
import { ApiResponse as ApiResult } from '../../common/api-response';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    @Inject(IAUTH_SERVICE)
    private readonly authService: IAuthService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Autenticación de usuario con email y contraseña' })
  @ApiResponse({ status: 201, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Body() request: LoginRequestDto): Promise<ApiResult<LoginResponseDto>> {
    try {
      const result = await this.authService.loginAsync(request);
      return ApiResult.ok(result, 'Login exitoso');
    } catch (error) {
      this.handleError(error);
    }
  }

  @Post('register')
  @ApiOperation({ summary: 'Registro: crea usuario con rol CLIENTE y perfil de cliente' })
  @ApiResponse({ status: 201, description: 'Registro exitoso — devuelve token de acceso' })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
  async register(@Body() dto: RegisterRequestDto): Promise<ApiResult<LoginResponseDto>> {
    try {
      const result = await this.authService.register(dto);
      return ApiResult.ok(result, 'Registro exitoso');
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    const status =
      error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = error instanceof Error ? error.message : 'Error interno';
    throw new HttpException(ApiResult.fail(message), status);
  }
}
