# LatenciaPresupuestoQuemaRapida

| | |
|---|---|
| **Severidad** | page: atender de inmediato, a cualquier hora |
| **SLO** | 2. La tienda responde rápido (99 % de peticiones `/api/*` en ≤ 0.5 s, 28 días) |
| **Condición** | Fracción de peticiones con más de 0.5 s > 14.4 % en la última hora **y** en los últimos 5 min |

## Qué significa y por qué amerita intervención

Más de 1 de cada 7 peticiones tarda más de medio segundo, de forma sostenida. Para el usuario la
tienda está "trabada": reintenta, abandona la compra o duplica pedidos. A este ritmo el presupuesto
de latencia de 28 días se agota en menos de 2 días. La lentitud suele preceder a los errores
(timeouts), así que intervenir ahora evita que salte también la alerta de pedidos.

## Diagnóstico (objetivo: llegar a la causa en < 3 min)

Acceso a Grafana y recorrido completo: [README](README.md).

1. **¿Quién frena?** Fila *Latencia* → *¿Qué servicio agrega la demora? (p95 por servicio)*.
   - Solo sube el gateway → demora dentro del gateway (código, configuración, CPU).
   - Sube también un servicio de atrás → ese servicio es el origen.
2. **¿Falta de recursos?** Fila *Saturación*: CPU cerca del límite o throttling alto en ese servicio
   explica la latencia aunque no haya errores.
3. **¿En qué paso se va el tiempo?** Explore → Tempo, buscar trazas lentas:
   ```traceql
   { resource.service.name = "api-gateway" && duration > 500ms }
   ```
   En la traza, el span más largo indica el salto; *Logs for this span* muestra sus registros
   (`duration_ms`, versión y pod).

## Mitigación

| Causa encontrada | Acción |
|---|---|
| Versión o configuración nueva | `kubectl argo rollouts abort sa-platform-api-gateway -n sa-p9` y revertir en el repo GitOps |
| CPU al límite / throttling | Subir réplicas o `resources.limits` en `values-gke.yaml` (PR en GitOps); el HPA escala hasta 5 réplicas |
| Servicio de atrás lento | Revisar sus pods y registros; si es MySQL/RabbitMQ (una sola réplica), ver `kubectl top pod -n sa-p9` y sus eventos |

## Cierre

Se apaga sola cuando la ventana de 5 min baja de 14.4 %. Confirmar en *¿Cuánto espera un usuario?*
que el p99 volvió bajo 0.5 s.
