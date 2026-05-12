import type { MetodoPagoResponseDto } from '../dtos/factura.dto';

export interface IMetodosPagoService {
  findAll(): Promise<MetodoPagoResponseDto[]>;
}

export const IMETODOS_PAGO_SERVICE = 'IMETODOS_PAGO_SERVICE';
