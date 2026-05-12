import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '@prisma/client';
import type {
  IUsuarioRepository,
  CreateUsuarioInput,
  UpdateUsuarioInput,
  UsuarioFiltros,
} from './interfaces/i-usuario.repository';
import type { UsuarioConRol } from './interfaces/i-usuario-app.repository';

const INCLUDE_ROL = { roles: true } as const;

@Injectable()
export class UsuarioRepository implements IUsuarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<UsuarioConRol[]> {
    return this.prisma.usuarios.findMany({ include: INCLUDE_ROL, orderBy: { email: 'asc' } });
  }

  async findAllPaginated(filtros?: UsuarioFiltros): Promise<{ data: UsuarioConRol[]; total: number }> {
    const page = filtros?.page ?? 1;
    const limit = filtros?.limit ?? 100;
    const skip = (page - 1) * limit;
    const where: Prisma.usuariosWhereInput = {};
    if (filtros?.search) {
      where.OR = [
        { email: { contains: filtros.search, mode: 'insensitive' } },
        { id: { equals: filtros.search } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.usuarios.findMany({ where, include: INCLUDE_ROL, orderBy: { email: 'asc' }, skip, take: limit }),
      this.prisma.usuarios.count({ where }),
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<UsuarioConRol | null> {
    return this.prisma.usuarios.findUnique({ where: { id }, include: INCLUDE_ROL });
  }

  async findByEmail(email: string): Promise<UsuarioConRol | null> {
    return this.prisma.usuarios.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: INCLUDE_ROL,
    });
  }

  async create(data: CreateUsuarioInput): Promise<UsuarioConRol> {
    return this.prisma.usuarios.create({
      data: {
        email: data.email,
        password_hash: data.passwordHash,
        id_rol: data.idRol,
      },
      include: INCLUDE_ROL,
    });
  }

  async update(id: string, data: UpdateUsuarioInput): Promise<UsuarioConRol> {
    return this.prisma.usuarios.update({
      where: { id },
      data: {
        ...(data.email !== undefined && { email: data.email }),
        ...(data.passwordHash !== undefined && { password_hash: data.passwordHash }),
        ...(data.idRol !== undefined && { id_rol: data.idRol }),
      },
      include: INCLUDE_ROL,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.usuarios.delete({ where: { id } });
  }
}
