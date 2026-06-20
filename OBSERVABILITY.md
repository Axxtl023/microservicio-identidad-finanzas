# 📊 Guía de Observabilidad — Event Bus V2

> Documentación de los endpoints de health, métricas y logging estructurado implementados en el microservicio `identidad-finanzas`.

---

## Endpoints disponibles

### Health Checks

#### `GET /health`
Verifica el estado general de la aplicación.

**Respuesta exitosa (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-06-20T23:00:00.000Z",
  "service": "microservicio-identidad-finanzas"
}
```

#### `GET /health/rabbitmq`
Verifica la conectividad con RabbitMQ.

**Respuesta exitosa (200):**
```json
{
  "status": "ok",
  "rabbitmq": "connected",
  "url": "amqp://***:***@host:5672"
}
```

**Respuesta en error (503):**
```json
{
  "status": "error",
  "rabbitmq": "disconnected",
  "error": "Connection refused"
}
```

---

### Métricas (formato Prometheus)

#### `GET /metrics`
Devuelve métricas en texto plano compatible con Prometheus scraping.

**Content-Type:** `text/plain; version=0.0.4; charset=utf-8`

**Ejemplo de respuesta:**
```
# HELP events_processed_total Total de eventos procesados exitosamente
# TYPE events_processed_total counter
events_processed_total{eventType="reserva.pagos.procesar"} 42
events_processed_total{eventType="reserva.pagos.reembolsar"} 10
events_processed_total{eventType="reserva.facturas.emitir"} 37

# HELP events_failed_total Total de eventos fallidos
# TYPE events_failed_total counter
events_failed_total{eventType="reserva.pagos.procesar"} 2

# HELP events_published_total Total de eventos publicados al outbox
# TYPE events_published_total counter
events_published_total{eventType="pago.procesado"} 42
events_published_total{eventType="pago.fallido"} 2
```

---

## Logging Estructurado

En producción (`NODE_ENV=production` o `STRUCTURED_LOG=true`), los logs se emiten en formato JSON:

```json
{
  "timestamp": "2026-06-20T23:00:01.234Z",
  "level": "log",
  "context": "ProcessPaymentConsumer",
  "message": "Evento procesado exitosamente",
  "correlationId": "abc-123-def-456"
}
```

En desarrollo, los logs incluyen el `correlationId` coloreado en la salida estándar.

---

## Correlation ID (Trazabilidad)

Cada request HTTP y cada mensaje RabbitMQ recibe un `correlationId` único que se propaga a través de todos los logs del request/evento.

- **HTTP:** El `TraceMiddleware` extrae el header `x-correlation-id` o genera uno nuevo con `uuid v4`.
- **RabbitMQ consumers:** Cada consumer envuelve su lógica con `runWithCorrelationId()` para propagar el ID a través de `AsyncLocalStorage`.

### Ejemplo de headers HTTP:
```
x-correlation-id: 550e8400-e29b-41d4-a716-446655440000
```

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NODE_ENV` | Entorno de ejecución | `production` |
| `STRUCTURED_LOG` | Forzar JSON logs fuera de producción | `true` |
| `RABBITMQ_URL` | URL de conexión a RabbitMQ | `amqp://user:pass@host:5672` |

---

## Integración con Prometheus + Grafana (sugerida)

Agregar al `prometheus.yml`:
```yaml
scrape_configs:
  - job_name: 'identidad-finanzas'
    static_configs:
      - targets: ['identidad-finanzas-service:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```
