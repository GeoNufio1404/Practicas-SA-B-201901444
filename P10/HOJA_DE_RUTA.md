# Hoja de ruta — Práctica 10: Observabilidad y operación (del síntoma a la causa)

> Documento de trabajo para retomar entre sesiones. Marca `[x]` al terminar cada tarea
> y anota en la **Bitácora** (al final) dónde quedaste.
>
> **Objetivo:** instrumentar la plataforma de P9 (que ya conserva el flujo de P8) con métricas,
> trazas y registros correlacionados, y usarlos para gobernar el canary y las alertas.
>
> **Criterio de alcance:** proyecto universitario → solo lo que exige la rúbrica y los requisitos.
> Nada de extras.
>
> **Fechas:** elaboración 08/10 – **15/10/2026**, calificación **17/10/2026**. Tiempo estimado 14 h.

---

## 0. Proyectos de GCP (cuenta compartida)

La cuenta `201901444geovanninufioillescas@gmail.com` ve 3 proyectos activos, todos sobre la **misma cuenta
de facturación** (`01BB3D-2E4DD5-96BEAB`):

| Proyecto | Dueño | Qué contiene | Regla |
|---|---|---|---|
| `project-2cbee419-ed7b-469e-89d` (SA P10 Nufio) | **Nosotros** | Buckets `sa-p9-tfstate-201901444`, `sa-p9-velero-201901444`; Artifact Registry `sa-p6` y `sa-p9`; 6 secretos `sa-p9-*`; WIF de GitHub. Sin clúster (apagado) | **Único proyecto donde se trabaja** |
| `sa-p9-202100239` (SA P9 Alejandra 202100239) | Ella | Buckets `sa-p9-202100239-tfstate` / `-velero`; secretos `sealed-secrets-*`, `velero-gcp-credentials` | **No tocar** |
| `elevated-range-509623-j8` (Bank USAC) | Nosotros (otro proyecto en curso) | Artifact Registry `bank-usac`, bucket `bank-usac-tfstate-…`, rango IP privado (Cloud SQL) | **No tocar ni borrar nunca** |
| ~~`gen-lang-client-0705142264`~~ (Default Gemini Project) | Nosotros (proyecto anterior) | Solo API Gemini | **Eliminado** el 2026-10-13 (recuperable 30 días con `gcloud projects undelete`) |

**Reglas de seguridad:**
- Todo comando `gcloud` lleva `--project project-2cbee419-ed7b-469e-89d` explícito (los scripts de P9 ya lo hacen).
- Ojo con el prefijo: los recursos de ella también empiezan con `sa-p9-`. Los nuestros terminan en `201901444`.
- Nunca usar filtros de borrado sin `--project` ni `gcloud projects …` de escritura.
- La facturación es compartida: **apagar el clúster** (`P9/pruebas/apagar.sh`) al terminar cada sesión.

---

## 1. Punto de partida (lo que ya tenemos de P9)

| Pieza | Estado en P9 | Qué falta para P10 |
|---|---|---|
| Clúster | GKE `sa-p9` (Terraform, 3 × e2-standard-2), se levanta con `P9/bootstrap.sh` (~25 min) | Posible 4.º nodo por el stack de observabilidad (cuota `E2_CPUS` = 8) |
| GitOps | ArgoCD app-of-apps `root-sa-p9` → repo `software-avanzado-gitops`, sync-waves 0/1/2 | Apps nuevas del stack de observabilidad |
| Entrega progresiva | `Rollout` de `api-gateway`, canary 20/50/80 con `AnalysisTemplate` **tipo Job (k6)** | Cambiar a **análisis `prometheus`** (tasa de error + p95 del canary) |
| Kyverno | 3 políticas `Enforce` limitadas a `sa-p9` | Nada (el stack vive en otro namespace) |
| Pipeline | Tag → build → push → PR al repo GitOps | Contextos de build si el código se mueve a `/P10` |
| Cadena de suministro | **No se hizo en P9** (Trivy/SBOM/Cosign se recortaron) | P10 pide que "siga operando" → ver Pendientes |
| Servicios | Node (gateway, auth, figuras, ordenes) + Python (materiales). Logs con `console.log`, sin métricas ni trazas | Instrumentación OTel en 3 servicios |
| NetworkPolicies | Ingress/egress restringidos por servicio | **Abrir** egress → collector y ingress ← Prometheus |

