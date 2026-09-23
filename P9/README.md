# Práctica 9 — Continuidad operativa y recuperación ante desastres

Plataforma PrintHub (5 microservicios, MySQL, RabbitMQ) en GKE, recuperable desde cero con un solo
comando: Terraform crea el clúster e instala ArgoCD, y el patrón app-of-apps levanta todo lo demás
desde el repositorio GitOps, incluida la restauración de datos con Velero.

## Tabla de enlaces

| Ítem | Enlace o dato |
|---|---|
| Repositorio GitOps | https://github.com/GeoNufio1404/software-avanzado-gitops |
| Aplicación raíz en ArgoCD | `root-sa-p9`, namespace `argocd` |
| Punto de entrada del bootstrap | [`P9/bootstrap.sh`](bootstrap.sh) |
| Backend remoto de Terraform | `gcs`, bucket `sa-p9-tfstate-201901444` (us-central1, versionado, bloqueo nativo de GCS), un prefijo por capa |
| Schedule de Velero | `velero-sa-p9-hourly` (cada hora, retención 72 h, volúmenes incluidos) → `gs://sa-p9-velero-201901444` (us-east1) |
| Reconstrucción cronometrada | [`evidencias/reconstruccion-20260923-112456.log`](evidencias/reconstruccion-20260923-112456.log) y [`evidencias/bootstrap-20260923-113445.log`](evidencias/bootstrap-20260923-113445.log); verificación posterior en [`evidencias/verificacion-post-reconstruccion-20260923.log`](evidencias/verificacion-post-reconstruccion-20260923.log) |
| Restauración de datos | [`evidencias/restauracion-datos-20260923.log`](evidencias/restauracion-datos-20260923.log) |
| Prueba de pérdida de nodo | [`evidencias/drenaje-20260923-112116.log`](evidencias/drenaje-20260923-112116.log) |
| RTO y RPO declarados | Declarados: **RTO 45 min, RPO 1 h** (antes de las pruebas, commit `3456d7e`). Medidos en la reconstrucción: **RTO 23 min 18 s, RPO 24 min 31 s**. Detalle en [`docs/informe-dr.md`](docs/informe-dr.md) |
| Video demostrativo | _pendiente_ |

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/runbook.md`](docs/runbook.md) | Procedimiento de recuperación paso a paso, con verificaciones |
| [`docs/diagrama-bootstrap.md`](docs/diagrama-bootstrap.md) | Orden de reconstrucción y dependencias, automático frente a manual |
| [`docs/informe-dr.md`](docs/informe-dr.md) | Informe de la prueba de DR (objetivos, escenario, tiempos, pérdida, SPOF, brecha) |

## Estructura

```
P9/
├── bootstrap.sh              punto de entrada único de la reconstrucción
├── terraform/
│   ├── 00-state/             bucket del estado remoto                      persistente
│   ├── 10-base/              APIs, Artifact Registry, bucket de Velero,    persistente
│   │                         cuentas de servicio, Secret Manager, WIF
│   ├── 20-cluster/           clúster GKE sa-p9                              destruible
│   └── 30-platform/          namespace, cuota, RBAC, ArgoCD y app raíz      destruible
├── pruebas/
│   ├── datos.sh              usuarios verificables con huella SHA-256
│   ├── restaurar-datos.sh    recuperación de filas borradas desde un respaldo
│   ├── drenaje-nodo.sh       pérdida de nodo con sondeo continuo de la API
│   ├── reconstruccion.sh     destrucción y reconstrucción cronometrada
│   └── apagar.sh             respaldo final (30 días), destruir el clúster y limpiar recursos sueltos
├── evidencias/               registros con marcas de tiempo
└── docs/                     runbook, diagrama e informe DR
```

El pipeline (`.github/workflows/ci.yaml`, en la raíz del repositorio) construye las imágenes al crear
un tag `v*.*.*` y abre un PR en el repo GitOps; nunca accede al clúster.
