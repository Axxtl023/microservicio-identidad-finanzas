jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-1234',
}));

import { Test, TestingModule } from '@nestjs/testing';
import { IssueInvoiceConsumer } from './issue-invoice.consumer';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { FacturasRepository } from '../../../data-access/repositories/facturas.repository';
import { InboxService } from '../inbox/inbox.service';
import { OutboxService } from '../outbox/outbox.service';
import { EXCHANGES, ROUTING_KEYS } from '../event-types';
import { MetricsService } from '../../../common/observability/metrics.service';
import type { EventEnvelope } from '../envelope';

describe('IssueInvoiceConsumer', () => {
  let consumer: IssueInvoiceConsumer;
  let prisma: PrismaService;
  let facturasRepository: FacturasRepository;
  let inbox: InboxService;
  let outbox: OutboxService;

  const mockPrisma = {
    $transaction: jest.fn(),
  };

  const mockFacturasRepository = {
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
        IssueInvoiceConsumer,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FacturasRepository, useValue: mockFacturasRepository },
        { provide: InboxService, useValue: mockInbox },
        { provide: OutboxService, useValue: mockOutbox },
        { provide: MetricsService, useValue: mockMetrics },
      ],
    }).compile();

    consumer = module.get<IssueInvoiceConsumer>(IssueInvoiceConsumer);
    prisma = module.get<PrismaService>(PrismaService);
    facturasRepository = module.get<FacturasRepository>(FacturasRepository);
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
      const invalidEnvelope2 = { eventId: 'evt-123', payload: { reservaId: '' } } as any;
      const invalidEnvelope3 = { eventId: 'evt-123', payload: { reservaId: 'res-123', items: [] } } as any;

      await consumer.handle(invalidEnvelope1);
      await consumer.handle(invalidEnvelope2);
      await consumer.handle(invalidEnvelope3);

      expect(inbox.tryMarkProcessed).not.toHaveBeenCalled();
    });

    it('should skip processing if message was already processed in Inbox', async () => {
      const envelope: EventEnvelope<any> = {
        eventId: 'evt-123',
        eventType: 'invoice.issue_requested',
        eventVersion: '1.0.0',
        correlationId: 'corr-123',
        source: 'reservas',
        timestamp: new Date().toISOString(),
        payload: {
          reservaId: 'res-123',
          metodoPagoId: 'mp-123',
          items: [{ idProducto: 'prod-1', cantidad: 2, precioUnitario: 50 }],
        },
      };

      mockInbox.tryMarkProcessed.mockResolvedValue(false);

      await consumer.handle(envelope);

      expect(inbox.tryMarkProcessed).toHaveBeenCalledWith('evt-123', 'invoice.issue_requested');
      expect(facturasRepository.findByReservaId).not.toHaveBeenCalled();
    });

    it('should re-publish invoice issued event if invoice already exists (business idempotency)', async () => {
      const envelope: EventEnvelope<any> = {
        eventId: 'evt-123',
        eventType: 'invoice.issue_requested',
        eventVersion: '1.0.0',
        correlationId: 'corr-123',
        source: 'reservas',
        timestamp: new Date().toISOString(),
        payload: {
          reservaId: 'res-123',
          metodoPagoId: 'mp-123',
          items: [{ idProducto: 'prod-1', cantidad: 2, precioUnitario: 50 }],
        },
      };

      const existingInvoice = {
        id: 'fac-123',
        numero_factura: 'FAC-00001',
        id_reserva: 'res-123',
        total: 115,
        fecha_emision: new Date(),
      };

      mockInbox.tryMarkProcessed.mockResolvedValue(true);
      mockFacturasRepository.findByReservaId.mockResolvedValue(existingInvoice);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback('fake-tx');
      });

      await consumer.handle(envelope);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(outbox.save).toHaveBeenCalledWith(
        'fake-tx',
        EXCHANGES.INVOICES_EVENTS,
        ROUTING_KEYS.INVOICE_ISSUED,
        expect.objectContaining({
          eventType: ROUTING_KEYS.INVOICE_ISSUED,
          payload: expect.objectContaining({
            facturaId: 'fac-123',
            numeroFactura: 'FAC-00001',
            reservaId: 'res-123',
            total: 115,
          }),
        }),
      );
    });

    it('should create invoice and details inside transaction, then publish event in success case', async () => {
      const envelope: EventEnvelope<any> = {
        eventId: 'evt-123',
        eventType: 'invoice.issue_requested',
        eventVersion: '1.0.0',
        correlationId: 'corr-123',
        source: 'reservas',
        timestamp: new Date().toISOString(),
        payload: {
          reservaId: 'res-123',
          metodoPagoId: 'mp-123',
          items: [
            { idProducto: 'prod-1', cantidad: 2, precioUnitario: 50 },
            { idProducto: 'prod-2', cantidad: 1, precioUnitario: 100 },
          ],
        },
      };

      // base: (2*50) + (1*100) = 200. IVA: 30. Total: 230.
      mockInbox.tryMarkProcessed.mockResolvedValue(true);
      mockFacturasRepository.findByReservaId.mockResolvedValue(null);

      const createdInvoice = {
        id: 'fac-123',
        numero_factura: 'FAC-00015',
        id_reserva: 'res-123',
        total: 230,
        fecha_emision: new Date(),
      };

      const fakeTx = {
        facturas: {
          count: jest.fn().mockResolvedValue(14),
          create: jest.fn().mockResolvedValue(createdInvoice),
        },
        detalles_factura: {
          create: jest.fn().mockResolvedValue({}),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(fakeTx);
      });

      await consumer.handle(envelope);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(fakeTx.facturas.count).toHaveBeenCalled();
      expect(fakeTx.facturas.create).toHaveBeenCalledWith({
        data: {
          id_reserva: 'res-123',
          numero_factura: 'FAC-00015',
          total: 230,
        },
      });
      expect(fakeTx.detalles_factura.create).toHaveBeenCalledTimes(2);
      expect(fakeTx.detalles_factura.create).toHaveBeenNthCalledWith(1, {
        data: {
          id_factura: 'fac-123',
          id_producto_externo: 'prod-1',
          cantidad: 2,
          precio_unitario: 50,
          subtotal: 100,
        },
      });
      expect(fakeTx.detalles_factura.create).toHaveBeenNthCalledWith(2, {
        data: {
          id_factura: 'fac-123',
          id_producto_externo: 'prod-2',
          cantidad: 1,
          precio_unitario: 100,
          subtotal: 100,
        },
      });
      expect(outbox.save).toHaveBeenCalledWith(
        fakeTx,
        EXCHANGES.INVOICES_EVENTS,
        ROUTING_KEYS.INVOICE_ISSUED,
        expect.objectContaining({
          eventType: ROUTING_KEYS.INVOICE_ISSUED,
          payload: expect.objectContaining({
            facturaId: 'fac-123',
            numeroFactura: 'FAC-00015',
            reservaId: 'res-123',
            total: 230,
            iva: 30,
          }),
        }),
      );
    });

    it('should write failed event to outbox if a Domain Error occurs', async () => {
      const envelope: EventEnvelope<any> = {
        eventId: 'evt-123',
        eventType: 'invoice.issue_requested',
        eventVersion: '1.0.0',
        correlationId: 'corr-123',
        source: 'reservas',
        timestamp: new Date().toISOString(),
        payload: {
          reservaId: 'res-123',
          metodoPagoId: 'mp-123',
          items: [{ idProducto: 'prod-1', cantidad: 2, precioUnitario: 50 }],
        },
      };

      const domainError = new Error('El metodo de pago no es valido');
      (domainError as any).isDomainError = true;
      (domainError as any).code = 'INVALID_PAYMENT_METHOD';

      mockInbox.tryMarkProcessed.mockResolvedValue(true);
      mockFacturasRepository.findByReservaId.mockResolvedValue(null);

      const fakeTx = {
        facturas: {
          count: jest.fn().mockRejectedValue(domainError),
        },
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback(fakeTx);
      });

      await consumer.handle(envelope);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(outbox.save).toHaveBeenCalledWith(
        fakeTx,
        EXCHANGES.INVOICES_EVENTS,
        ROUTING_KEYS.INVOICE_FAILED,
        expect.objectContaining({
          eventType: ROUTING_KEYS.INVOICE_FAILED,
          payload: expect.objectContaining({
            reservaId: 'res-123',
            error: { code: 'INVALID_PAYMENT_METHOD', message: 'El metodo de pago no es valido' },
          }),
        }),
      );
    });

    it('should throw exception if infrastructure error occurs', async () => {
      const envelope: EventEnvelope<any> = {
        eventId: 'evt-123',
        eventType: 'invoice.issue_requested',
        eventVersion: '1.0.0',
        correlationId: 'corr-123',
        source: 'reservas',
        timestamp: new Date().toISOString(),
        payload: {
          reservaId: 'res-123',
          metodoPagoId: 'mp-123',
          items: [{ idProducto: 'prod-1', cantidad: 2, precioUnitario: 50 }],
        },
      };

      mockInbox.tryMarkProcessed.mockResolvedValue(true);
      mockFacturasRepository.findByReservaId.mockRejectedValue(new Error('Connection failure'));

      await expect(consumer.handle(envelope)).rejects.toThrow('Connection failure');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
