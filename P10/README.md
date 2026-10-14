# Práctica 10 — Observabilidad y operación (del síntoma a la causa)

La plataforma PrintHub de P9 ahora tiene las tres señales: métricas, trazas y registros
correlacionados. Con ellas se gobiernan el canary y las alertas.

- **Instrumentación:** OpenTelemetry en `api-gateway`, `ordenes-service` y `figuras-service`.
- **Stack:** Prometheus, Alertmanager, Grafana, Loki, Tempo y el OpenTelemetry Collector,
  desplegados por ArgoCD desde el repositorio GitOps.
- **Canary:** el `api-gateway` se promueve o se revierte según su tasa de error y su p95,
  medidos en Prometheus sobre el tráfico real de los pods canary.
- **SLO:** dos SLO con alertas por consumo del presupuesto de error, cada una con su runbook.

## Tabla de enlaces

| Ítem | Enlace o dato |
|---|---|
| Repositorio de código | https://github.com/GeoNufio1404/Practicas-SA-B-201901444 |
| Repositorio GitOps | https://github.com/GeoNufio1404/software-avanzado-gitops |
| Servicios instrumentados | `api-gateway`, `ordenes-service` y `figuras-service`, en el namespace **`sa-p9`** (stack de observabilidad en `observability`). Código en [`servicios/`](servicios/) |
| AnalysisTemplate por métricas | **`sa-platform-api-gateway-metricas`** (provider `prometheus`) — [`charts/sa-platform/charts/api-gateway/templates/analysis.yaml`](https://github.com/GeoNufio1404/software-avanzado-gitops/blob/main/charts/sa-platform/charts/api-gateway/templates/analysis.yaml). Lo usa el Rollout `sa-platform-api-gateway` en cada paso (20/50/80 %): [`deployment.yaml`](https://github.com/GeoNufio1404/software-avanzado-gitops/blob/main/charts/sa-platform/charts/api-gateway/templates/deployment.yaml) |
| Consultas del análisis | Tasa de 5xx < 1 % y p95 < 0.5 s, medidos **solo en los pods canary**. Expresiones exactas en [Consultas del análisis](#consultas-del-análisis) |
| SLO declarados | **1. Crear pedidos funciona:** 99 % de `POST /api/ordenes` sin 5xx, ventana de 28 días. **2. La tienda responde rápido:** 99 % de peticiones `/api/*` en ≤ 0.5 s, ventana de 28 días. Justificación en [`docs/slo.md`](docs/slo.md) |
| Reglas de alerta | `PrometheusRule` `slo-printhub` — [`observability/slo-printhub.yaml`](https://github.com/GeoNufio1404/software-avanzado-gitops/blob/main/observability/slo-printhub.yaml) (16 reglas de registro y 4 alertas; runbooks en [`docs/runbooks/`](docs/runbooks/)) |
| Tablero | [`dashboards/operacion-printhub.json`](dashboards/operacion-printhub.json) (exportado de Grafana). Captura en operación: [`dashboards/captura-operacion.png`](dashboards/captura-operacion.png) (14/10, tras el incidente síntoma→causa: pedidos rechazados de 13:00 a 13:38, recuperación y burn rate bajando) |
| Reversión por métricas | Rollout **`sa-platform-api-gateway`**. AnalysisRun fallido: **`sa-platform-api-gateway-784dcddfdd-3-1`** (tasa de error 10.1 % y 13.6 % con `FALLO_ORDENES_TASA=0.3`; abortado y revertido solo en 2 min 36 s). Evidencia: [`evidencias/fallo-canary-20261014-112026.log`](evidencias/fallo-canary-20261014-112026.log) |
| Recorrido síntoma a causa | [`evidencias/sintoma-causa-20261014-130001.log`](evidencias/sintoma-causa-20261014-130001.log). Alerta `PedidosPresupuestoQuemaRapida` → tablero → traza en Tempo → registro en Loki: **~2 min** (firing 13:10:58, registro del error 13:13). Detección: primera señal a los 11 s, alerta a los 10 min 19 s. Pasos en el [informe](docs/informe-operacion.md#4-recorrido-hasta-la-causa) |
| Video demostrativo | _pendiente_ |

### Consultas del análisis

`{{args.canary-hash}}` es el `pod-template-hash` de la versión candidata
(`podTemplateHashValue: Latest`). El análisis toma una medición por minuto, 3 por paso, y aborta
cuando una métrica falla 2 veces. Sin datos también cuenta como fallo: lo que no se puede medir no
se promueve.

**Tasa de error** (éxito si `< 0.01`):

```promql
(
  sum(rate(printhub_http_request_duration_seconds_count{namespace="sa-p9", app_kubernetes_io_name="api-gateway", rollouts_pod_template_hash="{{args.canary-hash}}", http_response_status_code=~"5.."}[2m]))
  or vector(0)
)
/
sum(rate(printhub_http_request_duration_seconds_count{namespace="sa-p9", app_kubernetes_io_name="api-gateway", rollouts_pod_template_hash="{{args.canary-hash}}"}[2m]))
```

**Latencia p95** (éxito si `< 0.5` s):

```promql
histogram_quantile(0.95,
  sum by (le) (rate(printhub_http_request_duration_seconds_bucket{namespace="sa-p9", app_kubernetes_io_name="api-gateway", rollouts_pod_template_hash="{{args.canary-hash}}"}[2m]))
)
```

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/diagrama-telemetria.md`](docs/diagrama-telemetria.md) | Recorrido de cada señal desde el servicio hasta el tablero, la alerta y el canary |
| [`docs/slo.md`](docs/slo.md) | Los dos SLO, por qué esos números, reglas de registro y alertas |
| [`docs/runbooks/`](docs/runbooks/) | Un runbook por alerta y el recorrido común de síntoma a causa |
| [`docs/limites.md`](docs/limites.md) | Lo que la instrumentación no ve ni decide, con evidencia y mejora propuesta |
| [`docs/informe-operacion.md`](docs/informe-operacion.md) | Informe de operación (plantilla 4.2): SLO, fallos inducidos, tiempos de detección, recorrido y recuperación, alertas faltantes |

## Evidencias

| Archivo | Qué muestra |
|---|---|
| [`evidencias/bootstrap-20261013-222015.log`](evidencias/bootstrap-20261013-222015.log) | Reconstrucción desde cero con `P9/bootstrap.sh`, incluido el stack de observabilidad |
| [`evidencias/promocion-v1.1.1-20261013-232854.log`](evidencias/promocion-v1.1.1-20261013-232854.log) | Canary de v1.1.1 **abortado y revertido por métricas** (AnalysisRun `sa-platform-api-gateway-8484764d97-2-1`). Los 5xx reales (2.8 % y 1.3 %) venían de ordenes y figuras reiniciándose sin `preStop` |
| [`evidencias/promocion-v1.1.1-reintento-20261013-233915.log`](evidencias/promocion-v1.1.1-reintento-20261013-233915.log) | Con `preStop` corregido, v1.1.1 se promueve 20 → 50 → 80 → 100 % con 0 % de error y p95 de 24–43 ms |
| [`evidencias/bootstrap-20261014-095633.log`](evidencias/bootstrap-20261014-095633.log) | Reconstrucción del 14/10: se agota el tiempo porque `Prometheus`/`Alertmanager` (wave 0) esperaban al operador (wave 1). Corregido en GitOps `d0333a1` |
| [`evidencias/bootstrap-20261014-105557.log`](evidencias/bootstrap-20261014-105557.log) | Verificación tras la corrección: 13 Applications `Synced/Healthy`, Kyverno, ExternalSecrets, restauración de Velero e Ingress (no regresión de P9) |
| [`evidencias/promocion-v1.1.2-20261014-105557.log`](evidencias/promocion-v1.1.2-20261014-105557.log) | v1.1.2 (release completa por el pipeline) promovida por métricas: 3 AnalysisRun `Successful` |
| [`evidencias/fallo-canary-20261014-112026.log`](evidencias/fallo-canary-20261014-112026.log) | **Fallo inducido en el canary:** AnalysisRun `sa-platform-api-gateway-784dcddfdd-3-1` `Failed` y Rollout revertido sin intervención |
| [`evidencias/sintoma-causa-20261014-130001.log`](evidencias/sintoma-causa-20261014-130001.log) | **Síntoma a causa:** URL errónea de figuras en ordenes; inicio, primera señal, alerta, causa, reversión y recuperación con marca de tiempo |

Los registros los genera [`pruebas/seguir-rollout.sh`](pruebas/seguir-rollout.sh). El script
anota con marca de tiempo cada paso del Rollout y deja cada medición de sus AnalysisRun.

## Estructura

```
P10/
├── servicios/               api-gateway, ordenes-service, figuras-service instrumentados
│   └── <servicio>/src/
│       ├── instrumentacion.mjs   SDK de OpenTelemetry (cargado con node --import)
│       └── observabilidad.js     logger pino JSON y métricas HTTP
├── dashboards/              tablero exportado de Grafana
├── docs/                    SLO, runbooks, diagrama y límites
├── pruebas/                 seguir-rollout.sh
├── evidencias/              registros con marcas de tiempo
└── HOJA_DE_RUTA.md          plan de trabajo y bitácora
```

En el repositorio GitOps:

```
apps/kube-prometheus-stack.yaml, loki.yaml, tempo.yaml, otel-collector.yaml   wave 0
apps/observability-config.yaml   wave 1 → observability/ (PrometheusRule + tablero)
charts/sa-platform/              env OTEL_*, PodMonitor, AnalysisTemplate, generador de tráfico
```

El pipeline (`.github/workflows/ci.yaml`) se dispara con un tag `v*.*.*`. Construye las imágenes,
**incluidas las 3 de `P10/servicios/`**, las escanea con Trivy (un CRITICAL corregible bloquea el
push) y abre un PR de versión en el repositorio GitOps. ArgoCD aplica el cambio y el Rollout lo
despliega por canary.

## Cómo levantarlo y consultarlo

```bash
./P9/bootstrap.sh          # clúster + ArgoCD + plataforma + stack de observabilidad (~35 min)

# Grafana -> http://localhost:3000, tablero "Operación PrintHub" (usuario admin)
kubectl port-forward -n observability svc/kube-prometheus-stack-grafana 3000:80
kubectl get secret -n observability kube-prometheus-stack-grafana \
  -o jsonpath='{.data.admin-password}' | base64 -d; echo

# Seguir un despliegue y sus AnalysisRun
./P10/pruebas/seguir-rollout.sh <nombre-evidencia>
```
