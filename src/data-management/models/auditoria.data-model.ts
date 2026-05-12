export interface AuditoriaDataModel {
  id: string;
  idUsuario: string | null;
  accion: string;
  tabla: string;
  detalles: string | null;
  ip: string | null;
  fecha: Date;
}

export interface AuditoriaListDataModel {
  data: AuditoriaDataModel[];
  total: number;
  page: number;
  limit: number;
}
