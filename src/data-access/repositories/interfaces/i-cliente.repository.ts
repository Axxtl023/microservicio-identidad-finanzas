import type { clientes } from '@prisma/client';

export type ClientePrisma = clientes;

export interface CreateClienteInput {
  nombre: string;
  apellido: string;
  email: string;
  identificacion?: string;
  telefono?: string;
}

export interface UpdateClienteInput {
  nombre?: string;
  apellido?: string;
  email?: string;
  identificacion?: string;
  telefono?: string;
}

export interface ClienteFiltros {
  search?: string;
  page?: number;
  limit?: number;
}

export interface IClienteRepository {
  findAll(): Promise<ClientePrisma[]>;
  findAllPaginated(filtros?: ClienteFiltros): Promise<{ data: ClientePrisma[]; total: number }>;
  findById(id: string): Promise<ClientePrisma | null>;
  findByEmail(email: string): Promise<ClientePrisma | null>;
  findByIdentificacion(identificacion: string): Promise<ClientePrisma | null>;
  create(data: CreateClienteInput): Promise<ClientePrisma>;
  update(id: string, data: UpdateClienteInput): Promise<ClientePrisma>;
  delete(id: string): Promise<void>;
}

export const ICLIENTE_REPOSITORY = 'ICLIENTE_REPOSITORY';
