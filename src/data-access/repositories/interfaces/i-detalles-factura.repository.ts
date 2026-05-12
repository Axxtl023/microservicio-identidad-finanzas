import type { detalles_factura } from '@prisma/client';

export type DetalleFacturaPrisma = detalles_factura;

export interface CreateDetalleFacturaInput {
  idFactura: string;
  idProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface IDetallesFacturaRepository {
  findByFacturaId(idFactura: string): Promise<DetalleFacturaPrisma[]>;
  create(data: CreateDetalleFacturaInput): Promise<DetalleFacturaPrisma>;
}

export const IDETALLES_FACTURA_REPOSITORY = 'IDETALLES_FACTURA_REPOSITORY';
