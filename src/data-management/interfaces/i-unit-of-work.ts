import type { IUsuarioAppRepository } from '../../data-access/repositories/interfaces/i-usuario-app.repository';
import type { UsuarioConRol } from '../../data-access/repositories/interfaces/i-usuario-app.repository';
import type { IUsuarioRepository } from '../../data-access/repositories/interfaces/i-usuario.repository';
import type { IClienteRepository } from '../../data-access/repositories/interfaces/i-cliente.repository';
import type { ClientePrisma } from '../../data-access/repositories/interfaces/i-cliente.repository';
import type { IFacturasRepository } from '../../data-access/repositories/interfaces/i-facturas.repository';
import type { FacturaConDetallesMs } from '../../data-access/repositories/interfaces/i-facturas.repository';
import type { IDetallesFacturaRepository } from '../../data-access/repositories/interfaces/i-detalles-factura.repository';
import type { IPagosRepository } from '../../data-access/repositories/interfaces/i-pagos.repository';
import type { IMetodosPagoRepository } from '../../data-access/repositories/interfaces/i-metodos-pago.repository';
import type { IAuditoriaRepository } from '../../data-access/repositories/interfaces/i-auditoria.repository';

export interface RegisterAtomicData {
  email: string;
  passwordHash: string;
  nombre: string;
  apellido: string;
  identificacion?: string;
}

export interface RegisterAtomicResult {
  usuario: UsuarioConRol;
  cliente: ClientePrisma;
}

export interface FacturaItemInput {
  idProducto: string;
  cantidad: number;
  precioUnitario: number;
}

export interface GenerarFacturaAtomicData {
  idReserva: string;
  idCliente: string;
  idMetodoPago: string;
  items: FacturaItemInput[];
}

export interface IUnitOfWork {
  readonly usuarioRepository: IUsuarioAppRepository;
  readonly usuariosRepository: IUsuarioRepository;
  readonly clientesRepository: IClienteRepository;
  readonly facturasRepository: IFacturasRepository;
  readonly detallesFacturaRepository: IDetallesFacturaRepository;
  readonly pagosRepository: IPagosRepository;
  readonly metodosPagoRepository: IMetodosPagoRepository;
  readonly auditoriaRepository: IAuditoriaRepository;

  findRolByNombre(nombre: string): Promise<{ id: string; nombre: string } | null>;
  registerUsuarioConCliente(data: RegisterAtomicData): Promise<RegisterAtomicResult>;
  generarFacturaYPagoAtomic(data: GenerarFacturaAtomicData): Promise<FacturaConDetallesMs>;
}

export const IUNIT_OF_WORK = 'IUNIT_OF_WORK';
