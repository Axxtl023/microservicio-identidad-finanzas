import { Module } from '@nestjs/common';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MetricsService } from '../../common/observability/metrics.service';

import { OutboxService } from './outbox/outbox.service';
import { OutboxPublisherService } from './outbox/outbox-publisher.service';
import { InboxService } from './inbox/inbox.service';

import { ProcessPaymentConsumer } from './consumers/process-payment.consumer';
import { RefundPaymentConsumer } from './consumers/refund-payment.consumer';
import { IssueInvoiceConsumer } from './consumers/issue-invoice.consumer';

import { FacturasRepository } from '../../data-access/repositories/facturas.repository';
import { IFACTURAS_REPOSITORY } from '../../data-access/repositories/interfaces/i-facturas.repository';
import { DetallesFacturaRepository } from '../../data-access/repositories/detalles-factura.repository';
import { IDETALLES_FACTURA_REPOSITORY } from '../../data-access/repositories/interfaces/i-detalles-factura.repository';
import { PagosRepository } from '../../data-access/repositories/pagos.repository';
import { IPAGOS_REPOSITORY } from '../../data-access/repositories/interfaces/i-pagos.repository';
import { MetodosPagoRepository } from '../../data-access/repositories/metodos-pago.repository';
import { IMETODOS_PAGO_REPOSITORY } from '../../data-access/repositories/interfaces/i-metodos-pago.repository';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    RabbitMQModule.forRoot({
      exchanges: [
        { name: 'payments.commands', type: 'topic' },
        { name: 'payments.events', type: 'topic' },
        { name: 'invoices.commands', type: 'topic' },
        { name: 'invoices.events', type: 'topic' },
      ],
      uri: process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672',
      connectionInitOptions: { wait: false },
      connectionManagerOptions: {
        reconnectTimeInSeconds: 5,
        heartbeatIntervalInSeconds: 30,
      },
      prefetchCount: Number(process.env.RABBITMQ_PREFETCH) || 10,
    } as never),
  ],
  providers: [
    PrismaService,

    // ── Outbox ────────────────────────────────────────────────────────────────
    OutboxService,
    OutboxPublisherService,

    // ── Inbox ─────────────────────────────────────────────────────────────────
    InboxService,

    // ── Repositories (needed by consumers) ───────────────────────────────────
    PagosRepository,
    { provide: IPAGOS_REPOSITORY, useExisting: PagosRepository },
    MetodosPagoRepository,
    { provide: IMETODOS_PAGO_REPOSITORY, useExisting: MetodosPagoRepository },
    FacturasRepository,
    { provide: IFACTURAS_REPOSITORY, useExisting: FacturasRepository },
    DetallesFacturaRepository,
    { provide: IDETALLES_FACTURA_REPOSITORY, useExisting: DetallesFacturaRepository },

    // ── Consumers ─────────────────────────────────────────────────────────────
    ProcessPaymentConsumer,
    RefundPaymentConsumer,
    IssueInvoiceConsumer,

    // ── Metrics ───────────────────────────────────────────────────────────────
    MetricsService,
  ],
  exports: [OutboxService, InboxService, RabbitMQModule, MetricsService],
})
export class EventBusModule {}
