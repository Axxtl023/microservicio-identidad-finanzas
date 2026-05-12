import type { UsuarioConRol } from './i-usuario-app.repository';

export interface CreateUsuarioInput {
  email: string;
  passwordHash: string;
  idRol?: string;
}

export interface UpdateUsuarioInput {
  email?: string;
  passwordHash?: string;
  idRol?: string;
}

export interface UsuarioFiltros {
  search?: string;
  page?: number;
  limit?: number;
}

export interface IUsuarioRepository {
  findAll(): Promise<UsuarioConRol[]>;
  findAllPaginated(filtros?: UsuarioFiltros): Promise<{ data: UsuarioConRol[]; total: number }>;
  findById(id: string): Promise<UsuarioConRol | null>;
  findByEmail(email: string): Promise<UsuarioConRol | null>;
  create(data: CreateUsuarioInput): Promise<UsuarioConRol>;
  update(id: string, data: UpdateUsuarioInput): Promise<UsuarioConRol>;
  delete(id: string): Promise<void>;
}

export const IUSUARIO_REPOSITORY = 'IUSUARIO_REPOSITORY';
