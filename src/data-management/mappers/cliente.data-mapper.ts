import type { ClientePrisma } from '../../data-access/repositories/interfaces/i-cliente.repository';
import type { ClienteDataModel } from '../models/cliente.data-model';

export class ClienteDataMapper {
  static toDataModel(entity: ClientePrisma): ClienteDataModel {
    return {
      id: entity.id,
      nombre: entity.nombre,
      apellido: entity.apellido,
      email: entity.email,
      identificacion: entity.identificacion ?? null,
      telefono: entity.telefono ?? null,
      createdAt: entity.created_at ?? null,
    };
  }
}
