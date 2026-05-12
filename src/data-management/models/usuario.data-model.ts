export interface UsuarioDataModel {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date | null;
  rol: string | null;
}