### Los 3 servicios a instrumentar

Camino síncrono real de una petición de usuario (permite una traza de extremo a extremo):

```
cliente ──▶ api-gateway ──proxy──▶ ordenes-service ──fetch GraphQL──▶ figuras-service
            (Rollout)              POST /ordenes                      precio de la figura
```

- `api-gateway`: es el **Rollout**, sus métricas deciden el canary.
- `ordenes-service`: métricas de negocio (**pedidos creados**, **pedidos rechazados**).
- `figuras-service`: tercer salto de la traza.

---

## 2. Decisiones de arquitectura

| Decisión | Elección | Motivo |
|---|---|---|
| Namespace del stack | `observability` (fuera de Kyverno) | No chocar con `ResourceQuota` ni políticas de `sa-p9` |
| Prometheus + Alertmanager + Grafana | Chart `kube-prometheus-stack` | Trae CRDs `PodMonitor` / `PrometheusRule`, Alertmanager y Grafana en un solo chart |
| Registros | **Loki** (single binary, filesystem) | Requisito; Grafana lo enlaza con las trazas |
| Trazas | **Tempo** (single binary) | Mismo ecosistema Grafana: trace → logs y logs → trace sin plugins |
| Collector | OTel Collector **DaemonSet**: recibe OTLP (trazas → Tempo) y lee logs de los pods con `filelog` (→ Loki vía OTLP) | Un solo componente para trazas y registros |
| Métricas de la app | SDK OTel con **exportador Prometheus en el propio pod** (`:9464/metrics`) + `PodMonitor` | Prometheus conserva la etiqueta `rollouts-pod-template-hash` → se puede consultar **solo el canary** |
| Logs | `pino` en JSON a stdout + `@opentelemetry/instrumentation-pino` (inyecta `trace_id`, `span_id`) | JSON con traza, sin cambiar el flujo de logs |
| Instrumentación | `@opentelemetry/sdk-node` + auto-instrumentaciones (http, express, undici/fetch) cargadas con `--import` | Propagación W3C `traceparent` automática entre los 3 servicios |
| Despliegue | Todo vía Applications de ArgoCD en el repo GitOps (sync-wave 0 operadores, 1 config) | Requisito: "mediante el flujo GitOps, no manual" |
| Tráfico | Deployment `generador-trafico` (k6 constante, bajo) en `sa-p9` | Sin tráfico no hay métricas que analizar; **no** es el análisis (el análisis solo consulta Prometheus) |
| Persistencia del stack | Sin PVC (o PVC pequeño) | Datos de una sesión de demo bastan; se documenta como límite |

---

## 3. Diseño de SLO, alertas y canary

### SLO (expresados desde el usuario)

| SLO | SLI | Objetivo | Ventana | Justificación (a pulir en el informe) |
|---|---|---|---|---|
| **Crear pedidos funciona** | % de `POST /api/ordenes` sin respuesta 5xx | 99 % | 28 días | Es la acción que genera ingreso; 1 % ≈ 7 h de fallo al mes, coherente con 1 réplica de MySQL/RabbitMQ (SPOF del informe DR de P9) |
| **La API responde rápido** | % de peticiones a la API con duración < 500 ms | 95 % | 28 días | 500 ms ya era el umbral del smoke k6 de P9; p95 medido en estable sirve de base |

### Reglas de registro (`PrometheusRule`)
- `sli:ordenes_disponibilidad:ratio_rate{5m,30m,1h,6h}` y `sli:api_latencia:ratio_rate{…}`.
- `slo:…:error_budget_consumido` (sobre la ventana).

### Alertas por consumo del presupuesto (multi-ventana, libro SRE)

| Alerta | Condición | Severidad | ¿Por qué amerita intervención? |
|---|---|---|---|
| `OrdenesPresupuestoQuemaRapida` | burn rate > 14.4 en 1 h **y** 5 m | page | Se agota el 2 % del presupuesto mensual en 1 h |
| `OrdenesPresupuestoQuemaLenta` | burn rate > 6 en 6 h **y** 30 m | ticket | 5 % en 6 h: degradación sostenida |
| `LatenciaPresupuestoQuemaRapida` / `Lenta` | ídem sobre el SLO de latencia | page / ticket | ídem |

