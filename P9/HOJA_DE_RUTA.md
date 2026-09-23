# Hoja de ruta — Práctica 9: Continuidad operativa y recuperación ante desastres

> Documento de trabajo para retomar entre sesiones. Marca `[x]` al terminar cada tarea
> y anota en la **Bitácora** (al final) dónde quedaste.
>
> **Objetivo:** entregar **solo P9**. De P8 se construye únicamente lo que P9 necesita para
> funcionar, y se construye **directamente en su forma de P9** (nada se configura dos veces).
> Todo vive en `/P9`, namespace `sa-p9`.
>
> **Criterio de alcance:** proyecto universitario → solo lo que exige la rúbrica y los requisitos.
> Nada de extras.

---

## 0. Enfoque

### Qué exige P9 de P8

P9 dice textualmente: *"Conservación del flujo de la Práctica 8: GitOps, entrega progresiva y
políticas de admisión deben seguir operando tras la reconstrucción"*. Por eso, cada pieza de P8 se clasifica así:

| Pieza de P8 | En P9 | Cómo se construye (versión P9) |
|---|---|---|
| Terraform | **Obligatorio** (ampliado) | P8 pedía namespaces/cuotas/RBAC; P9 además pide **crear el clúster, instalar ArgoCD y estado remoto**. Se hace directamente la versión P9, que incluye lo de P8 |
| Helm (chart por servicio, values por ambiente) | **Obligatorio** | Chart de P5 ajustado una sola vez |
| ArgoCD + repo GitOps separado | **Obligatorio** (ampliado) | Directamente con **app-of-apps** (P9), no con una Application suelta (P8) |
| Argo Rollouts + AnalysisTemplate | **Obligatorio** | Debe seguir funcionando tras la reconstrucción |
| Kyverno (3 políticas) | **Obligatorio** | Debe seguir funcionando tras la reconstrucción |
| Gestión de secretos | **Obligatorio** (ampliado) | Directamente **External Secrets + GCP Secret Manager**: P9 exige que los secretos sobrevivan a la pérdida del clúster, y así se cumple sin respaldar llaves |
| Pipeline que actualiza versión vía PR | **Necesario** | Es parte de "GitOps operando". Versión mínima: tag → build → push → PR |
| Probes, PDB | **Obligatorio** | Ya existen en P5; se agrega anti-afinidad y réplicas |
| Trivy / SBOM / Cosign | **No se hace** | P9 no los menciona |
| Fallo inducido + informe de incidente | No se entrega | Pero el Rollout debe tener análisis real (se prueba una vez para validar) |
| PR bloqueado por CVE, README /P8, video P8 | No se entrega | — |

### ¿Qué es GitOps? (resumen)

Hoy (P5/P7) el despliegue es **"push"**: alguien ejecuta `helm upgrade` contra el clúster.
GitOps lo invierte a **"pull"**:

```
 Tú / pipeline                Repo GitOps                    Clúster GKE
 ──────────────               ─────────────                  ───────────
 git tag v1.2.0  ──build──▶   PR: image.tag 1.2.0  ◀──lee──  ArgoCD (vive DENTRO del clúster)
                              (merge)                        compara Git vs clúster
                                                             y aplica la diferencia
```

- El repo GitOps es la **única fuente de verdad**. ArgoCD lo lee cada pocos minutos y aplica los cambios;
  si alguien cambia algo a mano, lo detecta y lo revierte.
- El pipeline **nunca toca el clúster** (sin kubeconfig, sin `kubectl apply`, sin `helm upgrade`).
- **Clave para P9:** como todo el sistema está descrito en Git, reconstruir = crear clúster + instalar ArgoCD
  + apuntarlo al repo. ArgoCD levanta el resto solo. Lo único que Git no tiene son los **datos** (→ Velero)
  y los **secretos** (→ Secret Manager).

### Dos repositorios

