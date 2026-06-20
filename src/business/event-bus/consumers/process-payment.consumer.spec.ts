jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-1234',
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ProcessPaymentConsumer } from './process-payment.consumer';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PagosRepository } from '../../../data-access/repositories/pagos.repository';
import { InboxService } from '../inbox/inbox.service';
import { OutboxService } from '../outbox/outbox.service';
import { EXCHANGES, ROUTING_KEYS } from '../event-types';
import { MetricsService } from '../../../common/observability/metrics.service';
import type { EventEnvelope } from '../envelope';

describe('ProcessPaymentConsumer', () => {
  let consumer: ProcessPaymentConsumer;
  let prisma: PrismaService;
  let pagosRepository: PagosRepository;
  let inbox: InboxService;
  let outbox: OutboxService;

  const mockPrisma = {
    $transaction: jest.fn(),
  };

  const mockPagosRepository = {
    findByReservaId: jest.fn(),
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
        ProcessPaymentConsumer,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PagosRepository, useValue: mockPagosRepository },
        { provide: InboxService, useValue: mockInbox },
        { provide: OutboxService, useValue: mockOutbox },
        { provide: MetricsService, useValue: mockMetrics },
      ],
    }).compile();

    consumer = module.get<ProcessPaymentConsumer>(ProcessPaymentConsumer);
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
      const invalidEnvelope1 = null as any;
      const invalidEnvelope2 = { eventId: '', payload: {} } as any;
      const invalidEnvelope3 = { eventId: 'uuid', payload: {} } as any;

      await consumer.handle(invalidEnvelope1);
      await consumer.handle(invalidEnvelope2);
      await consumer.handle(invalidEnvelope3);

      expect(inbox.tryMarkProcessed).not.toHaveBeenCalled();
      expect(pagosRepository.findByReservaId).not.toHaveBeenCalled();
    });

    it('should skip processing if message was already processed in Inbox', async () => {
      const envelope: EventEnvelope<any> = {
        eventId: 'evt-123',
        eventType: 'payment.process_requested',
        eventVersion: '1.0.0',
        correlationId: 'corr-123',
        source: 'reservas',
        timestamp: new Date().toISOString(),
        payload: { reservaId: 'res-123', monto: 100, metodoPagoId: 'mp-123' },
      };

      mockInbox.tryMarkProcessed.mockResolvedValue(false); // already processed

      await consumer.handle(envelope);

      expect(inbox.tryMarkProcessed).toHaveBeenCalledWith('evt-123', 'payment.process_requested');
      expect(pagosRepository.findByReservaId).not.toHaveBeenCalled();
    });

    it('should re-publish status and skip creation if payment already exists (business idempotency)', async () => {
      const envelope: EventEnvelope<any> = {
        eventId: 'evt-123',
        eventType: 'payment.process_requested',
        eventVersion: '1.0.0',
        correlationId: 'corr-123',
        source: 'reservas',
        timestamp: new Date().toISOString(),
        payload: { reservaId: 'res-123', monto: 100, metodoPagoId: 'mp-123' },
      };

      const existingPago = {
        id: 'pago-123',
        id_reserva: 'res-123',
        monto: 100,
        status: 'APROBADO',
        fecha_pago: new Date(),
      };

      mockInbox.tryMarkProcessed.mockResolvedValue(true);
      mockPagosRepository.findByReservaId.mockResolvedValue(existingPago);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback('fake-tx');
      });

      await consumer.handle(envelope);

      expect(inbox.tryMarkProcessed).toHaveBeenCalledWith('evt-123', 'payment.process_requested');
      expect(pagosRepository.findByReservaId).toHaveBeenCalledWith('res-123');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(outbox.save).toHaveBeenCalledWith(
        'fake-tx',
        EXCHANGES.PAYMENTS_EVENTS,
        ROUTING_KEYS.PAYMENT_PROCESSED,
        expect.objectContaining({
          eventType: ROUTING_KEYS.PAYMENT_PROCESSED,
          correlationId: 'corr-123',
          causationId: 'evt-123',
          payload: expect.objectContaining({
            pagoId: 'pago-123',
            reservaId: 'res-123',
            status: 'APROBADO',
          }),
        }),
      );
    });

    it('should create payment and save event in outbox inside a transaction in normal success case', async () => {
      const envelope: EventEnvelope<any> = {
        eventId: 'evt-123',
        eventType: 'payment.process_requested',
        eventVersion: '1.0.0',
        correlationId: 'corr-123',
        source: 'reservas',
        timestamp: new Date().toISOString(),
        payload: { reservaId: 'res-123', monto: 100, metodoPagoId: 'mp-123' },
      };

      const createdPago = {
        id: 'pago-123',
        id_reserva: 'res-123',
        monto: 100,
        status: 'APROBADO',
        fecha_pago: new Date(),
      };

      mockInbox.tryMarkProcessed.mockResolvedValue(true);
      mockPagosRepository.findByReservaId.mockResolvedValue(null);
      
      const fakeTx = {
        pagos: {
          create: jest.fn().mockResolvedValue(createdPago),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(fakeTx);
      });

      await consumer.handle(envelope);

      expect(inbox.tryMarkProcessed).toHaveBeenCalledWith('evt-123', 'payment.process_requested');
      expect(pagosRepository.findByReservaId).toHaveBeenCalledWith('res-123');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(fakeTx.pagos.create).toHaveBeenCalledWith({
        data: {
          id_reserva: 'res-123',
          id_metodo_pago: 'mp-123',
          monto: 100,
        },
      });
      expect(outbox.save).toHaveBeenCalledWith(
        fakeTx,
        EXCHANGES.PAYMENTS_EVENTS,
        ROUTING_KEYS.PAYMENT_PROCESSED,
        expect.objectContaining({
          eventType: ROUTING_KEYS.PAYMENT_PROCESSED,
          correlationId: 'corr-123',
          causationId: 'evt-123',
          payload: expect.objectContaining({
            pagoId: 'pago-123',
            reservaId: 'res-123',
          }),
        }),
      );
    });

    it('should write failed event to outbox if a Domain Error occurs', async () => {
      const envelope: EventEnvelope<any> = {
        eventId: 'evt-123',
        eventType: 'payment.process_requested',
        eventVersion: '1.0.0',
        correlationId: 'corr-123',
        source: 'reservas',
        timestamp: new Date().toISOString(),
        payload: { reservaId: 'res-123', monto: 100, metodoPagoId: 'mp-123' },
      };

      const domainError = new Error('Saldo insuficiente');
      (domainError as any).isDomainError = true;
      (domainError as any).code = 'INSUFFICIENT_FUNDS';

      mockInbox.tryMarkProcessed.mockResolvedValue(true);
      mockPagosRepository.findByReservaId.mockResolvedValue(null);
      
      const fakeTx = {
        pagos: {
          create: jest.fn().mockRejectedValue(domainError),
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
        ROUTING_KEYS.PAYMENT_FAILED,
        expect.objectContaining({
          eventType: ROUTING_KEYS.PAYMENT_FAILED,
          correlationId: 'corr-123',
          causationId: 'evt-123',
          payload: {
            reservaId: 'res-123',
            error: { code: 'INSUFFICIENT_FUNDS', message: 'Saldo insuficiente' },
          },
        }),
      );
    });

    it('should throw exception if an infrastructure error occurs', async () => {
      const envelope: EventEnvelope<any> = {
        eventId: 'evt-123',
        eventType: 'payment.process_requested',
        eventVersion: '1.0.0',
        correlationId: 'corr-123',
        source: 'reservas',
        timestamp: new Date().toISOString(),
        payload: { reservaId: 'res-123', monto: 100, metodoPagoId: 'mp-123' },
      };

      const dbError = new Error('Database connection lost');

      mockInbox.tryMarkProcessed.mockResolvedValue(true);
      mockPagosRepository.findByReservaId.mockResolvedValue(null);
      
      const fakeTx = {
        pagos: {
          create: jest.fn().mockRejectedValue(dbError),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(fakeTx);
      });

      await expect(consumer.handle(envelope)).rejects.toThrow('Database connection lost');
      expect(outbox.save).not.toHaveBeenCalled();
    });
  });
});