Cada una con `annotations.runbook_url` → `https://github.com/GeoNufio1404/Practicas-SA-B-201901444/blob/main/P10/docs/runbooks/<alerta>.md`.
**Nada de alertas por umbral instantáneo** (CPU, pod reiniciado, etc.).

### Canary gobernado por métricas
`AnalysisTemplate` `api-gateway-metricas` (provider `prometheus`), arg `canary-hash` con
`valueFrom.podTemplateHashValue: Latest`:
- **Tasa de error** del canary: `sum(rate(http_server_request_duration_seconds_count{…,http_response_status_code=~"5..",rollouts_pod_template_hash="{{args.canary-hash}}"}[1m])) / sum(rate(…[1m]))` → `successCondition: result[0] < 0.01`
- **p95** del canary: `histogram_quantile(0.95, sum by (le)(rate(…_bucket{…canary…}[1m])))` → `< 0.5`
- `interval: 1m`, `count: 3`, `failureLimit: 1`. Manejar resultado vacío (`NaN`) para que no falle sin tráfico.

### Fallo inducido (distinto al de P8/P9)
Versión `v1.1.1` de `api-gateway` con fallo controlado por variable de entorno
(p. ej. `FALLO_ORDENES=0.3`: 30 % de `POST /api/ordenes` → 500 con error registrado, o +800 ms de latencia).
- **Canary:** se publica por el pipeline → PR → merge → el análisis ve error/p95 del canary → **Abort automático**.
- **Síntoma → causa:** el mismo fallo activado en estable (commit en GitOps) hasta que dispare
  `OrdenesPresupuestoQuemaRapida`; cronometrar alerta → tablero → traza (Tempo) → registro (Loki) < 3 min.

---

## 4. Estructura

```
Practicas-SA-B-201901444/
└── P10/
    ├── README.md                   tabla de enlaces obligatoria (4.1) + minutaje del video
    ├── HOJA_DE_RUTA.md             este archivo
    ├── servicios/                  api-gateway, ordenes-service, figuras-service instrumentados
    ├── instrumentacion/            tracing.mjs común + notas por servicio
    ├── dashboards/operacion.json   JSON exportado de Grafana + captura .png
    ├── docs/
    │   ├── slo.md                  SLO, reglas y justificación
    │   ├── runbooks/<alerta>.md    uno por alerta
    │   ├── informe-operacion.md    6 campos, máx. 2 páginas
    │   ├── diagrama-telemetria.md  servicio → collector → Prometheus/Loki/Tempo → Grafana/Alertmanager
    │   └── preguntas.md            preguntas teóricas
    └── evidencias/                 AnalysisRun fallido, recorrido síntoma→causa con tiempos

software-avanzado-gitops/
├── apps/
│   ├── kube-prometheus-stack.yaml  wave 0
│   ├── loki.yaml, tempo.yaml       wave 0
│   ├── otel-collector.yaml         wave 0
│   └── observability-config.yaml   wave 1 (PodMonitor, PrometheusRule, dashboard ConfigMap, datasources)
├── observability/                  valores de los charts y manifiestos de configuración
└── charts/sa-platform/…            AnalysisTemplate por métricas, env OTel, NetworkPolicies
```

---

## 5. Fases

### Fase 0 — Preparación · 0.5 h
- [x] Identificar proyectos de GCP y el nuestro (sección 0)
- [x] Decidir pendientes (sección 7)
- [x] Copiar los 3 servicios a `P10/servicios/` y apuntar el pipeline ahí
- [x] Paso Trivy en el pipeline (cadena de suministro): build → Trivy (CRITICAL corregible bloquea) → push. `proxy-addr` 2.0.7 (CRITICAL) actualizado a 2.0.8 en los 3 servicios y en `P5/auth-service` (solo lockfile)
- [x] `./P9/bootstrap.sh` (37 min 39 s): 12 Applications `Synced/Healthy`; Kyverno, ExternalSecrets, restauración de MySQL e Ingress OK

