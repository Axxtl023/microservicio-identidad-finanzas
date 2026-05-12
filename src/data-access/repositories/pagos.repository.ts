import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { IPagosRepository, PagoPrisma, CreatePagoInput } from './interfaces/i-pagos.repository';

@Injectable()
export class PagosRepository implements IPagosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByReservaId(idReserva: string): Promise<PagoPrisma | null> {
    return this.prisma.pagos.findFirst({ where: { id_reserva: idReserva } });
  }

  async create(data: CreatePagoInput): Promise<PagoPrisma> {
    return this.prisma.pagos.create({
      data: {
        id_reserva: data.idReserva,
        id_metodo_pago: data.idMetodoPago,
        monto: data.monto,
      },
    });
  }
}
