import type { auditoria } from '@prisma/client';

export type AuditoriaPrisma = auditoria;

export interface CreateAuditoriaInput {
  idUsuario?: string | null;
  accion: string;
  tabla: string;
  detalles?: string | null;
  ip?: string | null;
}

export interface AuditoriaFiltros {
  idUsuario?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedAuditoria {
  data: AuditoriaPrisma[];
  total: number;
}

export interface IAuditoriaRepository {
  create(data: CreateAuditoriaInput): Promise<AuditoriaPrisma>;
  findAllPaginated(filtros?: AuditoriaFiltros): Promise<PaginatedAuditoria>;
}

export const IAUDITORIA_REPOSITORY = 'IAUDITORIA_REPOSITORY';
