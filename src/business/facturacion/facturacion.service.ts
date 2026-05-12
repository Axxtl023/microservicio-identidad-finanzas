import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import type { IFacturacionService } from './interfaces/i-facturacion.service';
import type { IUnitOfWork } from '../../data-management/interfaces/i-unit-of-work';
import { IUNIT_OF_WORK } from '../../data-management/interfaces/i-unit-of-work';
import { FacturaDataMapper } from '../../data-management/mappers/factura.data-mapper';
import type { GenerarFacturaDto, FacturaResponseDto } from './dtos/factura.dto';
import type { PaginatedServiceResult } from '../../common/pagination.types';

@Injectable()
export class FacturacionService implements IFacturacionService {
  constructor(
    @Inject(IUNIT_OF_WORK)
    private readonly unitOfWork: IUnitOfWork,
  ) {}

  async generarFactura(
    userEmail: string,
    userRol: string | null,
    dto: GenerarFacturaDto,
  ): Promise<FacturaResponseDto> {
    // Una sola factura por reserva
    const facturaExistente = await this.unitOfWork.facturasRepository.findByReservaId(dto.reservaId);
    if (facturaExistente) {
      throw new ConflictException('Esta reserva ya tiene una factura generada');
    }

    // Validar método de pago
    const metodoPago = await this.unitOfWork.metodosPagoRepository.findById(dto.metodoPagoId);
    if (!metodoPago) {
      throw new NotFoundException(`Método de pago con id ${dto.metodoPagoId} no encontrado`);
    }

    // Resolver cliente: admin puede especificar idCliente, cliente usa el suyo
    const esAdmin = userRol?.toUpperCase() === 'ADMIN';
    const cliente = await this.unitOfWork.clientesRepository.findByEmail(userEmail);

    if (!esAdmin && !cliente) {
      throw new ForbiddenException('No tiene un perfil de cliente registrado');
    }

    const idCliente = esAdmin && dto.idCliente ? dto.idCliente : (cliente?.id ?? '');

    const factura = await this.unitOfWork.generarFacturaYPagoAtomic({
      idReserva: dto.reservaId,
      idCliente,
      idMetodoPago: dto.metodoPagoId,
      items: dto.items,
    });

    return FacturaDataMapper.toDataModel(factura);
  }

  async getMisFacturas(userEmail: string): Promise<FacturaResponseDto[]> {
    const cliente = await this.unitOfWork.clientesRepository.findByEmail(userEmail);
    if (!cliente) return [];

    const facturas = await this.unitOfWork.facturasRepository.findByClienteId(cliente.id);
    return facturas.map(FacturaDataMapper.toDataModel);
  }

  async getAllFacturas(): Promise<FacturaResponseDto[]> {
    const facturas = await this.unitOfWork.facturasRepository.findAll();
    return facturas.map(FacturaDataMapper.toDataModel);
  }

  async getAllFacturasPaginated(filtros?: { search?: string; page?: number; limit?: number }): Promise<PaginatedServiceResult<FacturaResponseDto>> {
    const page = filtros?.page ?? 1;
    const limit = filtros?.limit ?? 20;
    const { data, total } = await this.unitOfWork.facturasRepository.findAllPaginated({ search: filtros?.search, page, limit });
    return { data: data.map(FacturaDataMapper.toDataModel), total, page, limit };
  }

  async getFacturaById(facturaId: string): Promise<FacturaResponseDto> {
    const factura = await this.unitOfWork.facturasRepository.findById(facturaId);
    if (!factura) {
      throw new NotFoundException(`Factura con id ${facturaId} no encontrada`);
    }
    return FacturaDataMapper.toDataModel(factura);
  }
}
