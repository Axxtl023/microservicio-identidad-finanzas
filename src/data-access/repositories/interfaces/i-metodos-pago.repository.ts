import type { metodos_pago } from '@prisma/client';

export type MetodoPagoPrisma = metodos_pago;

export interface IMetodosPagoRepository {
  findAll(): Promise<MetodoPagoPrisma[]>;
  findById(id: string): Promise<MetodoPagoPrisma | null>;
}

export const IMETODOS_PAGO_REPOSITORY = 'IMETODOS_PAGO_REPOSITORY';
