import type { AuditoriaListDataModel } from '../../../data-management/models/auditoria.data-model';

export interface LogAuditoriaInput {
  idUsuario?: string | null;
  accion: 'CREATE' | 'UPDATE' | 'DELETE';
  tabla: string;
  valorAnterior?: unknown;
  valorNuevo?: unknown;
  ip?: string | null;
}

export interface AuditoriaQueryFiltros {
  idUsuario?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  limit?: number;
}

export interface IAuditoriaService {
  log(input: LogAuditoriaInput): Promise<void>;
  findAll(filtros?: AuditoriaQueryFiltros): Promise<AuditoriaListDataModel>;
}

export const IAUDITORIA_SERVICE = 'IAUDITORIA_SERVICE';
