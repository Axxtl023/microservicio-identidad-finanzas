import type { pagos } from '@prisma/client';

export type PagoPrisma = pagos;

export interface CreatePagoInput {
  idReserva: string;
  idMetodoPago: string;
  monto: number;
}

export interface IPagosRepository {
  findById(id: string): Promise<PagoPrisma | null>;
  findByReservaId(idReserva: string): Promise<PagoPrisma | null>;
  create(data: CreatePagoInput): Promise<PagoPrisma>;
}

export const IPAGOS_REPOSITORY = 'IPAGOS_REPOSITORY';
