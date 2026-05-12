import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { IUsuarioAppRepository, UsuarioConRol } from './interfaces/i-usuario-app.repository';

@Injectable()
export class UsuarioAppRepository implements IUsuarioAppRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UsuarioConRol | null> {
    if (!email) return null;
    return this.prisma.usuarios.findUnique({
      where: { email },
      include: { roles: true },
    });
  }
}
