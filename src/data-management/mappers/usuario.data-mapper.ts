import type { UsuarioConRol } from '../../data-access/repositories/interfaces/i-usuario-app.repository';
import type { UsuarioDataModel } from '../models/usuario.data-model';

export class UsuarioDataMapper {
  static toDataModel(entity: UsuarioConRol): UsuarioDataModel {
    return {
      id: entity.id,
      email: entity.email,
      passwordHash: entity.password_hash,
      createdAt: entity.created_at ?? null,
      rol: entity.roles?.nombre ?? null,
    };
  }
}
