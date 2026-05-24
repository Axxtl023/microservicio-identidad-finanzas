import { Controller, Inject, Logger } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { IPagosRepository } from '../../../data-access/repositories/interfaces/i-pagos.repository';
import { IPAGOS_REPOSITORY } from '../../../data-access/repositories/interfaces/i-pagos.repository';
import type { IFacturasRepository } from '../../../data-access/repositories/interfaces/i-facturas.repository';
import { IFACTURAS_REPOSITORY } from '../../../data-access/repositories/interfaces/i-facturas.repository';

// ═══════════════════════════════════════════════════════════════════════════════
// Interfaces de mensajes gRPC — derivadas de finance.proto
// ═══════════════════════════════════════════════════════════════════════════════

interface ProcessPaymentRequest {
  idempotencyKey?: string;
  clienteId?: string;
  amountCents?: number | string;
  currency?: string;
  metodoPagoId?: string;
  reservaId?: string;
}

interface InvoiceLine {
  description?: string;
  quantity?: number;
  unitPriceCents?: number | string;
}

interface IssueInvoiceRequest {
  idempotencyKey?: string;
  idPago?: string;
  clienteId?: string;
  reservaId?: string;
  lines?: InvoiceLine[];
  totalCents?: number | string;
  currency?: string;
}

interface RefundPaymentRequest {
  idempotencyKey?: string;
  idPago?: string;
  amountCents?: number | string;
  reason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constantes
// ═══════════════════════════════════════════════════════════════════════════════

const IVA_RATE = 0.15;

@Controller()
export class FinanceGrpcController {
  private readonly logger = new Logger(FinanceGrpcController.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(IPAGOS_REPOSITORY)
    private readonly pagosRepository: IPagosRepository,
    @Inject(IFACTURAS_REPOSITORY)
    private readonly facturasRepository: IFacturasRepository,
  ) {}

