import type { CreateClienteDto, UpdateClienteDto, ClienteResponseDto } from '../dtos/cliente.dto';
import type { PaginatedServiceResult } from '../../../common/pagination.types';

export interface IClientesService {
  findAll(): Promise<ClienteResponseDto[]>;
  findAllPaginated(filtros?: { search?: string; page?: number; limit?: number }): Promise<PaginatedServiceResult<ClienteResponseDto>>;
  findById(id: string): Promise<ClienteResponseDto>;
  findByUserEmail(email: string): Promise<ClienteResponseDto | null>;
  create(dto: CreateClienteDto): Promise<ClienteResponseDto>;
  update(id: string, dto: UpdateClienteDto): Promise<ClienteResponseDto>;
  updatePerfilAsync(userId: string, dto: UpdateClienteDto): Promise<ClienteResponseDto>;
  delete(id: string): Promise<void>;
}

export const ICLIENTES_SERVICE = 'ICLIENTES_SERVICE';
