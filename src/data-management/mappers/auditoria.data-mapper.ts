import type { AuditoriaPrisma } from '../../data-access/repositories/interfaces/i-auditoria.repository';
import type { AuditoriaDataModel } from '../models/auditoria.data-model';

export class AuditoriaDataMapper {
  static toDataModel(entity: AuditoriaPrisma): AuditoriaDataModel {
    return {
      id: entity.id,
      idUsuario: entity.id_usuario ?? null,
      accion: entity.accion,
      tabla: entity.tabla,
      detalles: entity.detalles ?? null,
      ip: entity.ip ?? null,
      fecha: entity.fecha ?? new Date(),
    };
  }
}
