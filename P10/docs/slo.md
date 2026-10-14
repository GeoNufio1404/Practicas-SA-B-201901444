# SLO de PrintHub

Dos objetivos expresados desde la experiencia del usuario: **poder comprar** y **que la tienda
responda rápido**. Ambos se miden en el `api-gateway`, la puerta por la que entra el usuario
(Ingress → gateway): lo que ve el gateway es lo que vive el usuario, incluidos los fallos de
los servicios de atrás, que el gateway devuelve como 5xx.

Manifiesto: [`observability/slo-printhub.yaml`](https://github.com/GeoNufio1404/software-avanzado-gitops/blob/main/observability/slo-printhub.yaml)
en el repositorio GitOps (`PrometheusRule` `slo-printhub`, namespace `observability`).

| SLO | Qué promete al usuario | SLI | Objetivo | Ventana |
|---|---|---|---|---|
| **1. Crear pedidos funciona** | "Cuando hago un pedido, se registra" | % de `POST /api/ordenes` respondidos sin 5xx | **99 %** | 28 días móviles |
| **2. La tienda responde rápido** | "La tienda no se queda pensando" | % de peticiones `/api/*` respondidas en ≤ 0.5 s | **99 %** | 28 días móviles |

## Por qué esos números

### SLO 1 — 99 % de pedidos sin error

- **Por qué este SLI:** crear el pedido es la acción que genera ingreso; si falla, la venta se pierde.
  Solo cuentan los 5xx (culpa del sistema). Un 400 o un 404 son errores del cliente y no consumen
  presupuesto.
- **Por qué 99 % y no 99.9 %:** 99.9 % deja 40 min de fallo total en 28 días. La plataforma tiene
  MySQL y RabbitMQ en **una sola réplica** (puntos únicos de fallo documentados en P9) y una
  reconstrucción completa midió **RTO 23 min** (objetivo declarado: 45 min). Un solo incidente de
  ese tipo agotaría el presupuesto de 99.9 %: sería un objetivo que la arquitectura actual no
  puede cumplir. 99 % deja ~6.7 h de fallo total en 28 días: cubre una reconstrucción y varios
  despliegues abortados, y sigue siendo exigente (1 de cada 100 pedidos).
- **Por qué no 95 %:** 1 de cada 20 pedidos perdido no es aceptable para una tienda; el usuario lo
  notaría y dejaría de comprar.

### SLO 2 — 99 % de peticiones en ≤ 0.5 s

- **Por qué 0.5 s:** hasta medio segundo la interfaz se percibe fluida; por encima, el usuario nota
  la espera. Es también el umbral que ya usaba el canary (P9) y el que usa el análisis por métricas
  (P10): la promoción y el SLO miden lo mismo.
- **Por qué 99 %:** en operación normal se midió **p99 = 69 ms** y **99.92 %** de peticiones bajo
  0.5 s (13/10/2026, 4 peticiones/s). Con 95 % (el número inicial de la hoja de ruta) el objetivo
  nunca estaría en riesgo y sus alertas no avisarían de nada. 99 % deja margen sobre lo medido
  y aun así detecta una degradación real (por ejemplo, un servicio que pasa a tardar 1 s en el
  2 % de las peticiones).
- **Por qué medir porcentaje y no el p95:** el SLO cuenta peticiones buenas/totales, lo que permite
  calcular presupuesto de error; un percentil no se puede sumar entre ventanas.

### Ventana de 28 días

Cuatro semanas exactas: cada ventana tiene la misma cantidad de lunes, fines de semana, etc., así
que el SLI no cambia solo por el calendario (a diferencia de un mes de 30 o 31 días).

## Reglas de registro

Para cada SLO (`<slo>` = `pedidos_errores` o `latencia_lentas`):

| Regla | Para qué |
|---|---|
| `slo:<slo>:ratio_rate{5m,30m,1h,6h}` | Fracción de peticiones malas en cada ventana; las usan las alertas |
| `slo:<slo>:ratio_rate28d` | Fracción mala en la ventana del SLO |
| `slo:{pedidos,latencia}:sli_28d` | **Indicador**: fracción buena en 28 días (lo que se compara con el objetivo) |
| `slo:{pedidos,latencia}:presupuesto_consumido_28d` | **Presupuesto consumido**: 0 = intacto, 1 = agotado |
| `slo:{pedidos,latencia}:objetivo` | El objetivo (0.99) para el tablero |

## Alertas

Alertas **por consumo del presupuesto**, nunca por umbral instantáneo, con el método multiventana del
libro *Site Reliability Engineering* de Google. Una alerta salta solo si el presupuesto se quema rápido
en una ventana larga (evita ruido por picos aislados) **y** en una corta (deja de sonar en cuanto el
problema se corrige).

| Alerta | Condición | Severidad | Qué significa | Runbook |
|---|---|---|---|---|
| `PedidosPresupuestoQuemaRapida` | burn rate > 14.4 en 1 h y en 5 min | page | 2 % del presupuesto en 1 h: se agota en < 2 días | [runbook](runbooks/PedidosPresupuestoQuemaRapida.md) |
| `PedidosPresupuestoQuemaLenta` | burn rate > 6 en 6 h y en 30 min | ticket | 5 % en 6 h: se agota en < 5 días | [runbook](runbooks/PedidosPresupuestoQuemaLenta.md) |
| `LatenciaPresupuestoQuemaRapida` | burn rate > 14.4 en 1 h y en 5 min | page | ídem para la latencia | [runbook](runbooks/LatenciaPresupuestoQuemaRapida.md) |
| `LatenciaPresupuestoQuemaLenta` | burn rate > 6 en 6 h y en 30 min | ticket | ídem para la latencia | [runbook](runbooks/LatenciaPresupuestoQuemaLenta.md) |

**Burn rate** = fracción mala observada / fracción mala permitida (1 %). Burn rate 1 gasta el
presupuesto exactamente en 28 días.

**Tiempo de detección esperado** (alerta rápida, con `for: 1m`): si el 100 % de los pedidos falla,
la ventana de 1 h cruza 14.4 % a los ~8.6 min; si falla el 30 %, a los ~29 min. Es deliberado: un
pico de 2 minutos no debe despertar a nadie, una caída sostenida sí.

**Alertas eliminadas:** `kube-prometheus-stack` trae ~150 reglas por defecto (CPU, pods reiniciados,
disco, etc.). Se desactivaron (`defaultRules.create: false`): son umbrales instantáneos sobre la
infraestructura que no dicen si el usuario está afectado. Esas señales se ven en el tablero
(fila Saturación) para diagnosticar, no para despertar a nadie.

## Límites conocidos

- La ventana de 28 días es nominal: Prometheus guarda 3 días (`retention: 3d`) y se pierde al
  reconstruir el clúster, así que el "presupuesto consumido" corresponde al periodo observado.
- Solo se mide en el gateway: un fallo del flujo asíncrono (RabbitMQ → figuras → materiales) no
  afecta el SLO 1 porque el pedido ya se registró (respuesta 202); se ve en los registros y trazas.