  // ═════════════════════════════════════════════════════════════════════════════
  // ProcessPayment
  // ═════════════════════════════════════════════════════════════════════════════
  //
  // Regla de idempotencia asumida para esta fase:
  //   "Una reserva tiene UN SOLO pago en toda su vida."
  //   Si la reserva ya tiene pago registrado, se devuelve el existente
  //   sin duplicar. Cuando se soporten re-pagos, splits o pagos parciales,
  //   habrá que migrar a idempotency_key real en la tabla `pagos`.
  //
  // Status hardcoded "APROBADO":
  //   En esta fase los pagos son simulados (sin pasarela real).
  //   Cuando se integre un proveedor de pago externo, el status
  //   vendrá de la respuesta del proveedor, no será hardcoded.
  //
  @GrpcMethod('FinanceService', 'ProcessPayment')
  async processPayment(request: ProcessPaymentRequest) {
    this.logger.log(
      `ProcessPayment reservaId=${request.reservaId ?? ''} idempotencyKey=${request.idempotencyKey ?? ''}`,
    );

    try {
      // ── Validación de campos requeridos ──────────────────────────────────
      this.assertRequired(request.idempotencyKey, 'idempotency_key');
      this.assertRequired(request.reservaId, 'reserva_id');
      this.assertRequired(request.clienteId, 'cliente_id');
      this.assertRequired(request.metodoPagoId, 'metodo_pago_id');
      this.assertRequired(request.currency, 'currency');

      const amountCents = this.toNumber(request.amountCents, 'amount_cents');
      if (amountCents <= 0) {
        throw this.invalidArgument('amount_cents debe ser mayor a 0');
      }

      // ── Idempotencia por reserva_id ─────────────────────────────────────
      const existingPago = await this.pagosRepository.findByReservaId(request.reservaId!);
      if (existingPago) {
        this.logger.log(`Pago existente encontrado para reserva ${request.reservaId}: ${existingPago.id}`);
        return {
          idPago: existingPago.id,
          status: 'APROBADO',
          amountCents: this.decimalToCents(existingPago.monto),
          currency: request.currency,
        };
      }

      // ── Crear pago ──────────────────────────────────────────────────────
      const monto = amountCents / 100; // centavos → decimal
      const pago = await this.pagosRepository.create({
        idReserva: request.reservaId!,
        idMetodoPago: request.metodoPagoId!,
        monto,
      });

      this.logger.log(`Pago creado: ${pago.id} para reserva ${request.reservaId}`);

      return {
        idPago: pago.id,
        status: 'APROBADO',
        amountCents,
        currency: request.currency,
      };
    } catch (err) {
      throw this.toRpcException(err);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // IssueInvoice
  // ═════════════════════════════════════════════════════════════════════════════
  //
  // Regla de idempotencia asumida para esta fase:
  //   "Una reserva tiene UNA SOLA factura en toda su vida."
  //   Si la reserva ya tiene factura, se devuelve la existente.
  //
  @GrpcMethod('FinanceService', 'IssueInvoice')
  async issueInvoice(request: IssueInvoiceRequest) {
    this.logger.log(
      `IssueInvoice idPago=${request.idPago ?? ''} reservaId=${request.reservaId ?? ''} idempotencyKey=${request.idempotencyKey ?? ''}`,
    );

    try {
      // ── Validación de campos requeridos ──────────────────────────────────
      this.assertRequired(request.idempotencyKey, 'idempotency_key');
      this.assertRequired(request.idPago, 'id_pago');
      this.assertRequired(request.reservaId, 'reserva_id');
      this.assertRequired(request.currency, 'currency');

      if (!request.lines || request.lines.length === 0) {
        throw this.invalidArgument('lines no puede estar vacío');
      }

      // ── Verificar que el pago existe ────────────────────────────────────
      const pago = await this.pagosRepository.findById(request.idPago!);
      if (!pago) {
        throw this.rpcError(status.FAILED_PRECONDITION, `Pago con id ${request.idPago} no encontrado`);
      }

      // ── Idempotencia por reserva_id ─────────────────────────────────────
      const existingFactura = await this.facturasRepository.findByReservaId(request.reservaId!);
      if (existingFactura) {
        this.logger.log(`Factura existente encontrada para reserva ${request.reservaId}: ${existingFactura.id}`);
        return {
          idFactura: existingFactura.id,
          numeroFactura: existingFactura.numero_factura,
          status: 'EMITIDA',
          totalCents: this.decimalToCents(existingFactura.total),
          currency: request.currency,
        };
      }

      // ── Crear factura + detalles en transacción ─────────────────────────
      const result = await this.prisma.$transaction(async (tx) => {
        // Calcular totales a partir de las líneas del proto
        const baseImponible = request.lines!.reduce((sum, line) => {
          const unitPrice = this.toNumber(line.unitPriceCents, 'unit_price_cents') / 100;
          const qty = line.quantity ?? 0;
          return sum + unitPrice * qty;
        }, 0);
        const ivaAmount = baseImponible * IVA_RATE;
        const totalConIva = baseImponible + ivaAmount;

        // Número de factura secuencial (seguro dentro de la transacción)
        const count = await tx.facturas.count();
        const numeroFactura = `FAC-${String(count + 1).padStart(5, '0')}`;

        // Cabecera de factura
        const factura = await tx.facturas.create({
          data: {
            id_reserva: request.reservaId!,
            numero_factura: numeroFactura,
            total: totalConIva,
          },
        });

        // Detalles de factura por cada línea recibida
        for (const line of request.lines!) {
          const unitPrice = this.toNumber(line.unitPriceCents, 'unit_price_cents') / 100;
          const qty = line.quantity ?? 0;
          const subtotalItem = unitPrice * qty;

          await tx.detalles_factura.create({
            data: {
              id_factura: factura.id,
              // Usamos el idPago como referencia de producto externo ya que
              // las líneas del proto no traen un id_producto explícito
              id_producto_externo: request.idPago!,
              cantidad: qty,
              precio_unitario: unitPrice,
              subtotal: subtotalItem,
            },
          });
        }

        return { factura, totalConIva, numeroFactura };
      });

      this.logger.log(`Factura creada: ${result.factura.id} (${result.numeroFactura}) para reserva ${request.reservaId}`);

      return {
        idFactura: result.factura.id,
        numeroFactura: result.numeroFactura,
        status: 'EMITIDA',
        totalCents: Math.round(result.totalConIva * 100),
        currency: request.currency,
      };
    } catch (err) {
      throw this.toRpcException(err);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // RefundPayment — UNIMPLEMENTED
  // ═════════════════════════════════════════════════════════════════════════════
  //
  // No implementado en esta iteración. Requiere migración de schema:
  //   - Agregar columna `status` al modelo `pagos`, o
  //   - Crear modelo `reembolsos` con FK a `pagos`.
  // Se mantiene el RPC en el contrato para la saga de compensación
  // de microservicio-reservas-booking.
  //
  @GrpcMethod('FinanceService', 'RefundPayment')
  async refundPayment(_request: RefundPaymentRequest) {
    this.logger.warn('RefundPayment invocado — no implementado en esta iteración');
    throw this.rpcError(
      status.UNIMPLEMENTED,
      'RefundPayment no está implementado. Requiere migración de schema (columna status en pagos o tabla reembolsos).',
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // Helpers privados
  // ═════════════════════════════════════════════════════════════════════════════

  /** Valida que un campo requerido tenga valor no vacío */
  private assertRequired(value: string | undefined | null, fieldName: string): void {
    if (!value?.trim()) {
      throw this.invalidArgument(`${fieldName} es requerido`);
    }
  }

  /** Convierte un valor numérico (puede llegar como string desde proto) */
  private toNumber(value: number | string | undefined, fieldName: string): number {
    if (value === undefined || value === null) {
      throw this.invalidArgument(`${fieldName} es requerido`);
    }
    const num = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(num)) {
      throw this.invalidArgument(`${fieldName} debe ser un número válido`);
    }
    return num;
  }

  /** Convierte un Decimal de Prisma a centavos enteros */
  private decimalToCents(decimal: unknown): number {
    return Math.round(Number(decimal) * 100);
  }

  /** Convierte cualquier error a RpcException */
  private toRpcException(err: unknown): RpcException {
    if (err instanceof RpcException) return err;
    const message = err instanceof Error ? err.message : 'Error interno del servicio de finanzas';
    return this.rpcError(status.INTERNAL, message);
  }

  /** Crea un RpcException con código INVALID_ARGUMENT */
  private invalidArgument(message: string): RpcException {
    return this.rpcError(status.INVALID_ARGUMENT, message);
  }

  /** Crea un RpcException genérico */
  private rpcError(code: status, message: string): RpcException {
    return new RpcException({ code, message });
  }
}