### Fase 1 — Stack de observabilidad vía GitOps · 2.5 h
- [x] Apps `kube-prometheus-stack` 91.8.0, `loki` 7.3.0, `tempo` 1.24.4, `otel-collector` 0.173.1 (namespace `observability`, wave 0) — escritas y renderizadas con `helm template`, **sin desplegar**
- [x] Grafana con datasources Prometheus, Loki, Tempo y correlación: Tempo → Loki por `trace_id`; Loki → Tempo con *derived field*
- [x] Prometheus selecciona `PodMonitor`/`PrometheusRule` de cualquier namespace; reglas y tableros por defecto desactivados
- [x] Capacidad: requests de CPU 53–72 % por nodo, sin pods `Pending` → **no hace falta 4.º nodo**

### Fase 2 — Instrumentación de los 3 servicios · 3 h
- [x] `src/instrumentacion.mjs` (cargado con `node --import`): hook ESM, SDK OTel, OTLP → collector, Prometheus `:9464`, ignora `/health`, termina limpio con SIGTERM
- [x] `pino` JSON reemplazando `console.log` (con `trace_id`/`span_id`) en gateway, ordenes, figuras; histograma `printhub_http_request_duration_seconds{http_route,http_response_status_code}`
- [x] Métricas de negocio en `ordenes-service`: `printhub_pedidos_creados_total`, `printhub_pedidos_rechazados_total{motivo}`
- [x] Variables de fallo inducido en `api-gateway` (`FALLO_ORDENES_TASA`, `FALLO_ORDENES_LATENCIA_MS`; apagadas)
- [x] Catálogo inicial de figuras (ids 1-3 en todas las réplicas, para el generador de tráfico)
- [x] Chart: env `OTEL_*`, puerto `metrics`, `PodMonitor`, NetworkPolicies (egress collector, ingress Prometheus)
- [x] Prueba local: una traza cruza los 3 servicios y los registros de los 3 llevan el mismo `trace_id` (stdout y OTLP)
- [x] Release `v1.1.0` por el pipeline: 7 imágenes con Trivy (0 CRITICAL), PR #2 fusionado
- [x] En el clúster: 6 targets `up` en Prometheus con `rollouts_pod_template_hash`; trazas de 27–29 spans que cruzan los 3 servicios en Tempo; en Loki los registros de los 3 servicios se consultan por `trace_id`

### Fase 3 — Canary por métricas · 1.5 h
- [x] `AnalysisTemplate` `sa-platform-api-gateway-metricas` tipo `prometheus` (error + p95 del canary por `rollouts_pod_template_hash`) reemplaza al Job k6
- [x] Rollout sin `stableService`/`canaryService`: el Service principal reparte tráfico real entre estable y canary (si no, el canary no recibe tráfico)
- [x] `generador-trafico` (k6, 4 rps) en `sa-p9`
- [x] Promoción exitosa por métricas: v1.1.1 20→50→80→100 %, 3 AnalysisRun × 3 mediciones, error 0 % y p95 24–43 ms (`evidencias/promocion-v1.1.1-reintento-20261013-233915.log`)
- [x] Primer intento de v1.1.1 **abortado y revertido solo** por 5xx reales (2.8 % y 1.3 %) causados por ordenes/figuras reiniciándose a la vez sin `preStop` (`evidencias/promocion-v1.1.1-20261013-232854.log`). Corregido con `preStop` de 10 s en los 3 servicios: el siguiente despliegue tuvo 1 error en 1174 peticiones

### Fase 4 — SLO y alertas · 2 h
- [x] `PrometheusRule` `slo-printhub` (GitOps `observability/`, app `observability-config`, wave 1): 16 reglas de registro (SLI por ventana, SLI 28 d, presupuesto consumido, objetivo) — todas `ok` en Prometheus
- [x] 4 alertas por quema de presupuesto (rápida 14.4× 1h+5m `page`, lenta 6× 6h+30m `ticket`, × 2 SLO) con `runbook_url`; `inactive` sin fallos
- [x] Runbooks (`docs/runbooks/`), uno por alerta + README de acceso y recorrido; consultas LogQL/TraceQL verificadas contra Loki/Tempo
- [x] `docs/slo.md`: SLO 1 pedidos 99 % sin 5xx, SLO 2 latencia **99 %** ≤ 0.5 s (no 95 %: se midió 99.92 %, p99 69 ms), ventana 28 d, justificación

