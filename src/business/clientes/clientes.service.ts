import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import type { IClientesService } from './interfaces/i-clientes.service';
import type { IUnitOfWork } from '../../data-management/interfaces/i-unit-of-work';
import { IUNIT_OF_WORK } from '../../data-management/interfaces/i-unit-of-work';
import { ClienteDataMapper } from '../../data-management/mappers/cliente.data-mapper';
import type { CreateClienteDto, UpdateClienteDto, ClienteResponseDto } from './dtos/cliente.dto';
import type { PaginatedServiceResult } from '../../common/pagination.types';

@Injectable()
export class ClientesService implements IClientesService {
  constructor(
    @Inject(IUNIT_OF_WORK)
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async findAll(): Promise<ClienteResponseDto[]> {
    const entities = await this.unitOfWork.clientesRepository.findAll();
    return entities.map(ClienteDataMapper.toDataModel);
  }

  async findAllPaginated(filtros?: { search?: string; page?: number; limit?: number }): Promise<PaginatedServiceResult<ClienteResponseDto>> {
    const page = filtros?.page ?? 1;
    const limit = filtros?.limit ?? 20;
    const { data, total } = await this.unitOfWork.clientesRepository.findAllPaginated({ search: filtros?.search, page, limit });
    return { data: data.map(ClienteDataMapper.toDataModel), total, page, limit };
  }

  async findById(id: string): Promise<ClienteResponseDto> {
    const entity = await this.unitOfWork.clientesRepository.findById(id);
    if (!entity) throw new NotFoundException(`Cliente con id ${id} no encontrado`);
    return ClienteDataMapper.toDataModel(entity);
  }

  async findByUserEmail(email: string): Promise<ClienteResponseDto | null> {
    const entity = await this.unitOfWork.clientesRepository.findByEmail(email);
    return entity ? ClienteDataMapper.toDataModel(entity) : null;
  }

  async create(dto: CreateClienteDto): Promise<ClienteResponseDto> {
    const exists = await this.unitOfWork.clientesRepository.findByEmail(dto.email);
    if (exists) throw new ConflictException(`El email ${dto.email} ya tiene un perfil de cliente`);

    if (dto.identificacion) {
      const idTaken = await this.unitOfWork.clientesRepository.findByIdentificacion(dto.identificacion);
      if (idTaken) throw new ConflictException(`La identificación ${dto.identificacion} ya está registrada`);
    }

    const entity = await this.unitOfWork.clientesRepository.create({
      nombre: dto.nombre,
      apellido: dto.apellido,
      email: dto.email,
      identificacion: dto.identificacion,
      telefono: dto.telefono,
    });
    return ClienteDataMapper.toDataModel(entity);
  }

  async update(id: string, dto: UpdateClienteDto): Promise<ClienteResponseDto> {
    const existing = await this.unitOfWork.clientesRepository.findById(id);
    if (!existing) throw new NotFoundException(`Cliente con id ${id} no encontrado`);

    if (dto.identificacion && dto.identificacion !== existing.identificacion) {
      const idTaken = await this.unitOfWork.clientesRepository.findByIdentificacion(dto.identificacion);
      if (idTaken && idTaken.id !== id) {
        throw new ConflictException(`La identificación ${dto.identificacion} ya está registrada`);
      }
    }

    const entity = await this.unitOfWork.clientesRepository.update(id, dto);
    return ClienteDataMapper.toDataModel(entity);
  }

  async updatePerfilAsync(userId: string, dto: UpdateClienteDto): Promise<ClienteResponseDto> {
    const usuario = await this.unitOfWork.usuariosRepository.findById(userId);
    if (!usuario) throw new NotFoundException(`Usuario con id ${userId} no encontrado`);

    const existing = await this.unitOfWork.clientesRepository.findByEmail(usuario.email);
    if (!existing) throw new NotFoundException('No tiene un perfil de cliente registrado');

    if (dto.identificacion && dto.identificacion !== existing.identificacion) {
      const idTaken = await this.unitOfWork.clientesRepository.findByIdentificacion(dto.identificacion);
      if (idTaken && idTaken.id !== existing.id) {
        throw new ConflictException(`La identificación ${dto.identificacion} ya está registrada`);
      }
    }

    const entity = await this.unitOfWork.clientesRepository.update(existing.id, dto);
    return ClienteDataMapper.toDataModel(entity);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.unitOfWork.clientesRepository.findById(id);
    if (!existing) throw new NotFoundException(`Cliente con id ${id} no encontrado`);
    await this.unitOfWork.clientesRepository.delete(id);
  }
}
