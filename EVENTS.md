# 📨 Contrato de Eventos — Event Bus V2

> Documentación de todos los eventos publicados y consumidos por el microservicio `identidad-finanzas`.
> Generado como parte de la implementación V2 del Event Bus con patrón Outbox/Inbox.

---

## Arquitectura general

```
microservicio-reservas-booking  ──────►  [RabbitMQ Exchange: reservas.events]
                                               │
                        ┌──────────────────────┼────────────────────────────┐
                        ▼                      ▼                            ▼
             process-payment            refund-payment              issue-invoice
                consumer                  consumer                   consumer
                        │                      │                            │
                        └──────────────────────┴────────────────────────────┘
                                               │
                                    [Outbox → Publisher]
                                               │
                              ┌────────────────┴────────────────┐
                              ▼                                  ▼
                  [Exchange: pagos.events]           [Exchange: facturas.events]
```

---

## Eventos CONSUMIDOS

### 1. `reserva.pagos.procesar`
**Exchange:** `reservas.events` (topic)  
**Routing Key:** `reserva.pagos.procesar`  
**Consumer:** [`ProcessPaymentConsumer`](./src/business/event-bus/consumers/process-payment.consumer.ts)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `eventId` | `string (UUID)` | Identificador único del evento (idempotencia) |
| `eventType` | `string` | `"reserva.pagos.procesar"` |
| `occurredAt` | `string (ISO 8601)` | Timestamp del evento |
| `payload.reservaId` | `string` | ID de la reserva |
| `payload.usuarioId` | `string` | ID del usuario que reservó |
| `payload.monto` | `number` | Monto a cobrar (en USD) |
| `payload.metodoPagoId` | `string` | ID del método de pago registrado |

**Respuesta en caso de éxito:** publica `pago.procesado`  
**Respuesta en caso de error de dominio:** publica `pago.fallido`

---

### 2. `reserva.pagos.reembolsar`
**Exchange:** `reservas.events` (topic)  
**Routing Key:** `reserva.pagos.reembolsar`  
**Consumer:** [`RefundPaymentConsumer`](./src/business/event-bus/consumers/refund-payment.consumer.ts)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `eventId` | `string (UUID)` | Identificador único del evento |
| `eventType` | `string` | `"reserva.pagos.reembolsar"` |
| `occurredAt` | `string (ISO 8601)` | Timestamp del evento |
| `payload.reservaId` | `string` | ID de la reserva a reembolsar |
| `payload.pagoId` | `string` | ID del pago original |
| `payload.motivo` | `string` | Razón del reembolso |

**Respuesta en caso de éxito:** publica `pago.reembolsado`  
**Respuesta en caso de error de dominio:** publica `pago.reembolso.fallido`

---

### 3. `reserva.facturas.emitir`
**Exchange:** `reservas.events` (topic)  
**Routing Key:** `reserva.facturas.emitir`  
**Consumer:** [`IssueInvoiceConsumer`](./src/business/event-bus/consumers/issue-invoice.consumer.ts)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `eventId` | `string (UUID)` | Identificador único del evento |
| `eventType` | `string` | `"reserva.facturas.emitir"` |
| `occurredAt` | `string (ISO 8601)` | Timestamp del evento |
| `payload.reservaId` | `string` | ID de la reserva |
| `payload.usuarioId` | `string` | ID del usuario |
| `payload.monto` | `number` | Monto de la factura |

**Respuesta en caso de éxito:** publica `factura.emitida`  
**Respuesta en caso de error de dominio:** publica `factura.fallida`

---

## Eventos PUBLICADOS

### `pago.procesado`
**Exchange:** `pagos.events` (topic)  
**Routing Key:** `pago.procesado`  
**Publicado por:** `ProcessPaymentConsumer` → `OutboxService` → `OutboxPublisherService`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `eventId` | `string (UUID)` | ID único del evento publicado |
| `eventType` | `string` | `"pago.procesado"` |
| `occurredAt` | `string (ISO 8601)` | Timestamp |
| `payload.pagoId` | `string` | ID del pago creado |
| `payload.reservaId` | `string` | ID de la reserva |
| `payload.monto` | `number` | Monto cobrado |

---

### `pago.fallido`
**Exchange:** `pagos.events` (topic)  
**Routing Key:** `pago.fallido`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `eventId` | `string (UUID)` | ID único del evento |
| `payload.reservaId` | `string` | ID de la reserva |
| `payload.motivo` | `string` | Descripción del error de dominio |

---

### `pago.reembolsado`
**Exchange:** `pagos.events` (topic)  
**Routing Key:** `pago.reembolsado`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `eventId` | `string (UUID)` | ID único del evento |
| `payload.pagoId` | `string` | ID del pago reembolsado |
| `payload.reservaId` | `string` | ID de la reserva |

---

### `pago.reembolso.fallido`
**Exchange:** `pagos.events` (topic)  
**Routing Key:** `pago.reembolso.fallido`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `eventId` | `string (UUID)` | ID único del evento |
| `payload.pagoId` | `string` | ID del pago que no pudo reembolsarse |
| `payload.motivo` | `string` | Razón del fallo |

---

### `factura.emitida`
**Exchange:** `facturas.events` (topic)  
**Routing Key:** `factura.emitida`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `eventId` | `string (UUID)` | ID único del evento |
| `payload.facturaId` | `string` | ID de la factura emitida |
| `payload.reservaId` | `string` | ID de la reserva |
| `payload.monto` | `number` | Monto facturado |

---

### `factura.fallida`
**Exchange:** `facturas.events` (topic)  
**Routing Key:** `factura.fallida`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `eventId` | `string (UUID)` | ID único del evento |
| `payload.reservaId` | `string` | ID de la reserva |
| `payload.motivo` | `string` | Razón del fallo |

---

## Formato del Envelope (todos los eventos)

Todos los mensajes siguen la estructura `EventEnvelope`:

```typescript
interface EventEnvelope<T = unknown> {
  eventId: string;        // UUID v4 — garantiza idempotencia
  eventType: string;      // Routing key del evento
  occurredAt: string;     // ISO 8601 timestamp
  payload: T;             // Cuerpo específico del evento
}
```

---

## Patrones de resiliencia implementados

| Patrón | Implementación |
|--------|---------------|
| **Idempotencia (Inbox)** | Antes de procesar, se verifica `eventId` en tabla `inbox_events` |
| **Garantía de entrega (Outbox)** | Eventos se guardan en `outbox_events` antes de publicar a RabbitMQ |
| **Atomic transaction** | `InboxService.tryMarkProcessed()` + lógica de dominio dentro de `$transaction` |
| **Dead Letter Queue** | Configurar `x-dead-letter-exchange` en RabbitMQ (pendiente de infra compartida) |
| **Correlation ID** | Cada mensaje lleva `x-correlation-id` en headers para trazabilidad |

---

## Variables de entorno requeridas

```env
RABBITMQ_URL=amqp://user:pass@localhost:5672
```

> Los exchanges y queues se crean automáticamente al arrancar la aplicación gracias al módulo `EventBusModule`.