### Fase 5 — Tablero · 1 h
- [x] Tablero "Operación PrintHub" (21 paneles): fila SLO/presupuesto/alertas/burn rate + tráfico, errores (5xx por servicio, trazas con error, registros de error), latencia y saturación (CPU, memoria, throttling) + negocio
- [x] Cada panel responde una pregunta concreta (título en forma de pregunta)
- [x] Provisionado por ConfigMap (kustomize) en GitOps; JSON exportado de Grafana en `P10/dashboards/operacion-printhub.json`
- [ ] Captura del tablero en operación (en la Fase 6, con el incidente visible)

### Fase 6 — Pruebas con fallo inducido · 1.5 h
- [ ] Fallo en el canary: `FALLO_ORDENES_TASA` (p. ej. 0.3) en `api-gateway.extraEnv` de `values-gke.yaml` (commit en GitOps) → AnalysisRun `Failed` → Rollout abortado. Grabar con `P10/pruebas/seguir-rollout.sh fallo-canary`
- [ ] Síntoma → causa con un fallo **fuera del gateway** (el canary bloquearía uno en el gateway): p. ej. `FIGURAS_SERVICE_URL` errónea en ordenes-service vía GitOps → 100 % de pedidos 502 → `PedidosPresupuestoQuemaRapida` (~9–10 min) → tablero → traza → registro, cronometrado (< 3 min)
- [ ] Anotar tiempos: inicio del fallo, primera señal, alerta, causa encontrada, recuperación

### Fase 7 — Documentación y entrega · 2 h
- [ ] Informe de operación (6 campos, tiempos medidos, mejora concreta a la instrumentación)
- [ ] Diagrama del flujo de telemetría (Mermaid)
- [ ] Preguntas teóricas
- [ ] README `/P10` con la tabla 4.1 completa (todo enlace público)
- [ ] Video 5–8 min con minutaje
- [ ] Verificación de no regresión de P9: Velero, Kyverno, ExternalSecrets, Rollout
- [ ] Apagar el entorno (`P9/pruebas/apagar.sh`)

---

## 6. Trampas a vigilar

1. **NetworkPolicies de P9:** el clúster **no las aplica** (sin Dataplane V2/Calico en `20-cluster`) y además seleccionan pods por `sa-platform/component`, etiqueta que los pods no llevan. Hoy no bloquean nada; se agregaron reglas de telemetría correctas por namespace. Mencionarlo como límite en el informe.
2. **ResourceQuota de `sa-p9`:** el generador de tráfico y cualquier cambio de recursos deben caber en la cuota.
3. **Kyverno:** el generador de tráfico debe cumplir las 3 políticas (tag fijo, límites, no root).
4. **Canary sin tráfico:** `NaN`/vector vacío hace fallar o pasar el análisis por error → generador constante y condición que lo contemple.
5. **Canary por réplicas (sin trafficRouting):** al 20 % el canary recibe poco tráfico; ventanas `rate[1m]` y generador suficiente.
6. **CRDs grandes de kube-prometheus-stack en ArgoCD:** usar `ServerSideApply=true`.
7. **Stack sin persistencia:** al reconstruir con `bootstrap.sh` se pierden métricas/logs; hacer las pruebas en una sola sesión.
8. **Burn rate y ventana de 28 días:** con datos de pocas horas, las alertas de quema funcionan igual (usan ventanas cortas); el "presupuesto consumido" será del periodo observado: decirlo en el informe.
10. **Operador de Prometheus antes de sus CRDs:** si arranca antes de que exista el CRD `Prometheus`, nunca lo crea (no vuelve a buscarlo). Corregido con una sync-wave interna en el Deployment del operador (`9c8e08e` en GitOps).
11. **k6 2.x:** ya no existe `--no-summary` (`--summary-mode=disabled`), y su cookie jar no guarda cookies de un host sin dominio (el Service): el generador envía el JWT como `Bearer`.
12. **IDs de traza en Tempo:** la API los devuelve sin ceros a la izquierda; para buscarlos en Loki hay que completarlos a 32 caracteres.
13. **Consumidor de RabbitMQ sin reintento (bug heredado de P5):** si `figuras-service`/`ordenes-service` arrancan antes que RabbitMQ, `consume()` falla una vez y nunca reintenta: los pedidos quedan `pendiente`. Visto en Loki el 13/10 04:37 (`No se pudo iniciar el consumidor`). Ningún SLO lo cubre (el pedido ya respondió 202) → candidato a "alerta faltante" del informe.
9. **Costos compartidos:** misma facturación que la compañera → apagar siempre al terminar.

