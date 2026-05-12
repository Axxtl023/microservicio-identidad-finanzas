import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '@prisma/client';
import type {
  IFacturasRepository,
  FacturaPrisma,
  FacturaConDetallesMs,
  CreateFacturaInput,
  FacturaFiltros,
} from './interfaces/i-facturas.repository';

const INCLUDE_PAGO_METODO = {
  metodos_pago: { select: { id: true, nombre: true } },
} as const;

@Injectable()
export class FacturasRepository implements IFacturasRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async attachPago(factura: { id: string; id_reserva: string | null; [key: string]: unknown } & { detalles_factura: unknown[] }): Promise<FacturaConDetallesMs> {
    const pago = factura.id_reserva
      ? await this.prisma.pagos.findFirst({
          where: { id_reserva: factura.id_reserva },
          include: INCLUDE_PAGO_METODO,
        })
      : null;
    return { ...factura, pago } as FacturaConDetallesMs;
  }

  async findById(id: string): Promise<FacturaConDetallesMs | null> {
    const factura = await this.prisma.facturas.findUnique({
      where: { id },
      include: { detalles_factura: true },
    });
    if (!factura) return null;
    return this.attachPago(factura);
  }

  async findByReservaId(idReserva: string): Promise<FacturaConDetallesMs | null> {
    const factura = await this.prisma.facturas.findFirst({
      where: { id_reserva: idReserva },
      include: { detalles_factura: true },
    });
    if (!factura) return null;
    return this.attachPago(factura);
  }

  async findByClienteId(_idCliente: string): Promise<FacturaConDetallesMs[]> {
    // id_cliente was removed from facturas in the current schema; cannot filter by it
    return [];
  }

  async findAll(): Promise<FacturaConDetallesMs[]> {
    const facturas = await this.prisma.facturas.findMany({
      include: { detalles_factura: true },
      orderBy: { fecha_emision: 'desc' },
    });
    return Promise.all(facturas.map((f) => this.attachPago(f)));
  }

  async findAllPaginated(filtros?: FacturaFiltros): Promise<{ data: FacturaConDetallesMs[]; total: number }> {
    const page = filtros?.page ?? 1;
    const limit = filtros?.limit ?? 20;
    const skip = (page - 1) * limit;
    const where: Prisma.facturasWhereInput = {};
    if (filtros?.search) {
      where.numero_factura = { contains: filtros.search, mode: 'insensitive' };
    }
    const [facturas, total] = await Promise.all([
      this.prisma.facturas.findMany({ where, include: { detalles_factura: true }, orderBy: { fecha_emision: 'desc' }, skip, take: limit }),
      this.prisma.facturas.count({ where }),
    ]);
    const data = await Promise.all(facturas.map((f) => this.attachPago(f)));
    return { data, total };
  }

  async create(data: CreateFacturaInput): Promise<FacturaPrisma> {
    return this.prisma.facturas.create({
      data: {
        id_reserva: data.idReserva,
        numero_factura: data.numeroFactura,
        total: data.total,
      },
    });
  }
}
