import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { IUsuariosService } from './interfaces/i-usuarios.service';
import type { IUnitOfWork } from '../../data-management/interfaces/i-unit-of-work';
import { IUNIT_OF_WORK } from '../../data-management/interfaces/i-unit-of-work';
import { UsuarioDataMapper } from '../../data-management/mappers/usuario.data-mapper';
import type { CreateUsuarioDto, UpdateUsuarioDto, UsuarioResponseDto } from './dtos/usuario.dto';

const SALT_ROUNDS = 10;

const toDto = (e: ReturnType<typeof UsuarioDataMapper.toDataModel>): UsuarioResponseDto => ({
  id: e.id,
  email: e.email,
  rol: e.rol,
  createdAt: e.createdAt,
});

@Injectable()
export class UsuariosService implements IUsuariosService {
  constructor(
    @Inject(IUNIT_OF_WORK)
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async findAll(): Promise<UsuarioResponseDto[]> {
    const entities = await this.unitOfWork.usuariosRepository.findAll();
    return entities.map((e) => toDto(UsuarioDataMapper.toDataModel(e)));
  }

  async findAllPaginated(filtros?: { search?: string }): Promise<UsuarioResponseDto[]> {
    const { data } = await this.unitOfWork.usuariosRepository.findAllPaginated({
      search: filtros?.search,
    });
    return data.map((e) => toDto(UsuarioDataMapper.toDataModel(e)));
  }

  async findById(id: string): Promise<UsuarioResponseDto> {
    const entity = await this.unitOfWork.usuariosRepository.findById(id);
    if (!entity) throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    return toDto(UsuarioDataMapper.toDataModel(entity));
  }

  async findMe(userId: string): Promise<UsuarioResponseDto> {
    return this.findById(userId);
  }

  async create(dto: CreateUsuarioDto): Promise<UsuarioResponseDto> {
    const exists = await this.unitOfWork.usuariosRepository.findByEmail(dto.email);
    if (exists) throw new ConflictException(`El email ${dto.email} ya está registrado`);

    let idRol: string | undefined = dto.idRol;
    if (!idRol && dto.rolNombre) {
      const rol = await this.unitOfWork.findRolByNombre(dto.rolNombre);
      if (!rol) throw new NotFoundException(`Rol '${dto.rolNombre}' no encontrado`);
      idRol = rol.id;
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const { usuario } = await this.unitOfWork.registerUsuarioConCliente({
      email: dto.email,
      passwordHash,
      nombre: dto.nombre?.trim() || 'Nuevo',
      apellido: dto.apellido?.trim() || 'Usuario',
    });

    // Asignar rol si se especificó (distinto al CLIENTE por defecto)
    if (idRol) {
      await this.unitOfWork.usuariosRepository.update(usuario.id, { idRol });
      const updated = await this.unitOfWork.usuariosRepository.findById(usuario.id);
      return toDto(UsuarioDataMapper.toDataModel(updated!));
    }

    return toDto(UsuarioDataMapper.toDataModel(usuario));
  }

  async update(id: string, dto: UpdateUsuarioDto): Promise<UsuarioResponseDto> {
    const existing = await this.unitOfWork.usuariosRepository.findById(id);
    if (!existing) throw new NotFoundException(`Usuario con id ${id} no encontrado`);

    if (dto.email && dto.email !== existing.email) {
      const emailTaken = await this.unitOfWork.usuariosRepository.findByEmail(dto.email);
      if (emailTaken && emailTaken.id !== id)
        throw new ConflictException(`El email ${dto.email} ya está en uso`);
    }

    let idRol = dto.idRol;
    if (!idRol && dto.rolNombre) {
      const rol = await this.unitOfWork.findRolByNombre(dto.rolNombre);
      if (!rol) throw new NotFoundException(`Rol '${dto.rolNombre}' no encontrado`);
      idRol = rol.id;
    }

    const passwordHash = dto.password ? await bcrypt.hash(dto.password, SALT_ROUNDS) : undefined;

    const entity = await this.unitOfWork.usuariosRepository.update(id, {
      email: dto.email,
      passwordHash,
      idRol,
    });
    return toDto(UsuarioDataMapper.toDataModel(entity));
  }

  async updateMe(userId: string, dto: UpdateUsuarioDto): Promise<UsuarioResponseDto> {
    return this.update(userId, dto);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.unitOfWork.usuariosRepository.findById(id);
    if (!existing) throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    await this.unitOfWork.usuariosRepository.delete(id);
  }
}
