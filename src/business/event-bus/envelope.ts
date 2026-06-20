import { v4 as uuidv4 } from 'uuid';

export interface EventEnvelope<TPayload = unknown> {
  // Identidad del mensaje
  eventId: string;          // UUID v4 — único por mensaje (clave de idempotencia)
  eventType: string;        // ej: "payment.processed"
  eventVersion: string;     // semver, ej: "1.0.0"
  
  // Trazabilidad
  correlationId: string;    // UUID que correla todo el flujo del checkout
  causationId?: string;     // eventId del mensaje que causó este (linkear con el comando recibido)
  
  // Origen
  source: string;           // nombre del microservicio que publica, ej: "identidad-finanzas"
  timestamp: string;        // ISO 8601 UTC
  
  // Payload
  payload: TPayload;
}

export interface WrapOptions {
  correlationId: string;
  causationId?: string;
  source?: string;
  eventVersion?: string;
}

/**
 * Crea un envelope estandarizado para eventos y comandos.
 */
export function wrap<T>(
  eventType: string,
  payload: T,
  opts: WrapOptions
): EventEnvelope<T> {
  return {
    eventId: uuidv4(),
    eventType,
    eventVersion: opts.eventVersion || '1.0.0',
    correlationId: opts.correlationId,
    causationId: opts.causationId,
    source: opts.source || 'identidad-finanzas',
    timestamp: new Date().toISOString(),
    payload,
  };
}
