import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EventEnvelope } from '../envelope';

@Injectable()
export class OutboxService {
  /**
   * Guarda un evento en event_outbox DENTRO de la misma transacción de Prisma.
   * Siempre llamar con el cliente transaccional `tx` para garantizar atomicidad.
   * Los registros jamás se borran (política append-only para auditoría).
   */
  async save(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    exchange: string,
    routingKey: string,
    envelope: EventEnvelope,
  ): Promise<void> {
    await tx.event_outbox.create({
      data: {
        event_id: envelope.eventId,
        event_type: envelope.eventType,
        exchange,
        routing_key: routingKey,
        payload: envelope as object,
        correlation_id: envelope.correlationId ?? null,
        aggregate_id: (envelope.payload as Record<string, unknown>)?.reservaId?.toString()
          ?? (envelope.payload as Record<string, unknown>)?.pagoId?.toString()
          ?? null,
      },
    });
  }
}
