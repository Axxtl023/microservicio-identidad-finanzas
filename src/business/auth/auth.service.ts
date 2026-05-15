import { Injectable, Inject, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { IAuthService } from './interfaces/i-auth.service';
import type { IUnitOfWork } from '../../data-management/interfaces/i-unit-of-work';
import { IUNIT_OF_WORK } from '../../data-management/interfaces/i-unit-of-work';
import { UsuarioDataMapper } from '../../data-management/mappers/usuario.data-mapper';
import { LoginRequestDto } from './dtos/login-request.dto';
import { LoginResponseDto } from './dtos/login-response.dto';
import { RegisterRequestDto } from './dtos/register-request.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    @Inject(IUNIT_OF_WORK)
    private readonly unitOfWork: IUnitOfWork,
    private readonly jwtService: JwtService,
  ) {}

  async loginAsync(request: LoginRequestDto): Promise<LoginResponseDto> {
    const entity = await this.unitOfWork.usuarioRepository.findByEmail(request.email);

    if (!entity) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValid = await bcrypt.compare(request.password, entity.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const dataModel = UsuarioDataMapper.toDataModel(entity);

    const payload: JwtPayload = {
      sub: dataModel.id,
      email: dataModel.email,
      rol: dataModel.rol,
    };

    return {
      userId: dataModel.id,
      email: dataModel.email,
      rol: dataModel.rol,
      token: this.jwtService.sign(payload),
    };
  }

  async register(dto: RegisterRequestDto): Promise<LoginResponseDto> {
    const existing = await this.unitOfWork.usuarioRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(`El email ${dto.email} ya está registrado`);
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const { usuario } = await this.unitOfWork.registerUsuarioConCliente({
      email: dto.email,
      passwordHash,
      nombre: dto.nombre,
      apellido: dto.apellido,
      identificacion: dto.identificacion,
    });

    const dataModel = UsuarioDataMapper.toDataModel(usuario);

    const payload: JwtPayload = {
      sub: dataModel.id,
      email: dataModel.email,
      rol: dataModel.rol,
    };

    return {
      userId: dataModel.id,
      email: dataModel.email,
      rol: dataModel.rol,
      token: this.jwtService.sign(payload),
    };
  }
}
