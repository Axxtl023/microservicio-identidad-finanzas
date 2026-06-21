import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PagosRepository } from '../../../data-access/repositories/pagos.repository';
import { InboxService } from '../inbox/inbox.service';
import { OutboxService } from '../outbox/outbox.service';
import { wrap } from '../envelope';
import type { EventEnvelope } from '../envelope';
import { ROUTING_KEYS, EXCHANGES, QUEUES } from '../event-types';
import { runWithCorrelationId } from '../../../common/observability/trace-context';
import { MetricsService } from '../../../common/observability/metrics.service';

interface RefundPaymentPayload {
  pagoId: string;
  reservaId: string;
  motivo: string;
}

@Injectable()
export class RefundPaymentConsumer {
  private readonly logger = new Logger(RefundPaymentConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pagosRepository: PagosRepository,
    private readonly inbox: InboxService,
    private readonly outbox: OutboxService,
    private readonly metrics: MetricsService,
  ) {}

  @RabbitSubscribe({
    exchange: EXCHANGES.PAYMENTS_COMMANDS,
    routingKey: ROUTING_KEYS.PAYMENT_REFUND_REQUESTED,
    queue: QUEUES.REFUND_PAYMENT,
    queueOptions: {
      durable: true,
      deadLetterExchange: 'payments.dlx',
      deadLetterRoutingKey: 'finanzas.refund-payment.dead',
    },
  })
  async handle(envelope: EventEnvelope<RefundPaymentPayload>): Promise<void> {
    // 1. Validar envelope
    if (!envelope?.eventId || !envelope.payload?.pagoId) {
      this.logger.warn(`[refund-payment] Envelope inválido, descartando: ${JSON.stringify(envelope)}`);
      return;
    }

    const { eventId, correlationId, payload } = envelope;

    await runWithCorrelationId(correlationId, async () => {
      this.logger.log(`refund-payment: pagoId=${payload.pagoId}`);

      // 2. Idempotencia mensaje (eventId)
      const isNew = await this.inbox.tryMarkProcessed(eventId, envelope.eventType);
      if (!isNew) {
        this.logger.log(`Mensaje duplicado ${eventId}, ignorando`);
        return;
      }

      // 3. Buscar el pago
      const pago = await this.pagosRepository.findById(payload.pagoId);

      if (!pago) {
        // Pago no encontrado → error de dominio, publicar refund_failed
        await this.prisma.$transaction(async (tx) => {
          await this.outbox.save(
            tx,
            EXCHANGES.PAYMENTS_EVENTS,
            ROUTING_KEYS.PAYMENT_REFUND_FAILED,
            wrap(ROUTING_KEYS.PAYMENT_REFUND_FAILED, {
              pagoId: payload.pagoId,
              reservaId: payload.reservaId,
              error: { code: 'NOT_FOUND', message: `Pago ${payload.pagoId} no encontrado` },
            }, { correlationId, causationId: eventId, source: 'identidad-finanzas' }),
          );
        });
        this.logger.warn(`Pago ${payload.pagoId} no encontrado`);
        this.metrics.incrementFailed(envelope.eventType);
        return;
      }

      // 4. Idempotencia negocio: ¿ya fue reembolsado?
      if (pago.status === 'REEMBOLSADO') {
        this.logger.log(`Pago ${payload.pagoId} ya reembolsado, re-publicando resultado`);
        await this.prisma.$transaction(async (tx) => {
          await this.outbox.save(
            tx,
            EXCHANGES.PAYMENTS_EVENTS,
            ROUTING_KEYS.PAYMENT_REFUNDED,
            wrap(ROUTING_KEYS.PAYMENT_REFUNDED, {
              pagoId: pago.id,
              reservaId: pago.id_reserva,
              monto: Number(pago.monto),
              motivo: pago.motivo_reembolso ?? payload.motivo,
              fechaReembolso: pago.fecha_reembolso,
            }, { correlationId, causationId: eventId, source: 'identidad-finanzas' }),
          );
        });
        this.metrics.incrementProcessed(envelope.eventType);
        return;
      }

      try {
        // 5. Caso normal: marcar como reembolsado y guardar evento en outbox
        await this.prisma.$transaction(async (tx) => {
          const pagoActualizado = await tx.pagos.update({
            where: { id: pago.id },
            data: {
              status: 'REEMBOLSADO',
              fecha_reembolso: new Date(),
              motivo_reembolso: payload.motivo?.slice(0, 255),
            } as never,
          });

          await this.outbox.save(
            tx,
            EXCHANGES.PAYMENTS_EVENTS,
            ROUTING_KEYS.PAYMENT_REFUNDED,
            wrap(ROUTING_KEYS.PAYMENT_REFUNDED, {
              pagoId: pagoActualizado.id,
              reservaId: pagoActualizado.id_reserva,
              monto: Number(pagoActualizado.monto),
              motivo: payload.motivo,
              fechaReembolso: pagoActualizado.fecha_reembolso,
            }, { correlationId, causationId: eventId, source: 'identidad-finanzas' }),
          );
        });

        this.logger.log(`Reembolso OK para pago ${payload.pagoId}`);
        this.metrics.incrementProcessed(envelope.eventType);
      } catch (err: unknown) {
        const error = err as { isDomainError?: boolean; code?: string; message?: string };

        if (error?.isDomainError === true) {
          await this.prisma.$transaction(async (tx) => {
            await this.outbox.save(
              tx,
              EXCHANGES.PAYMENTS_EVENTS,
              ROUTING_KEYS.PAYMENT_REFUND_FAILED,
              wrap(ROUTING_KEYS.PAYMENT_REFUND_FAILED, {
                pagoId: payload.pagoId,
                reservaId: payload.reservaId,
                error: { code: error.code, message: error.message },
              }, { correlationId, causationId: eventId, source: 'identidad-finanzas' }),
            );
          });
          this.logger.warn(`Error dominio en refund-payment: ${error.message}`);
          this.metrics.incrementFailed(envelope.eventType);
          return;
        }

        this.logger.error(`Error infra en refund-payment, reintentando: ${error.message}`);
        this.metrics.incrementFailed(envelope.eventType);
        throw err;
      }
    });
  }
}

