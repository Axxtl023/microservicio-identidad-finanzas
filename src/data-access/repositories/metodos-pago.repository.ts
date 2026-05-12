import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { IMetodosPagoRepository, MetodoPagoPrisma } from './interfaces/i-metodos-pago.repository';

@Injectable()
export class MetodosPagoRepository implements IMetodosPagoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<MetodoPagoPrisma[]> {
    return this.prisma.metodos_pago.findMany({ orderBy: { nombre: 'asc' } });
  }

  async findById(id: string): Promise<MetodoPagoPrisma | null> {
    return this.prisma.metodos_pago.findUnique({ where: { id } });
  }
}
