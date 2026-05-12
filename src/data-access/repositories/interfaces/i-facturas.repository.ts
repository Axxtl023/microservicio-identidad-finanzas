import type { facturas, Prisma } from '@prisma/client';

export type FacturaPrisma = facturas;

// Incluye detalles de factura (sin relación a productos — id_producto es referencia simple)
export const INCLUDE_DETALLES_FACTURA_MS = {
  detalles_factura: true,
} as const;

export type FacturaConDetallesBase = Prisma.facturasGetPayload<{
  include: typeof INCLUDE_DETALLES_FACTURA_MS;
}>;

// Pago con método de pago anidado
export type PagoConMetodo = Prisma.pagosGetPayload<{
  include: { metodos_pago: { select: { id: true; nombre: true } } };
}>;

// Tipo compuesto: factura + detalles + pago (obtenido por separado vía id_reserva)
export type FacturaConDetallesMs = FacturaConDetallesBase & {
  pago: PagoConMetodo | null;
};

export interface CreateFacturaInput {
  idReserva: string;
  idCliente: string;
  numeroFactura: string;
  total: number;
}

export interface FacturaFiltros {
  search?: string;
  page?: number;
  limit?: number;
}

export interface IFacturasRepository {
  findById(id: string): Promise<FacturaConDetallesMs | null>;
  findByReservaId(idReserva: string): Promise<FacturaConDetallesMs | null>;
  findByClienteId(idCliente: string): Promise<FacturaConDetallesMs[]>;
  findAll(): Promise<FacturaConDetallesMs[]>;
  findAllPaginated(filtros?: FacturaFiltros): Promise<{ data: FacturaConDetallesMs[]; total: number }>;
  create(data: CreateFacturaInput): Promise<FacturaPrisma>;
}

export const IFACTURAS_REPOSITORY = 'IFACTURAS_REPOSITORY';
