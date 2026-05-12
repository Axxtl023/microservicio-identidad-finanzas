import { Injectable, Inject } from '@nestjs/common';
import type { IMetodosPagoService } from './interfaces/i-metodos-pago.service';
import type { IUnitOfWork } from '../../data-management/interfaces/i-unit-of-work';
import { IUNIT_OF_WORK } from '../../data-management/interfaces/i-unit-of-work';
import type { MetodoPagoResponseDto } from './dtos/factura.dto';

@Injectable()
export class MetodosPagoService implements IMetodosPagoService {
  constructor(
    @Inject(IUNIT_OF_WORK)
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async findAll(): Promise<MetodoPagoResponseDto[]> {
    const metodos = await this.unitOfWork.metodosPagoRepository.findAll();
    return metodos.map((m) => ({
      id: m.id,
      nombre: m.nombre,
      createdAt: m.created_at ?? null,
    }));
  }
}
