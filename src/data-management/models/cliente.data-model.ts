export interface ClienteDataModel {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  identificacion: string | null;
  telefono: string | null;
  createdAt: Date | null;
}
