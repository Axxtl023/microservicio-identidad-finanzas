import { Injectable, Inject } from '@nestjs/common';
import type {
  IAuditoriaService,
  LogAuditoriaInput,
  AuditoriaQueryFiltros,
} from './interfaces/i-auditoria.service';
import type { IUnitOfWork } from '../../data-management/interfaces/i-unit-of-work';
import { IUNIT_OF_WORK } from '../../data-management/interfaces/i-unit-of-work';
import { AuditoriaDataMapper } from '../../data-management/mappers/auditoria.data-mapper';
import type { AuditoriaListDataModel } from '../../data-management/models/auditoria.data-model';

@Injectable()
export class AuditoriaService implements IAuditoriaService {
  constructor(
    @Inject(IUNIT_OF_WORK)
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async log(input: LogAuditoriaInput): Promise<void> {
    const detalles =
      input.valorAnterior !== undefined || input.valorNuevo !== undefined
        ? JSON.stringify({
            valorAnterior: input.valorAnterior ?? null,
            valorNuevo: input.valorNuevo ?? null,
          })
        : undefined;

    await this.unitOfWork.auditoriaRepository.create({
      idUsuario: input.idUsuario,
      accion: input.accion,
      tabla: input.tabla,
      detalles,
      ip: input.ip,
    });
  }

  async findAll(filtros?: AuditoriaQueryFiltros): Promise<AuditoriaListDataModel> {
    const page = filtros?.page ?? 1;
    const limit = filtros?.limit ?? 20;

    const { data, total } = await this.unitOfWork.auditoriaRepository.findAllPaginated({
      idUsuario: filtros?.idUsuario,
      fechaDesde: filtros?.fechaDesde ? new Date(filtros.fechaDesde) : undefined,
      fechaHasta: filtros?.fechaHasta ? new Date(filtros.fechaHasta) : undefined,
      page,
      limit,
    });

    return {
      data: data.map(AuditoriaDataMapper.toDataModel),
      total,
      page,
      limit,
    };
  }
}
