export const EXCHANGES = {
  PAYMENTS_COMMANDS: 'payments.commands',
  PAYMENTS_EVENTS: 'payments.events',
  INVOICES_COMMANDS: 'invoices.commands',
  INVOICES_EVENTS: 'invoices.events',
} as const;

export const ROUTING_KEYS = {
  // Comandos (recibidos/consumidos)
  PAYMENT_PROCESS_REQUESTED: 'payment.process.requested',
  PAYMENT_REFUND_REQUESTED: 'payment.refund.requested',
  INVOICE_ISSUE_REQUESTED: 'invoice.issue.requested',

  // Eventos (publicados/enviados)
  PAYMENT_PROCESSED: 'payment.processed',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  PAYMENT_REFUND_FAILED: 'payment.refund_failed',
  INVOICE_ISSUED: 'invoice.issued',
  INVOICE_FAILED: 'invoice.failed',
} as const;

export const QUEUES = {
  PROCESS_PAYMENT: 'finanzas.process-payment',
  REFUND_PAYMENT: 'finanzas.refund-payment',
  ISSUE_INVOICE: 'finanzas.issue-invoice',
} as const;
