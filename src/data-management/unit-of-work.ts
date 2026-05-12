import { Injectable, Inject, InternalServerErrorException } from '@nestjs/common';
import type {
  IUnitOfWork,
  RegisterAtomicData,
  RegisterAtomicResult,
  GenerarFacturaAtomicData,
} from './interfaces/i-unit-of-work';
import type { IUsuarioAppRepository } from '../data-access/repositories/interfaces/i-usuario-app.repository';
import { IUSUARIO_APP_REPOSITORY } from '../data-access/repositories/interfaces/i-usuario-app.repository';
import type { IUsuarioRepository } from '../data-access/repositories/interfaces/i-usuario.repository';
import { IUSUARIO_REPOSITORY } from '../data-access/repositories/interfaces/i-usuario.repository';
import type { IClienteRepository } from '../data-access/repositories/interfaces/i-cliente.repository';
import { ICLIENTE_REPOSITORY } from '../data-access/repositories/interfaces/i-cliente.repository';
import type { IFacturasRepository } from '../data-access/repositories/interfaces/i-facturas.repository';
import { IFACTURAS_REPOSITORY } from '../data-access/repositories/interfaces/i-facturas.repository';
import type { FacturaConDetallesMs } from '../data-access/repositories/interfaces/i-facturas.repository';
import type { IDetallesFacturaRepository } from '../data-access/repositories/interfaces/i-detalles-factura.repository';
import { IDETALLES_FACTURA_REPOSITORY } from '../data-access/repositories/interfaces/i-detalles-factura.repository';
import type { IPagosRepository } from '../data-access/repositories/interfaces/i-pagos.repository';
import { IPAGOS_REPOSITORY } from '../data-access/repositories/interfaces/i-pagos.repository';
import type { IMetodosPagoRepository } from '../data-access/repositories/interfaces/i-metodos-pago.repository';
import { IMETODOS_PAGO_REPOSITORY } from '../data-access/repositories/interfaces/i-metodos-pago.repository';
import type { IAuditoriaRepository } from '../data-access/repositories/interfaces/i-auditoria.repository';
import { IAUDITORIA_REPOSITORY } from '../data-access/repositories/interfaces/i-auditoria.repository';
import { PrismaService } from '../common/prisma/prisma.service';

const IVA_RATE = 0.15;

@Injectable()
export class UnitOfWork implements IUnitOfWork {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IUSUARIO_APP_REPOSITORY)
    readonly usuarioRepository: IUsuarioAppRepository,
    @Inject(IUSUARIO_REPOSITORY)
    readonly usuariosRepository: IUsuarioRepository,
    @Inject(ICLIENTE_REPOSITORY)
    readonly clientesRepository: IClienteRepository,
    @Inject(IFACTURAS_REPOSITORY)
    readonly facturasRepository: IFacturasRepository,
    @Inject(IDETALLES_FACTURA_REPOSITORY)
    readonly detallesFacturaRepository: IDetallesFacturaRepository,
    @Inject(IPAGOS_REPOSITORY)
    readonly pagosRepository: IPagosRepository,
    @Inject(IMETODOS_PAGO_REPOSITORY)
    readonly metodosPagoRepository: IMetodosPagoRepository,
    @Inject(IAUDITORIA_REPOSITORY)
    readonly auditoriaRepository: IAuditoriaRepository,
  ) {}

  async findRolByNombre(nombre: string): Promise<{ id: string; nombre: string } | null> {
    return this.prisma.roles.findUnique({ where: { nombre } });
  }

  async registerUsuarioConCliente(data: RegisterAtomicData): Promise<RegisterAtomicResult> {
    return this.prisma.$transaction(async (tx) => {
      const rol = await tx.roles.findUnique({ where: { nombre: 'CLIENTE' } });
      if (!rol) {
        throw new InternalServerErrorException('Rol CLIENTE no encontrado en la base de datos');
      }

      const usuario = await tx.usuarios.create({
        data: {
          email: data.email,
          password_hash: data.passwordHash,
          id_rol: rol.id,
        },
        include: { roles: true },
      });

      const cliente = await tx.clientes.create({
        data: {
          nombre: data.nombre,
          apellido: data.apellido,
          email: data.email,
          ...(data.identificacion !== undefined && { identificacion: data.identificacion }),
        },
      });

      return { usuario, cliente };
    });
  }

  async generarFacturaYPagoAtomic(data: GenerarFacturaAtomicData): Promise<FacturaConDetallesMs> {
    return this.prisma.$transaction(async (tx) => {
      // Calcular base imponible e IVA (15% Ecuador)
      const baseImponible = data.items.reduce(
        (sum, item) => sum + item.cantidad * item.precioUnitario,
        0,
      );
      const ivaAmount = baseImponible * IVA_RATE;
      const totalConIva = baseImponible + ivaAmount;

      // Número de factura secuencial (seguro dentro de la transacción)
      const count = await tx.facturas.count();
      const numeroFactura = `FAC-${String(count + 1).padStart(5, '0')}`;

      // Crear cabecera de factura
      const factura = await tx.facturas.create({
        data: {
          id_reserva: data.idReserva,
          numero_factura: numeroFactura,
          total: totalConIva,
        },
      });

      // Crear detalles de factura por cada ítem recibido
      for (const item of data.items) {
        const subtotalItem = item.cantidad * item.precioUnitario;
        await tx.detalles_factura.create({
          data: {
            id_factura: factura.id,
            id_producto_externo: item.idProducto,
            cantidad: item.cantidad,
            precio_unitario: item.precioUnitario,
            subtotal: subtotalItem,
          },
        });
      }

      // Registrar pago
      await tx.pagos.create({
        data: {
          id_reserva: data.idReserva,
          id_metodo_pago: data.idMetodoPago,
          monto: totalConIva,
        },
      });

      // Recuperar factura completa con detalles
      const facturaCompleta = await tx.facturas.findUnique({
        where: { id: factura.id },
        include: { detalles_factura: true },
      });
      if (!facturaCompleta) {
        throw new InternalServerErrorException('Error al obtener factura generada');
      }

      // Recuperar pago con método de pago
      const pago = await tx.pagos.findFirst({
        where: { id_reserva: data.idReserva },
        include: { metodos_pago: { select: { id: true, nombre: true } } },
      });

      return { ...facturaCompleta, pago };
    });
  }
}
