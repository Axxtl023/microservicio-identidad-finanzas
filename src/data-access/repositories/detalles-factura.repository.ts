import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  IDetallesFacturaRepository,
  DetalleFacturaPrisma,
  CreateDetalleFacturaInput,
} from './interfaces/i-detalles-factura.repository';

@Injectable()
export class DetallesFacturaRepository implements IDetallesFacturaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByFacturaId(idFactura: string): Promise<DetalleFacturaPrisma[]> {
    return this.prisma.detalles_factura.findMany({ where: { id_factura: idFactura } });
  }

  async create(data: CreateDetalleFacturaInput): Promise<DetalleFacturaPrisma> {
    return this.prisma.detalles_factura.create({
      data: {
        id_factura: data.idFactura,
        id_producto_externo: data.idProducto,
        cantidad: data.cantidad,
        precio_unitario: data.precioUnitario,
        subtotal: data.subtotal,
      },
    });
  }
}
