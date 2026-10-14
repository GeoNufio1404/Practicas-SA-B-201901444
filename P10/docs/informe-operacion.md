# Informe de operación — PrintHub (P10)

Pruebas del 14/10/2026 en el clúster GKE `sa-p9`, namespace `sa-p9`, con el generador de tráfico
constante (k6, ~4 peticiones/s en el gateway). Horas en America/Guatemala (UTC−6). Evidencias en
[`evidencias/`](../evidencias/).

## 1. SLO declarados

| SLO | Objetivo | Ventana |
|---|---|---|
| **Crear pedidos funciona**: `POST /api/ordenes` respondido sin 5xx | **99 %** | 28 días móviles |
| **La tienda responde rápido**: peticiones `/api/*` en ≤ 0.5 s | **99 %** | 28 días móviles |

- **Pedidos al 99 % y no al 99.9 %:** con MySQL y RabbitMQ en una sola réplica y un RTO medido de
  23 min (P9), un único incidente agotaría los 40 min que deja 99.9 %. El 99 % (~6.7 h en 28 días)
  cubre una reconstrucción. 95 % sería perder 1 de cada 20 ventas.
- **Latencia en 0.5 s al 99 %:** en operación normal se midió p99 = 69 ms y 99.92 % bajo 0.5 s. Con
  95 % el objetivo nunca estaría en riesgo. Es además el mismo umbral que decide el canary.
- **28 días:** cuatro semanas exactas, así cada ventana tiene los mismos días de la semana.

Detalle en [`slo.md`](slo.md).

## 2. Fallo inducido

Dos fallos, ambos por commit al repositorio GitOps (nunca con `kubectl`) y distintos del de P8:

1. **Canary:** `FALLO_ORDENES_TASA=0.3` en el `api-gateway` (commit `447b8d6`, 11:20:41). La
   versión candidata responde 500 en el 30 % de las peticiones a `/api/ordenes`.
2. **Síntoma → causa:** `FIGURAS_SERVICE_URL` de `ordenes-service` apuntando a una ruta inexistente
   (`/graphql-v2`, commit `ebd6068`, 12:59:45). `figuras-service` responde 404, `ordenes-service`
   no obtiene el precio y cada creación de pedido termina en 502. Es un Deployment, así que el
   canary no lo frena: el fallo llega a todo el tráfico, como un error de configuración real.

## 3. Tiempo de detección

| Fallo | Inicio | Primera señal | Detección |
|---|---|---|---|
| Canary | 11:21:19, canary al 20 % | **11:22:11**, 1.ª medición del AnalysisRun: tasa de error **10.1 %** (límite 1 %) | **52 s** |
| Síntoma → causa | 13:00:39, pods nuevos de ordenes listos | **13:00:50**, `printhub_pedidos_rechazados_total{motivo="figuras_no_disponible"}` en 15.7/min | **11 s** (métrica) |
| | | **13:10:58**, alerta `PedidosPresupuestoQuemaRapida` en `firing` (`pending` 13:09:54) | **10 min 19 s** (alerta) |

La alerta tardó lo esperado: con 100 % de error la ventana de 1 h cruza el burn rate 14.4 a los
~8.6 min, más el `for: 1m`. Fuentes: `fallo-canary-20261014-112026.log` y
`sintoma-causa-20261014-130001.log`.

## 4. Recorrido hasta la causa

Del `firing` (13:10:58) al registro del error (13:13): **~2 min**, solo con Grafana:

1. Tablero "Operación PrintHub", panel **¿Hay algo que exija intervención ahora?**:
   `PedidosPresupuestoQuemaRapida` activa; el panel de burn rate muestra la quema muy por encima de 14.4.
2. **¿Qué servicio está devolviendo errores 5xx?**: 5xx en `api-gateway` y `ordenes-service`, ninguno
   en `figuras-service`. El fallo está entre ordenes y figuras, no dentro de figuras.
3. **¿Qué peticiones fallaron?**: se abre una traza con error en Tempo. `POST /api/ordenes` →
   `ordenes-service` → llamada HTTP a `figuras-service` con **404**.
4. Desde el span, **Logs for this span** abre Loki filtrado por el `trace_id`. El registro de
   `ordenes-service` dice `No se pudo consultar figuras-service: figuras-service respondió 404`.
   Con el 404 de una ruta que figuras no expone, la causa es la URL configurada en ordenes.

## 5. Tiempo de recuperación

- **Canary:** **automático**, lo resolvió Argo Rollouts. La 2.ª medición fallida (13.6 %, 11:23:11)
  supera `failureLimit: 1` y a las 11:23:17 el Rollout aborta y deja el 100 % en la versión estable.
  **2 min 36 s** desde el push y **1 min 58 s** desde que el canary recibió tráfico, sin intervención.
  AnalysisRun `sa-platform-api-gateway-784dcddfdd-3-1` (`Failed`).
- **Síntoma → causa:** lo resolvió el **operador** revirtiendo el commit (`71ec110`, 13:36:58). La
  reversión se retrasó a propósito para terminar la grabación. Del push al estado estable (0
  pedidos rechazados en el último minuto, 13:38:22): **1 min 24 s**. La alerta se resolvió sola
  a las 13:42:26.

## 6. Alerta faltante o sobrante

- **Faltante: una alerta de caída total.** La métrica de negocio mostró el problema a los 11 s y la
  alerta llegó a los 10 min. La quema rápida (ventanas de 1 h y 5 min) es correcta para fallos
  parciales, pero ante un 100 % de pedidos fallando tarda lo mismo. Propuesta: un tercer nivel,
  también por presupuesto, con **burn rate > 72 en 5 min y en 1 min** (el 72 % de los pedidos
  fallando). Con caída total salta en ~4–5 min, y un pico de 1–2 min (≤ 40 % en 5 min) no la
  dispara. Gasta menos del 1 % del presupuesto antes de avisar.
- **Faltante: el flujo asíncrono.** El 13/10 el consumidor de RabbitMQ no se reconectó y los
  pedidos quedaron en `pendiente` sin que ningún SLO lo notara (el pedido ya respondió 202). Se
  corrigió en v1.1.1, pero falta una señal: pedidos `pendiente` con más de N minutos de antigüedad.
- **Sobrante: ninguna.** En las pruebas no sonó ninguna alerta sin fallo real. Las ~150 reglas por
  defecto del chart se eliminaron por ser umbrales instantáneos de infraestructura.