---

## 7. Decisiones tomadas (2026-10-13)

- [x] **Código en `/P10`:** se copian `api-gateway`, `ordenes-service` y `figuras-service` a `P10/servicios/`
  y se instrumentan ahí. El pipeline construye esas 3 imágenes desde `P10/servicios/`; las otras 4
  (auth, materiales, cronjobs) siguen saliendo de `P5/`. `P5/` no se modifica.
- [x] **Cadena de suministro:** se agrega al pipeline un escaneo Trivy de cada imagen
  (`--severity CRITICAL --exit-code 1 --ignore-unfixed`) **antes** del push. Si falla, no hay imagen ni PR.
- [x] **Namespace e infraestructura:** se mantienen `sa-p9`, el clúster `sa-p9` y las capas Terraform de `P9/`.
- [x] **P9 sigue vigente:** `P9/` (scripts, docs, evidencias) no se toca. Todo lo de P10 entra al repo GitOps
  como Applications nuevas, sin quitar nada de P9. Al final se verifica que siguen operando: Velero
  (respaldo `Completed`), Kyverno (rechazo de `:latest`), ExternalSecrets (`SecretSynced`) y `bootstrap.sh`
  levantando también el stack de observabilidad.

---

## 8. Bitácora

| Fecha | Qué se hizo | Siguiente paso |
|---|---|---|
| 2026-10-13 | Análisis del enunciado P10, inventario de proyectos GCP y hoja de ruta. Proyectos renombrados (SA P10 Nufio, Bank USAC); proyecto de AI Studio eliminado | — |
| 2026-10-13 | Decisiones: código en `P10/servicios/`, Trivy en el pipeline, P9 intacto. Bank USAC es proyecto propio: no tocar | — |
| 2026-10-13 | Fase 2 (código) y Fase 1/3 (manifiestos) sin clúster: servicios instrumentados y probados en local, pipeline con Trivy, chart y apps del stack renderizados. | — |
| 2026-10-13 | Commits y push: código `a61d3ba..57d246b`, GitOps `caf1390..2c1c53d`. Limpieza de disco local (Docker/Podman) | Tag `v1.1.0` (build + Trivy + PR de versión), merge, levantar clúster y verificar (capacidad: posible 4.º nodo) |
| 2026-10-13 | Tag `v1.1.0` (CI verde, Trivy en las 7 imágenes) y PR #2 fusionado. Clúster arriba con el stack: métricas, trazas de 3 servicios y registros correlacionados verificados. Corregidos: operador de Prometheus (race de CRDs) y generador de tráfico (flag de k6, sesión por Bearer). Discord y OBS desinstalados | Fase 4 (SLO y alertas) y Fase 5 (tablero); probar promoción del canary por métricas |
| 2026-10-14 | Fases 4 y 5 en el clúster: PrometheusRule (20 reglas `ok`), 4 alertas con runbook, tablero de 21 paneles provisionado y exportado. Detectado bug del consumidor RabbitMQ sin reintento | Fase 6: fallo inducido (canary por métricas + recorrido síntoma→causa) y captura del tablero |
| 2026-10-14 | Bug del consumidor RabbitMQ corregido (reintento + re-suscripción, probado en local) y publicado en v1.1.1. Canary: primer intento abortado por 5xx de otros servicios reiniciándose → `preStop` 10 s → v1.1.1 promovida por métricas. Tag `v1.1.2` (material inexistente como `warn`) construido; **PR #4 abierto sin fusionar**. Entorno apagado con `P9/pruebas/apagar.sh` | Al retomar: `./P9/bootstrap.sh` (~35 min), fusionar PR #4 (canary de release completo), Fase 6 (fallo en canary + síntoma→causa + captura del tablero), Fase 7. **Repo de código privado: hacerlo público antes de entregar** (runbook_url dan 404) |
