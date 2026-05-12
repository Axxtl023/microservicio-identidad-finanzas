import type { GenerarFacturaDto, FacturaResponseDto } from '../dtos/factura.dto';
import type { PaginatedServiceResult } from '../../../common/pagination.types';

export interface IFacturacionService {
  generarFactura(userEmail: string, userRol: string | null, dto: GenerarFacturaDto): Promise<FacturaResponseDto>;
  getMisFacturas(userEmail: string): Promise<FacturaResponseDto[]>;
  getAllFacturas(): Promise<FacturaResponseDto[]>;
  getAllFacturasPaginated(filtros?: { search?: string; page?: number; limit?: number }): Promise<PaginatedServiceResult<FacturaResponseDto>>;
  getFacturaById(facturaId: string): Promise<FacturaResponseDto>;
}

export const IFACTURACION_SERVICE = 'IFACTURACION_SERVICE';
