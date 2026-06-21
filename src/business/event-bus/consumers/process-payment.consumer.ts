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

interface ProcessPaymentPayload {
  reservaId: string;
  monto: number;
  metodoPagoId: string;
}

@Injectable()
export class ProcessPaymentConsumer {
  private readonly logger = new Logger(ProcessPaymentConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pagosRepository: PagosRepository,
    private readonly inbox: InboxService,
    private readonly outbox: OutboxService,
    private readonly metrics: MetricsService,
  ) {}

  @RabbitSubscribe({
    exchange: EXCHANGES.PAYMENTS_COMMANDS,
    routingKey: ROUTING_KEYS.PAYMENT_PROCESS_REQUESTED,
    queue: QUEUES.PROCESS_PAYMENT,
    queueOptions: {
      durable: true,
      deadLetterExchange: 'payments.dlx',
      deadLetterRoutingKey: 'finanzas.process-payment.dead',
    },
  })
  async handle(envelope: EventEnvelope<ProcessPaymentPayload>): Promise<void> {
    // 1. Validar envelope
    if (!envelope?.eventId || !envelope.payload?.reservaId) {
      this.logger.warn(`[process-payment] Envelope inválido, descartando: ${JSON.stringify(envelope)}`);
      return;
    }

    const { eventId, correlationId, payload } = envelope;

    await runWithCorrelationId(correlationId, async () => {
      this.logger.log(`process-payment: reserva=${payload.reservaId}`);

      // 2. Idempotencia mensaje (eventId)
      const isNew = await this.inbox.tryMarkProcessed(eventId, envelope.eventType);
      if (!isNew) {
        this.logger.log(`Mensaje duplicado ${eventId}, ignorando`);
        return;
      }

      // 3. Idempotencia negocio: ¿ya existe un pago para esta reserva?
      const existing = await this.pagosRepository.findByReservaId(payload.reservaId);
      if (existing) {
        this.logger.log(`Pago ya existe para reserva ${payload.reservaId}, re-publicando resultado`);
        await this.prisma.$transaction(async (tx) => {
          await this.outbox.save(
            tx,
            EXCHANGES.PAYMENTS_EVENTS,
            ROUTING_KEYS.PAYMENT_PROCESSED,
            wrap(ROUTING_KEYS.PAYMENT_PROCESSED, {
              pagoId: existing.id,
              reservaId: existing.id_reserva,
              monto: Number(existing.monto),
              status: existing.status,
              fechaPago: existing.fecha_pago,
            }, { correlationId, causationId: eventId, source: 'identidad-finanzas' }),
          );
        });
        this.metrics.incrementProcessed(envelope.eventType);
        return;
      }

      try {
        // 4. Caso normal: crear pago y guardar evento en outbox, TODO dentro de una transacción
        await this.prisma.$transaction(async (tx) => {
          const pago = await tx.pagos.create({
            data: {
              id_reserva: payload.reservaId,
              id_metodo_pago: payload.metodoPagoId,
              monto: payload.monto,
            },
          });

          await this.outbox.save(
            tx,
            EXCHANGES.PAYMENTS_EVENTS,
            ROUTING_KEYS.PAYMENT_PROCESSED,
            wrap(ROUTING_KEYS.PAYMENT_PROCESSED, {
              pagoId: pago.id,
              reservaId: pago.id_reserva,
              monto: Number(pago.monto),
              status: pago.status,
              fechaPago: pago.fecha_pago,
            }, { correlationId, causationId: eventId, source: 'identidad-finanzas' }),
          );
        });

        this.logger.log(`Pago procesado OK para reserva ${payload.reservaId}`);
        this.metrics.incrementProcessed(envelope.eventType);
      } catch (err: unknown) {
        const error = err as { isDomainError?: boolean; code?: string; message?: string };

        // 5. Error de dominio → publicar payment.failed + ack (sin retry)
        if (error?.isDomainError === true) {
          await this.prisma.$transaction(async (tx) => {
            await this.outbox.save(
              tx,
              EXCHANGES.PAYMENTS_EVENTS,
              ROUTING_KEYS.PAYMENT_FAILED,
              wrap(ROUTING_KEYS.PAYMENT_FAILED, {
                reservaId: payload.reservaId,
                error: { code: error.code, message: error.message },
              }, { correlationId, causationId: eventId, source: 'identidad-finanzas' }),
            );
          });
          this.logger.warn(`Error dominio en process-payment: ${error.message}`);
          this.metrics.incrementFailed(envelope.eventType);
          return;
        }

        // 6. Error de infra → throw para que RabbitMQ reintente
        this.logger.error(`Error infra en process-payment, reintentando: ${error.message}`);
        this.metrics.incrementFailed(envelope.eventType);
        throw err;
      }
    });
  }
}

