import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  IAuditoriaRepository,
  AuditoriaPrisma,
  CreateAuditoriaInput,
  AuditoriaFiltros,
  PaginatedAuditoria,
} from './interfaces/i-auditoria.repository';

@Injectable()
export class AuditoriaRepository implements IAuditoriaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAuditoriaInput): Promise<AuditoriaPrisma> {
    return this.prisma.auditoria.create({
      data: {
        ...(data.idUsuario ? { id_usuario: data.idUsuario } : {}),
        accion: data.accion,
        tabla: data.tabla,
        ...(data.detalles ? { detalles: data.detalles } : {}),
        ...(data.ip ? { ip: data.ip } : {}),
      },
    });
  }

  async findAllPaginated(filtros?: AuditoriaFiltros): Promise<PaginatedAuditoria> {
    const page = filtros?.page ?? 1;
    const limit = filtros?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.auditoriaWhereInput = {};
    if (filtros?.idUsuario) where.id_usuario = filtros.idUsuario;
    if (filtros?.fechaDesde || filtros?.fechaHasta) {
      where.fecha = {
        ...(filtros?.fechaDesde ? { gte: filtros.fechaDesde } : {}),
        ...(filtros?.fechaHasta ? { lte: filtros.fechaHasta } : {}),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.auditoria.findMany({ where, orderBy: { fecha: 'desc' }, skip, take: limit }),
      this.prisma.auditoria.count({ where }),
    ]);

    return { data, total };
  }
}
