# Microservicio Identidad & Finanzas

Microservicio NestJS encargado de la gestión de **pagos**, **reembolsos** y **facturación** dentro de la plataforma de reservas.

---

## 🚀 Inicio rápido

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run start:dev

# Build producción
npm run build

# Tests unitarios
npm run test
```

---

## 📋 Variables de entorno

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/finanzas_db
RABBITMQ_URL=amqp://user:pass@localhost:5672
JWT_SECRET=tu_secreto_jwt
NODE_ENV=development
```

---

## 📨 Event Bus V2

Este microservicio implementa el patrón **Outbox/Inbox** sobre RabbitMQ para garantizar consistencia eventual entre microservicios.

### Eventos consumidos
| Evento | Descripción |
|--------|-------------|
| `reserva.pagos.procesar` | Procesa el pago de una reserva |
| `reserva.pagos.reembolsar` | Reembolsa un pago existente |
| `reserva.facturas.emitir` | Emite la factura de una reserva |

### Eventos publicados
| Evento | Exchange |
|--------|----------|
| `pago.procesado` | `pagos.events` |
| `pago.fallido` | `pagos.events` |
| `pago.reembolsado` | `pagos.events` |
| `factura.emitida` | `facturas.events` |

> 📖 Ver documentación completa en [`EVENTS.md`](./EVENTS.md)

---

## 📊 Observabilidad

| Endpoint | Descripción |
|----------|-------------|
| `GET /health` | Health check general |
| `GET /health/rabbitmq` | Estado de conexión RabbitMQ |
| `GET /metrics` | Métricas en formato Prometheus |

> 📖 Ver guía completa en [`OBSERVABILITY.md`](./OBSERVABILITY.md)

---

## 🧪 Tests

```bash
# Correr todos los tests
npm run test

# Con cobertura
npm run test:cov
```

### Cobertura actual
- ✅ `ProcessPaymentConsumer` — 8 casos de prueba
- ✅ `RefundPaymentConsumer` — 7 casos de prueba  
- ✅ `IssueInvoiceConsumer` — 7 casos de prueba

---

## 🗂 Estructura del proyecto

```
src/
├── api/
│   └── controllers/v1/
│       ├── HealthController.ts      # /health
│       └── MetricsController.ts     # /metrics
├── business/
│   └── event-bus/
│       ├── consumers/               # Consumers RabbitMQ (Inbox pattern)
│       ├── outbox/                  # Outbox pattern + publisher
│       ├── inbox/                   # Idempotencia
│       ├── envelope.ts              # Tipo EventEnvelope<T>
│       ├── event-types.ts           # Exchanges y Routing Keys
│       └── event-bus.module.ts      # Módulo principal
├── common/
│   └── observability/
│       ├── metrics.service.ts       # Contadores Prometheus
│       ├── structured-logger.ts     # JSON logging
│       ├── trace-context.ts         # AsyncLocalStorage para correlationId
│       └── trace.middleware.ts      # Extrae x-correlation-id de headers HTTP
└── data-access/
    └── repositories/                # Prisma repositories
```

---

## 📚 Documentación adicional

- [`EVENTS.md`](./EVENTS.md) — Catálogo de eventos del Event Bus
- [`OBSERVABILITY.md`](./OBSERVABILITY.md) — Health checks, métricas y logging
