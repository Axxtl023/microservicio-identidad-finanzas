import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { FacturasRepository } from '../../../data-access/repositories/facturas.repository';
import { InboxService } from '../inbox/inbox.service';
import { OutboxService } from '../outbox/outbox.service';
import { wrap } from '../envelope';
import type { EventEnvelope } from '../envelope';
import { ROUTING_KEYS, EXCHANGES, QUEUES } from '../event-types';
import { runWithCorrelationId } from '../../../common/observability/trace-context';
import { MetricsService } from '../../../common/observability/metrics.service';

interface IssueInvoiceItem {
  idProducto: string;
  cantidad: number;
  precioUnitario: number;
}

interface IssueInvoicePayload {
  reservaId: string;
  metodoPagoId: string;
  items: IssueInvoiceItem[];
}

const IVA_RATE = 0.15;

@Injectable()
export class IssueInvoiceConsumer {
  private readonly logger = new Logger(IssueInvoiceConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly facturasRepository: FacturasRepository,
    private readonly inbox: InboxService,
    private readonly outbox: OutboxService,
    private readonly metrics: MetricsService,
  ) {}

  @RabbitSubscribe({
    exchange: EXCHANGES.INVOICES_COMMANDS,
    routingKey: ROUTING_KEYS.INVOICE_ISSUE_REQUESTED,
    queue: QUEUES.ISSUE_INVOICE,
    queueOptions: {
      durable: true,
      deadLetterExchange: 'invoices.dlx',
      deadLetterRoutingKey: 'finanzas.issue-invoice.dead',
    },
  })
  async handle(envelope: EventEnvelope<IssueInvoicePayload>): Promise<void> {
    // 1. Validar envelope
    if (!envelope?.eventId || !envelope.payload?.reservaId || !envelope.payload?.items?.length) {
      this.logger.warn(`[issue-invoice] Envelope inválido, descartando: ${JSON.stringify(envelope)}`);
      return;
    }

    const { eventId, correlationId, payload } = envelope;

    await runWithCorrelationId(correlationId, async () => {
      this.logger.log(`issue-invoice: reserva=${payload.reservaId}`);

      // 2. Idempotencia mensaje (eventId)
      const isNew = await this.inbox.tryMarkProcessed(eventId, envelope.eventType);
      if (!isNew) {
        this.logger.log(`Mensaje duplicado ${eventId}, ignorando`);
        return;
      }

      // 3. Idempotencia negocio: ¿ya existe una factura para esta reserva?
      const existing = await this.facturasRepository.findByReservaId(payload.reservaId);
      if (existing) {
        this.logger.log(`Factura ya existe para reserva ${payload.reservaId}, re-publicando resultado`);
        await this.prisma.$transaction(async (tx) => {
          await this.outbox.save(
            tx,
            EXCHANGES.INVOICES_EVENTS,
            ROUTING_KEYS.INVOICE_ISSUED,
            wrap(ROUTING_KEYS.INVOICE_ISSUED, {
              facturaId: existing.id,
              numeroFactura: existing.numero_factura,
              reservaId: existing.id_reserva,
              total: Number(existing.total),
              iva: Number(existing.total) * IVA_RATE / (1 + IVA_RATE),
              fechaEmision: existing.fecha_emision,
            }, { correlationId, causationId: eventId, source: 'identidad-finanzas' }),
          );
        });
        this.metrics.incrementProcessed(envelope.eventType);
        return;
      }

      try {
        // 4. Caso normal: emitir factura + guardar outbox en la misma transacción
        await this.prisma.$transaction(async (tx) => {
          // Calcular totales
          const baseImponible = payload.items.reduce(
            (sum, item) => sum + item.cantidad * item.precioUnitario,
            0,
          );
          const ivaAmount = baseImponible * IVA_RATE;
          const totalConIva = baseImponible + ivaAmount;

          // Número de factura secuencial
          const count = await tx.facturas.count();
          const numeroFactura = `FAC-${String(count + 1).padStart(5, '0')}`;

          // Crear factura
          const factura = await tx.facturas.create({
            data: {
              id_reserva: payload.reservaId,
              numero_factura: numeroFactura,
              total: totalConIva,
            },
          });

          // Crear detalles
          for (const item of payload.items) {
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

          await this.outbox.save(
            tx,
            EXCHANGES.INVOICES_EVENTS,
            ROUTING_KEYS.INVOICE_ISSUED,
            wrap(ROUTING_KEYS.INVOICE_ISSUED, {
              facturaId: factura.id,
              numeroFactura: factura.numero_factura,
              reservaId: payload.reservaId,
              total: totalConIva,
              iva: ivaAmount,
              fechaEmision: factura.fecha_emision,
            }, { correlationId, causationId: eventId, source: 'identidad-finanzas' }),
          );
        });

        this.logger.log(`Factura emitida OK para reserva ${payload.reservaId}`);
        this.metrics.incrementProcessed(envelope.eventType);
      } catch (err: unknown) {
        const error = err as { isDomainError?: boolean; code?: string; message?: string };

        if (error?.isDomainError === true) {
          await this.prisma.$transaction(async (tx) => {
            await this.outbox.save(
              tx,
              EXCHANGES.INVOICES_EVENTS,
              ROUTING_KEYS.INVOICE_FAILED,
              wrap(ROUTING_KEYS.INVOICE_FAILED, {
                reservaId: payload.reservaId,
                error: { code: error.code, message: error.message },
              }, { correlationId, causationId: eventId, source: 'identidad-finanzas' }),
            );
          });
          this.logger.warn(`Error dominio en issue-invoice: ${error.message}`);
          this.metrics.incrementFailed(envelope.eventType);
          return;
        }

        this.logger.error(`Error infra en issue-invoice, reintentando: ${error.message}`);
        this.metrics.incrementFailed(envelope.eventType);
        throw err;
      }
    });
  }
}