| Repositorio | Contenido | Quién escribe |
|---|---|---|
| **Código** (este: `Practicas-SA-B-201901444`) | Servicios, Dockerfiles, workflow de GitHub Actions, Terraform, `bootstrap.sh`, pruebas, documentación en `/P9` | Tú |
| **GitOps** ([`software-avanzado-gitops`](https://github.com/GeoNufio1404/software-avanzado-gitops), público) | Charts, values, apps de ArgoCD (app-of-apps), políticas Kyverno, Velero. **Sin código fuente, sin secretos** | El pipeline (vía PR) y tú. ArgoCD solo lo lee |

### Otras piezas

| Pieza | Para qué |
|---|---|
| **Terraform** | Crea clúster, buckets, namespaces, RBAC e instala ArgoCD. Estado en bucket GCS |
| **App-of-apps** | Una Application de ArgoCD "raíz" que crea las demás Applications (Rollouts, Kyverno, Velero, la app...) |
| **Argo Rollouts** | Reemplaza al `Deployment`: libera por pasos (20 → 50 → 80 → 100 %) con pruebas en cada paso; si fallan, revierte solo |
| **Kyverno** | Rechaza manifiestos que violen políticas (`latest`, sin límites, root) |
| **External Secrets** | Los secretos viven en GCP Secret Manager (fuera del clúster); el clúster los copia |
| **Velero** | Respaldos programados de recursos y volúmenes hacia un bucket GCS |
| **RTO / RPO** | RTO = cuánto tardas en volver a estar arriba. RPO = cuántos datos (en tiempo) pierdes |

---

## 1. Punto de partida (diagnóstico de P5)

| Aspecto | Estado actual | Lo que se necesita |
|---|---|---|
| Charts | Umbrella `sa-platform` + 5 subcharts + MySQL/RabbitMQ Bitnami; `values-dev/prod/gke` | ✅ Base |
| Namespace / cuota / LimitRange | Los crea Helm (`templates/namespace.yaml`, `resourcequota.yaml`, `limitrange.yaml`) | Moverlos a **Terraform** |
| Seguridad de pods | `USER 10001`, `runAsNonRoot`, `readOnlyRootFilesystem` | ✅ Cumple Kyverno |
| Límites CPU/memoria | Definidos | ✅ |
| Probes | liveness / readiness / startup | ✅ |
| PDB | Existen por servicio | ✅ (revisar `minAvailable` con 2 réplicas) |
| Tags de imagen | Fijos `1.0.0` | Derivar de tag Git, nunca `latest` |
| Secretos | `shared-secrets.yaml` desde `values.secrets.yaml` (gitignored) | External Secrets |
| Estrategia | `Deployment` RollingUpdate | `Rollout` canary ≥3 pasos + `AnalysisTemplate` |
| Pruebas | `P5/k6/load-test.js` | Smoke k6 para el análisis del canary |
| Réplicas en GKE | `values-gke.yaml` = 1 réplica | ≥2 + anti-afinidad |
| Persistencia | MySQL (auth) con PVC ✅. materiales/figuras/ordenes = **SQLite en `emptyDir`** (se pierde al reiniciar) | **auth-service + MySQL** = servicio con estado de P9 |
| CI/CD | **No existe `.github/workflows`**; `P6`/`P7` solo tienen `Instrucciones.md` | Pipeline mínimo (Fase 7) |

---

## 2. Decisiones de arquitectura

| Decisión | Elección | Motivo |
|---|---|---|
| Clúster | GKE **Standard zonal** `sa-p9` (us-central1-a), 3 × `e2-standard-2`, disco `pd-standard` | Drenaje de nodo; cuotas del proyecto: `E2_CPUS`=8, `SSD_TOTAL_GB`=250 |
| Estado Terraform | Backend `gcs` (locking nativo) | Requisito P9 |
| Secretos | External Secrets + GCP Secret Manager (Workload Identity) | Sobreviven a la pérdida del clúster sin pasos manuales |
| Registro | Artifact Registry **`us-central1-docker.pkg.dev/project-2cbee419-ed7b-469e-89d/sa-p9`** (nuevo, Terraform) | El repo `sa-p6` queda obsoleto |
| Auth GitHub → GCP | Workload Identity Federation, SA solo con `artifactregistry.writer` | El pipeline no toca el clúster |
| Ingress | Ingress nativo de GKE (`gce`), como en P6 | Sin controladores extra. El canary reparte tráfico por número de pods |
| Respaldos | Velero + plugin GCP, bucket GCS dedicado, File System Backup (Kopia) | Portables a un clúster nuevo |
| Namespace / nombres | `sa-p9`; app raíz `root-sa-p9` (ns `argocd`); app `sa-platform` | — |

---

## 3. Estructura de repositorios

```
Practicas-SA-B-201901444/          (código)
├── .github/workflows/ci.yaml      tag → helm lint → build → push → PR al repo GitOps
├── P5/                            servicios fuente (se construyen desde aquí)
└── P9/
    ├── README.md                  tabla de enlaces obligatoria
    ├── HOJA_DE_RUTA.md            este archivo
    ├── bootstrap.sh               PUNTO DE ENTRADA ÚNICO
    ├── terraform/
    │   ├── 00-state/              bucket GCS del estado (estado local, una sola vez)      PERSISTENTE
    │   ├── 10-base/               APIs, Artifact Registry sa-p9, bucket Velero (us-east1),  PERSISTENTE
    │   │                          cuentas de servicio, contenedores Secret Manager, WIF GitHub
    │   ├── 20-cluster/            GKE sa-p9 + pool + bindings Workload Identity            DESTRUIBLE
    │   └── 30-platform/           namespaces, ResourceQuota, LimitRange, RBAC, ArgoCD + root DESTRUIBLE
    ├── pruebas/                   smoke k6, scripts de datos, drenaje de nodo
    ├── evidencias/                logs con marcas de tiempo
    └── docs/                      runbook.md, informe-dr.md, diagrama-bootstrap, preguntas.md

software-avanzado-gitops/          (público, clonado en ../software-avanzado-gitops)
├── root-app.yaml                  app-of-apps (la aplica Terraform)
├── apps/                          una Application por componente, con sync-waves
│   ├── 00 external-secrets, argo-rollouts, kyverno, velero
│   ├── 10 kyverno-policies, secret-store, velero-schedule
│   └── 20 sa-platform
├── charts/sa-platform/            chart de P5 ajustado
├── environments/gke/values.yaml   ← el pipeline SOLO cambia image.tag aquí
├── policies/                      disallow-latest, require-limits, require-non-root
└── velero/                        Schedule, BackupStorageLocation
```

---

## 4. Fases (una sola pasada, ~20 h)

### Fase 0 — Preparación · 1 h
- [x] Proyecto GCP `project-2cbee419-ed7b-469e-89d`; APIs habilitadas (ahora gestionadas por `10-base`)
- [x] Clúster anterior `sa-p6` eliminado (manifiestos de referencia guardados fuera del repo)
- [ ] Herramientas locales: ✅ `gcloud`, `terraform` 1.16, `helm` 3.21, `kubectl` 1.36, `argocd` 3.5, `kubectl-argo-rollouts` 1.10, `gh` · ❌ falta `velero` · ❌ `gh auth login` pendiente
- [ ] Confirmar si P6/P7/P8 están en otra rama/repo (ver Pendientes)

### Fase 1 — Terraform con estado remoto · 3 h
- [x] `00-state`: bucket `sa-p9-tfstate-201901444` (us-central1, versionado, `prevent_destroy`)
- [x] `10-base`: APIs, Artifact Registry `sa-p9`, bucket `sa-p9-velero-201901444` (us-east1), SAs (nodos, Velero, ESO, GitHub CI), 5 secretos vacíos en Secret Manager, WIF para `GeoNufio1404/Practicas-SA-B-201901444` — evidencia en `evidencias/terraform/`
- [x] `20-cluster`: GKE `sa-p9` zonal, 3 × e2-standard-2 (disco pd-standard por cuota SSD de 250 GB), Workload Identity, bindings Velero/ESO
- [x] `30-platform`: namespace `sa-p9`, `ResourceQuota`, `LimitRange`, RBAC, `helm_release` de ArgoCD, `root-app` apuntando a `software-avanzado-gitops`
- [x] `P9/.gitignore` excluye `*.tfstate`, `.terraform/`, planes

### Fase 2 — Repo GitOps y app-of-apps · 2 h
- [x] Repo público `software-avanzado-gitops` creado (vacío)
- [x] Estructura subida al repo (commit `99f823e`); repo público
- [x] Applications con sync-waves: operadores (0) → configuración (1) → app (2)
- [x] Root app `root-sa-p9` y las 6 apps hijas `Synced` / `Healthy`
- [x] App pública en `http://136.81.83.80/api/...` (Ingress GCE): registro, login y `/me` con email descifrado OK

### Fase 3 — Ajustes al chart (una sola vez) · 1.5 h
- [x] Quitar `namespace`, `resourcequota`, `limitrange` del chart (ahora son de Terraform)
- [x] `values` GKE: `replicaCount: 2`, `minReplicas: 2`, imágenes de Artifact Registry con tags semver
- [x] `podAntiAffinity` preferred por `kubernetes.io/hostname` en los subcharts
- [x] `Deployment` → `Rollout` (`api-gateway`) con servicios `stable` / `canary`
- [x] `helm lint` limpio

### Fase 4 — Secretos · 1 h
- [x] Valores aleatorios nuevos cargados en Secret Manager con `gcloud` (el `values.secrets.yaml` de P5 solo tenía placeholders)
- [x] `ClusterSecretStore` (Workload Identity) + 5 `ExternalSecret` en `SecretSynced`
- [x] Repo GitOps sin secretos (`grep` de verificación)

### Fase 5 — Entrega progresiva · 2 h
- [x] Argo Rollouts vía ArgoCD
- [x] Canary: `setWeight 20` → análisis → `50` → análisis → `80` → análisis → 100 (reparto por réplicas, sin trafficRouting)
- [x] `AnalysisTemplate` con Job k6 (smoke: health, login, listado) contra el servicio canary, umbrales `http_req_failed < 1%`, `p(95) < 500ms`
- [ ] Probar una promoción buena y una versión defectuosa (validar que aborta)

### Fase 6 — Políticas de admisión · 1 h
- [x] Kyverno `Enforce` limitado a `sa-p9`: disallow-latest, require-limits, require-non-root
- [ ] Probar rechazo con un `Deployment` que use `:latest`

### Fase 7 — Pipeline mínimo · 1.5 h
- [x] Disparo por tag `v*.*.*`; tag de imagen = versión sin `v` (`.github/workflows/ci.yaml`; `v1.0.0` construyó y subió las 7 imágenes)
- [x] `helm lint` → build → push a Artifact Registry (Workload Identity Federation)
- [ ] PR automático a `software-avanzado-gitops` cambiando `image.tag` (`GITOPS_TOKEN` creado; se prueba con `v1.0.1`, en `v1.0.0` no hubo cambios que proponer)
- [x] Sin kubeconfig, `kubectl` ni `helm upgrade` en el workflow

### Fase 8 — Velero · 2 h
- [x] Velero vía ArgoCD (sync-wave 0) con plugin GCP y Workload Identity
- [x] `BackupStorageLocation` → bucket GCS dedicado (fuera del clúster)
- [x] `Schedule` `sa-p9-hourly` (cada hora, `ttl: 72h`), incluye namespace `sa-p9` y el PVC de MySQL (File System Backup)
- [x] Al menos un backup `Completed` (requisito para optar a calificación): `velero-sa-p9-hourly-20260923010031`, 315 ítems, volúmenes de MySQL y RabbitMQ incluidos

### Fase 9 — Bootstrap de día cero · 2 h
- [ ] `P9/bootstrap.sh`: `terraform apply` 20-cluster → 30-platform (instala ArgoCD + root app) → espera app `Healthy` → restauración de datos desde Velero
- [ ] Resolver el orden **Velero antes de MySQL** (ver Trampa 1)
- [ ] Imprime marcas de tiempo (`date -Is`) a `P9/evidencias/bootstrap-<fecha>.log`
- [ ] Cero pasos manuales intermedios

### Fase 10 — RTO / RPO declarados · 0.5 h
- [ ] Declarar y justificar **antes** de las pruebas (p. ej. RTO 30 min, RPO 1 h) en `docs/informe-dr.md`

### Fase 11 — Pruebas · 3 h
- [ ] **Datos:** insertar usuarios conocidos en `auth_db.usuarios` → backup → borrarlos → restaurar → comparar con consulta. RPO real = tiempo entre último backup y el borrado
- [ ] **Pérdida de nodo:** `kubectl drain` con bucle de `curl` registrando respuestas; el servicio no deja de responder
- [ ] **Reconstrucción cronometrada:** destruir clúster → `bootstrap.sh` → app `Synced/Healthy`, Rollout y políticas operando, secretos descifrables (emails cifrados legibles), datos restaurados. RTO real con marcas de tiempo

### Fase 12 — Documentación y entrega · 3 h
- [ ] Runbook ejecutable por un tercero (comandos, orden de dependencias, verificación en cada paso)
- [ ] Informe DR (máx. 2 pág.): objetivos declarados, escenario ejecutado, tiempos medidos, pérdida medida, SPOF detectados, brecha y plan
- [ ] Diagrama del bootstrap (orden, dependencias, automático vs manual)
- [ ] Preguntas teóricas
- [ ] Video 5–8 min con minutaje
- [ ] README `/P9` con la tabla de enlaces:

| Ítem | Fase |
|---|---|
| Repositorio GitOps (URL pública) | 2 |
| Aplicación raíz ArgoCD (nombre y namespace) | 2 |
| Punto de entrada del bootstrap (ruta) | 9 |
| Backend remoto de Terraform (tipo y ubicación) | 1 |
| Schedule de Velero (nombre y destino) | 8 |
| Reconstrucción cronometrada (ruta del log) | 11 |
| Restauración de datos (ruta de evidencia) | 11 |
| Prueba de pérdida de nodo (ruta de evidencia) | 11 |
| RTO y RPO declarados vs medidos | 10 / 11 |
| Video (URL y minutaje) | 12 |

---

## 5. Trampas a vigilar

1. **ArgoCD vs restauración de Velero:** al reconstruir, ArgoCD crearía el PVC de MySQL **vacío** antes de que Velero restaure. Opciones: (a) sync-waves con Velero primero y restaurar el namespace antes de que se sincronice `sa-platform`; (b) que `bootstrap.sh` ejecute `velero restore` antes de aplicar la root app de la plataforma. Definir en Fase 9.
2. **SQLite en `emptyDir`:** con 2 réplicas cada pod tiene su propia BD y se pierde al reiniciar. Declararlo en el informe DR como SPOF / pérdida conocida (suma en "honestidad técnica"), o migrar a MySQL si sobra tiempo.
3. **MySQL es una sola instancia:** durante el drenaje, si el nodo que se drena tiene MySQL, auth deja de responder un momento. Documentarlo o elegir el nodo a drenar y explicarlo.
4. **Alcance de Kyverno:** limitar a `sa-p9` para no bloquear ArgoCD, Velero ni los pods de Bitnami.
5. **LimitRange vs require-limits:** el LimitRange completa límites en Pods sueltos; probar rechazo con `Deployment` o con `:latest`.
6. **Bitnami:** repo clásico en retiro; mantener los `.tgz` en `charts/` e imágenes `bitnamilegacy/*`.
7. **Secretos en el estado de Terraform:** no crear valores de secretos con Terraform.
8. **Bucket de Velero y Terraform destroy:** el bucket de respaldos y el de estado **no** deben destruirse al destruir el clúster (capas separadas / `prevent_destroy`).

---

## 6. Costos GCP (aproximados)

- 3 × `e2-standard-2` ≈ USD 0.20/h + balanceador ≈ USD 0.03/h + discos → ~USD 5–6 por día encendido.
- Clúster zonal: sin cuota de gestión (crédito gratuito de GKE para uno).
- **Destruir el clúster al terminar cada sesión** (`terraform destroy` de 10-gcp, conservando buckets, Artifact Registry y Secret Manager). Cada reconstrucción es además un ensayo del RTO.

---

## 7. Pendientes por confirmar

- [ ] P9 pide como requisito "Práctica 8 previamente calificada": confirmar con el auxiliar si basta con que el flujo de P8 funcione dentro de P9
- [ ] Fechas P9: elaboración 17/11 – 24/11/2026, calificación 26/11/2026 (confirmar)
- [ ] Ubicación de P6/P7 (¿otra rama/repo?)
- [x] Dos repositorios: código (este) + GitOps (nuevo, público)
- [ ] External Secrets en lugar de Sealed Secrets (recomendado; confirmar)
- [x] Todo se construye en `/P9` (namespace `sa-p9`), sin carpeta `/P8`

---

## 8. Bitácora

| Fecha | Qué se hizo | Siguiente paso |
|---|---|---|
| 2026-09-22 | Análisis de enunciados P8/P9 y hoja de ruta | — |
| 2026-09-22 | Hoja de ruta reorientada a P9 (P8 solo como base) | — |
| 2026-09-22 | `sa-p6` eliminado. Terraform 00-state, 10-base y 20-cluster aplicados (clúster creado en 11.5 min). 30-platform escrito, sin aplicar | — |
| 2026-09-22 | Repo GitOps definido (`software-avanzado-gitops`). Recortados extras: rol de operador RBAC, permisos de snapshots de Velero, ingress-nginx, Trivy/Cosign | — |
| 2026-09-22 | Repo GitOps subido y público; 30-platform aplicado (ArgoCD + root app). Operadores, políticas, secretos y chart sincronizados. Pipeline escrito | — |
| 2026-09-22 | Commit `044c37c` + tag `v1.0.0`: pipeline construyó las 7 imágenes. Corregidos en GitOps: Ingress GCE (anotación en vez de `ingressClassName`) e init de MySQL (`initdbScripts`). Todo `Synced/Healthy`, app pública funcionando | Tag `v1.0.1` para probar PR + canary; luego Fase 9 (`bootstrap.sh`) |
