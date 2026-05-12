import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '@prisma/client';
import type {
  IClienteRepository,
  ClientePrisma,
  CreateClienteInput,
  UpdateClienteInput,
  ClienteFiltros,
} from './interfaces/i-cliente.repository';

@Injectable()
export class ClienteRepository implements IClienteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ClientePrisma[]> {
    return this.prisma.clientes.findMany();
  }

  async findAllPaginated(filtros?: ClienteFiltros): Promise<{ data: ClientePrisma[]; total: number }> {
    const page = filtros?.page ?? 1;
    const limit = filtros?.limit ?? 20;
    const skip = (page - 1) * limit;
    const where: Prisma.clientesWhereInput = {};
    if (filtros?.search) {
      where.OR = [
        { nombre: { contains: filtros.search, mode: 'insensitive' } },
        { apellido: { contains: filtros.search, mode: 'insensitive' } },
        { email: { contains: filtros.search, mode: 'insensitive' } },
        { identificacion: { contains: filtros.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.clientes.findMany({ where, orderBy: { nombre: 'asc' }, skip, take: limit }),
      this.prisma.clientes.count({ where }),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<ClientePrisma | null> {
    return this.prisma.clientes.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<ClientePrisma | null> {
    return this.prisma.clientes.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
  }

  async findByIdentificacion(identificacion: string): Promise<ClientePrisma | null> {
    return this.prisma.clientes.findUnique({ where: { identificacion } });
  }

  async create(data: CreateClienteInput): Promise<ClientePrisma> {
    return this.prisma.clientes.create({
      data: {
        nombre: data.nombre,
        apellido: data.apellido,
        email: data.email,
        ...(data.identificacion !== undefined && { identificacion: data.identificacion }),
        ...(data.telefono !== undefined && { telefono: data.telefono }),
      },
    });
  }

  async update(id: string, data: UpdateClienteInput): Promise<ClientePrisma> {
    return this.prisma.clientes.update({
      where: { id },
      data: {
        ...(data.nombre !== undefined && { nombre: data.nombre }),
        ...(data.apellido !== undefined && { apellido: data.apellido }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.identificacion !== undefined && { identificacion: data.identificacion }),
        ...(data.telefono !== undefined && { telefono: data.telefono }),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.clientes.delete({ where: { id } });
  }
}
