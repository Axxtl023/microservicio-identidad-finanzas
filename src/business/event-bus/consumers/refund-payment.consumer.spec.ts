jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-1234',
}));

import { Test, TestingModule } from '@nestjs/testing';
import { RefundPaymentConsumer } from './refund-payment.consumer';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PagosRepository } from '../../../data-access/repositories/pagos.repository';
import { InboxService } from '../inbox/inbox.service';
import { OutboxService } from '../outbox/outbox.service';
import { EXCHANGES, ROUTING_KEYS } from '../event-types';
import { MetricsService } from '../../../common/observability/metrics.service';
import type { EventEnvelope } from '../envelope';

describe('RefundPaymentConsumer', () => {
  let consumer: RefundPaymentConsumer;
  let prisma: PrismaService;
  let pagosRepository: PagosRepository;
  let inbox: InboxService;
  let outbox: OutboxService;

  const mockPrisma = {
    $transaction: jest.fn(),
  };

  const mockPagosRepository = {
    findById: jest.fn(),
  };

  const mockInbox = {
    tryMarkProcessed: jest.fn(),
  };

  const mockOutbox = {
    save: jest.fn(),
  };

  const mockMetrics = {
    incrementProcessed: jest.fn(),
    incrementFailed: jest.fn(),
    incrementPublished: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundPaymentConsumer,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PagosRepository, useValue: mockPagosRepository },
        { provide: InboxService, useValue: mockInbox },
        { provide: OutboxService, useValue: mockOutbox },
        { provide: MetricsService, useValue: mockMetrics },
      ],
    }).compile();

    consumer = module.get<RefundPaymentConsumer>(RefundPaymentConsumer);
    prisma = module.get<PrismaService>(PrismaService);
    pagosRepository = module.get<PagosRepository>(PagosRepository);
    inbox = module.get<InboxService>(InboxService);
    outbox = module.get<OutboxService>(OutboxService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('handle', () => {
    it('should discard and do nothing if envelope is invalid', async () => {
      const invalidEnvelope = { eventId: 'evt-123', payload: {} } as any; // missing pagoId
      await consumer.handle(invalidEnvelope);
      expect(inbox.tryMarkProcessed).not.toHaveBeenCalled();
    });

    it('should skip processing if message was already processed in Inbox', async () => {
      const envelope: EventEnvelope<any> = {
        eventId: 'evt-123',
        eventType: 'payment.refund_requested',
        eventVersion: '1.0.0',
        correlationId: 'corr-123',
        source: 'reservas',
        timestamp: new Date().toISOString(),
        payload: { pagoId: 'pago-123', reservaId: 'res-123', motivo: 'Cancelacion' },
      };

      mockInbox.tryMarkProcessed.mockResolvedValue(false);

      await consumer.handle(envelope);

      expect(inbox.tryMarkProcessed).toHaveBeenCalledWith('evt-123', 'payment.refund_requested');
      expect(pagosRepository.findById).not.toHaveBeenCalled();
    });

    it('should publish refund_failed if payment is not found', async () => {
      const envelope: EventEnvelope<any> = {
        eventId: 'evt-123',
        eventType: 'payment.refund_requested',
        eventVersion: '1.0.0',
        correlationId: 'corr-123',
        source: 'reservas',
        timestamp: new Date().toISOString(),
        payload: { pagoId: 'pago-non-existent', reservaId: 'res-123', motivo: 'Cancelacion' },
      };

      mockInbox.tryMarkProcessed.mockResolvedValue(true);
      mockPagosRepository.findById.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback('fake-tx');
      });

      await consumer.handle(envelope);

      expect(pagosRepository.findById).toHaveBeenCalledWith('pago-non-existent');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(outbox.save).toHaveBeenCalledWith(
        'fake-tx',
        EXCHANGES.PAYMENTS_EVENTS,
        ROUTING_KEYS.PAYMENT_REFUND_FAILED,
        expect.objectContaining({
          eventType: ROUTING_KEYS.PAYMENT_REFUND_FAILED,
          payload: expect.objectContaining({
            pagoId: 'pago-non-existent',
            error: expect.objectContaining({ code: 'NOT_FOUND' }),
          }),
        }),
      );
    });

    it('should re-publish refunded status if payment is already REEMBOLSADO (business idempotency)', async () => {
      const envelope: EventEnvelope<any> = {
        eventId: 'evt-123',
        eventType: 'payment.refund_requested',
        eventVersion: '1.0.0',
        correlationId: 'corr-123',
        source: 'reservas',
        timestamp: new Date().toISOString(),
        payload: { pagoId: 'pago-123', reservaId: 'res-123', motivo: 'Cancelacion' },
      };

      const refundDate = new Date();
      const existingPago = {
        id: 'pago-123',
        id_reserva: 'res-123',
        monto: 150,
        status: 'REEMBOLSADO',
        fecha_reembolso: refundDate,
        motivo_reembolso: 'Cliente insatisfecho',
      };

      mockInbox.tryMarkProcessed.mockResolvedValue(true);
      mockPagosRepository.findById.mockResolvedValue(existingPago);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback('fake-tx');
      });

      await consumer.handle(envelope);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(outbox.save).toHaveBeenCalledWith(
        'fake-tx',
        EXCHANGES.PAYMENTS_EVENTS,
        ROUTING_KEYS.PAYMENT_REFUNDED,
        expect.objectContaining({
          eventType: ROUTING_KEYS.PAYMENT_REFUNDED,
          payload: expect.objectContaining({
            pagoId: 'pago-123',
            reservaId: 'res-123',
            monto: 150,
            motivo: 'Cliente insatisfecho',
            fechaReembolso: refundDate,
          }),
        }),
      );
    });

    it('should update payment status to REEMBOLSADO and publish event in normal success case', async () => {
      const envelope: EventEnvelope<any> = {
        eventId: 'evt-123',
        eventType: 'payment.refund_requested',
        eventVersion: '1.0.0',
        correlationId: 'corr-123',
        source: 'reservas',
        timestamp: new Date().toISOString(),
        payload: { pagoId: 'pago-123', reservaId: 'res-123', motivo: 'Cancelacion' },
      };

      const existingPago = {
        id: 'pago-123',
        id_reserva: 'res-123',
        monto: 150,
        status: 'APROBADO',
      };

      const refundDate = new Date();
      const updatedPago = {
        id: 'pago-123',
        id_reserva: 'res-123',
        monto: 150,
        status: 'REEMBOLSADO',
        fecha_reembolso: refundDate,
        motivo_reembolso: 'Cancelacion',
      };

      mockInbox.tryMarkProcessed.mockResolvedValue(true);
      mockPagosRepository.findById.mockResolvedValue(existingPago);

      const fakeTx = {
        pagos: {
          update: jest.fn().mockResolvedValue(updatedPago),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(fakeTx);
      });

      await consumer.handle(envelope);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(fakeTx.pagos.update).toHaveBeenCalledWith({
        where: { id: 'pago-123' },
        data: {
          status: 'REEMBOLSADO',
          fecha_reembolso: expect.any(Date),
          motivo_reembolso: 'Cancelacion',
        },
      });
      expect(outbox.save).toHaveBeenCalledWith(
        fakeTx,
        EXCHANGES.PAYMENTS_EVENTS,
        ROUTING_KEYS.PAYMENT_REFUNDED,
        expect.objectContaining({
          eventType: ROUTING_KEYS.PAYMENT_REFUNDED,
          payload: expect.objectContaining({
            pagoId: 'pago-123',
            reservaId: 'res-123',
            monto: 150,
            motivo: 'Cancelacion',
            fechaReembolso: refundDate,
          }),
        }),
      );
    });

    it('should write failed refund event to outbox if a Domain Error occurs', async () => {
      const envelope: EventEnvelope<any> = {
        eventId: 'evt-123',
        eventType: 'payment.refund_requested',
        eventVersion: '1.0.0',
        correlationId: 'corr-123',
        source: 'reservas',
        timestamp: new Date().toISOString(),
        payload: { pagoId: 'pago-123', reservaId: 'res-123', motivo: 'Cancelacion' },
      };

      const existingPago = {
        id: 'pago-123',
        id_reserva: 'res-123',
        monto: 150,
        status: 'APROBADO',
      };

      const domainError = new Error('Reembolso fuera de plazo');
      (domainError as any).isDomainError = true;
      (domainError as any).code = 'OUT_OF_TIME_LIMIT';

      mockInbox.tryMarkProcessed.mockResolvedValue(true);
      mockPagosRepository.findById.mockResolvedValue(existingPago);

      const fakeTx = {
        pagos: {
          update: jest.fn().mockRejectedValue(domainError),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(fakeTx);
      });

      await consumer.handle(envelope);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(outbox.save).toHaveBeenCalledWith(
        fakeTx,
        EXCHANGES.PAYMENTS_EVENTS,
        ROUTING_KEYS.PAYMENT_REFUND_FAILED,
        expect.objectContaining({
          eventType: ROUTING_KEYS.PAYMENT_REFUND_FAILED,
          payload: expect.objectContaining({
            pagoId: 'pago-123',
            error: { code: 'OUT_OF_TIME_LIMIT', message: 'Reembolso fuera de plazo' },
          }),
        }),
      );
    });

    it('should throw exception if infrastructure error occurs', async () => {
      const envelope: EventEnvelope<any> = {
        eventId: 'evt-123',
        eventType: 'payment.refund_requested',
        eventVersion: '1.0.0',
        correlationId: 'corr-123',
        source: 'reservas',
        timestamp: new Date().toISOString(),
        payload: { pagoId: 'pago-123', reservaId: 'res-123', motivo: 'Cancelacion' },
      };

      mockInbox.tryMarkProcessed.mockResolvedValue(true);
      mockPagosRepository.findById.mockRejectedValue(new Error('DB Timeout'));

      await expect(consumer.handle(envelope)).rejects.toThrow('DB Timeout');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
