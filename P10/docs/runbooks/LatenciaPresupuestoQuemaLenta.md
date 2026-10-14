# LatenciaPresupuestoQuemaLenta

| | |
|---|---|
| **Severidad** | ticket: atender en horario laboral (mismo día) |
| **SLO** | 2. La tienda responde rápido (99 % de peticiones `/api/*` en ≤ 0.5 s, 28 días) |
| **Condición** | Fracción de peticiones con más de 0.5 s > 6 % en las últimas 6 h **y** en los últimos 30 min |

## Qué significa y por qué amerita intervención

La tienda se volvió más lenta de forma gradual y sostenida. A este ritmo el presupuesto de latencia
se agota en menos de 5 días. Las causas típicas son acumulativas (datos que crecen, consultas sin
índice, memoria que sube, más tráfico con los mismos recursos): no se arreglan solas y empeoran.

## Diagnóstico

1. Tablero, rango de 24 h: *¿Cuánto espera un usuario?* y *p95 por servicio*. ¿La latencia crece
   junto con *¿Cuántas peticiones por segundo...?* (capacidad) o sin cambio de tráfico (datos o código)?
2. Fila *Saturación*: memoria creciendo sin bajar (fuga) o throttling sostenido.
3. Tempo, comparar una traza lenta con una normal de la misma ruta:
   ```traceql
   { resource.service.name = "api-gateway" && span.http.route = "/api/ordenes" && duration > 500ms }
   ```
   ¿Qué span creció? (p. ej. la consulta GraphQL a figuras, o la propia escritura en SQLite de ordenes).
4. Registros del servicio señalado, ordenados por `duration_ms`:
   ```logql
   {service_name="ordenes-service"} | duration_ms > 500
   ```

## Mitigación

- Capacidad: más réplicas o límites en `values-gke.yaml` (PR en GitOps).
- Datos o código: issue con la traza y la consulta como evidencia; corrección por el pipeline
  (tag → canary con análisis por métricas).

## Cierre

Cerrar cuando la ventana de 30 min esté bajo 6 % y la corrección esté en Git.
