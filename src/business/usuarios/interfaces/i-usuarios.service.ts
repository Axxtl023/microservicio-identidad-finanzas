import type { CreateUsuarioDto, UpdateUsuarioDto, UsuarioResponseDto } from '../dtos/usuario.dto';

export interface IUsuariosService {
  findAll(): Promise<UsuarioResponseDto[]>;
  findAllPaginated(filtros?: { search?: string }): Promise<UsuarioResponseDto[]>;
  findById(id: string): Promise<UsuarioResponseDto>;
  findMe(userId: string): Promise<UsuarioResponseDto>;
  create(dto: CreateUsuarioDto): Promise<UsuarioResponseDto>;
  update(id: string, dto: UpdateUsuarioDto): Promise<UsuarioResponseDto>;
  updateMe(userId: string, dto: UpdateUsuarioDto): Promise<UsuarioResponseDto>;
  delete(id: string): Promise<void>;
}

export const IUSUARIOS_SERVICE = 'IUSUARIOS_SERVICE';
