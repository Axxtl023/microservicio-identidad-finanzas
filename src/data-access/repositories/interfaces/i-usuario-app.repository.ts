import { Prisma } from '@prisma/client';

export type UsuarioConRol = Prisma.usuariosGetPayload<{
  include: { roles: true };
}>;

export interface IUsuarioAppRepository {
  findByEmail(email: string): Promise<UsuarioConRol | null>;
}

export const IUSUARIO_APP_REPOSITORY = 'IUSUARIO_APP_REPOSITORY';
