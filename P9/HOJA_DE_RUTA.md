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
- [x] Confirmar si P6/P7/P8 están en otra rama/repo (ver Pendientes)

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
- [x] Promoción de `1.0.1` por pasos con 3 AnalysisRun exitosos (`evidencias/rollout-v1.0.1.log`). El primer intento abortó y revirtió solo por un umbral demasiado estricto (`checks rate==1.0`, 1 fallo de 2160) → ajustado a `rate>0.99` (`evidencias/rollout-v1.0.1-intento1-abortado.log`)

### Fase 6 — Políticas de admisión · 1 h
- [x] Kyverno `Enforce` limitado a `sa-p9`: disallow-latest, require-limits, require-non-root
- [x] Probar rechazo de `:latest`: Pod `nginx:latest` rechazado por `disallow-latest-tag` y `require-run-as-non-root` tras la reconstrucción (`evidencias/verificacion-post-reconstruccion-20260923.log`)

### Fase 7 — Pipeline mínimo · 1.5 h
- [x] Disparo por tag `v*.*.*`; tag de imagen = versión sin `v` (`.github/workflows/ci.yaml`; `v1.0.0` construyó y subió las 7 imágenes)
- [x] `helm lint` → build → push a Artifact Registry (Workload Identity Federation)
- [x] PR automático a `software-avanzado-gitops` cambiando `image.tag` (PR #1 `release: v1.0.1`, merge manual)
- [x] Sin kubeconfig, `kubectl` ni `helm upgrade` en el workflow

### Fase 8 — Velero · 2 h
- [x] Velero vía ArgoCD (sync-wave 0) con plugin GCP y Workload Identity
- [x] `BackupStorageLocation` → bucket GCS dedicado (fuera del clúster)
- [x] `Schedule` `sa-p9-hourly` (cada hora, `ttl: 72h`), incluye namespace `sa-p9` y el PVC de MySQL (File System Backup)
- [x] Al menos un backup `Completed` (requisito para optar a calificación): `velero-sa-p9-hourly-20260923010031`, 315 ítems, volúmenes de MySQL y RabbitMQ incluidos

### Fase 9 — Bootstrap de día cero · 2 h
- [x] `P9/bootstrap.sh`: `terraform apply` 20-cluster → 30-platform (instala ArgoCD + root app) → espera app `Healthy` → restauración de datos desde Velero. Ejecución idempotente sobre el clúster vivo: 35 s, sin cambios (`evidencias/bootstrap-20260923-033706.log`)
- [x] Resolver el orden **Velero antes de MySQL** (ver Trampa 1): app `velero-restore` (wave 1) con Job `restore-mysql` que restaura StatefulSet/pod/PVC/PV de MySQL desde el último respaldo si el PVC no existe; la wave 2 espera. Probado en namespace aislado (3 min 28 s, datos idénticos)
- [x] Imprime marcas de tiempo (`date -Is`) a `P9/evidencias/bootstrap-<fecha>.log`
- [x] Cero pasos manuales intermedios

### Fase 10 — RTO / RPO declarados · 0.5 h
- [x] Declarados **antes** de las pruebas en `docs/informe-dr.md`: **RTO 45 min, RPO 1 h** (commit `3456d7e`, 03:38)

### Fase 11 — Pruebas · 3 h
- [x] **Datos:** 3 usuarios `dr_a_*` → respaldo `velero-sa-p9-hourly-20260923160032` → 2 usuarios `dr_b_*` después del respaldo → borrado de ambos (16:08:01 UTC) → `pruebas/restaurar-datos.sh` → `dr_a_*` con huella SHA-256 idéntica y login OK; `dr_b_*` perdidos. RPO real 7 min 29 s; recuperación 2 min 35 s (`evidencias/restauracion-datos-20260923.log`)
- [x] **Pérdida de nodo:** `kubectl drain` con bucle de `curl` registrando respuestas; el servicio no deja de responder. Nodo `gke-sa-p9-main-87a23e6f-1f4b` (sin MySQL/RabbitMQ): 150/150 sondeos `health` y `login` en 200, drenaje en 2 min 4 s (`evidencias/drenaje-20260923-112116.log`)
- [x] **Reconstrucción cronometrada:** destruir clúster → `bootstrap.sh` → app `Synced/Healthy`, Rollout y políticas operando, secretos descifrables (emails cifrados legibles), datos restaurados. RTO real con marcas de tiempo. **RTO 23 min 18 s, RPO 24 min 31 s**; `dr_a_*` restaurados con huella idéntica, `dr_c_*` perdidos (`evidencias/reconstruccion-20260923-112456.log`)

### Fase 12 — Documentación y entrega · 3 h
- [x] Runbook ejecutable por un tercero (`docs/runbook.md`)
- [x] Informe DR (máx. 2 pág.): objetivos declarados, escenario ejecutado, tiempos medidos, pérdida medida, SPOF detectados, brecha y plan (`docs/informe-dr.md`; revisar extensión)
- [x] Diagrama del bootstrap (`docs/diagrama-bootstrap.md`, Mermaid)
- [ ] Preguntas teóricas (el enunciado no las lista; confirmar con el auxiliar)
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

- [x] P9 pide como requisito "Práctica 8 previamente calificada": confirmar con el auxiliar si basta con que el flujo de P8 funcione dentro de P9
- [ ] Fechas P9: elaboración 17/11 – 24/11/2026, calificación 26/11/2026 (confirmar)
- [x] Ubicación de P6/P7 (¿otra rama/repo?)
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
| 2026-09-22 | Historial GitOps reescrito sin coautoría. `v1.0.1`: PR #1 del pipeline, merge, canary 20/50/80 promovido (tras ajustar umbral de checks) | Fase 9: `bootstrap.sh` |
| 2026-09-23 | Fase 9: `bootstrap.sh` + app `velero-restore` (Trampa 1). Bug detectado: el schedule real es `velero-sa-p9-hourly` (el chart antepone `velero-`); corregido en el Job, que ahora falla si no hay respaldo. Fase 10: RTO 45 min / RPO 1 h. Fase 11: restauración de datos verificada | Ejecutar a mano `pruebas/drenaje-nodo.sh` y `pruebas/reconstruccion.sh`; luego completar `docs/informe-dr.md` |
| 2026-09-23 | Drenaje de nodo OK. Reconstrucción cronometrada: RTO 23 min 18 s, RPO 24 min 31 s, datos y secretos verificados. Runbook, diagrama, informe DR y README con tabla de enlaces | Video; preguntas teóricas; borrar discos huérfanos del clúster anterior |

---

## 9. Guion del video (5–8 min)

### 9.1 Preparación (antes de grabar, no sale en el video)

Todos los comandos se ejecutan en una **terminal ubicada en la raíz del repositorio**
(`~/Documentos/Github/Practicas-SA-B-201901444`). Abrir además un navegador.

```bash
# 1. Verificar que todo está sano (8 Applications Synced/Healthy)
kubectl get applications -n argocd

# 2. Segunda terminal: acceso a la interfaz de ArgoCD (dejarla abierta)
kubectl port-forward svc/argocd-server -n argocd 8080:80
#    Navegador → http://localhost:8080 · usuario: admin · contraseña:
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d; echo

# 3. Elegir el nodo a drenar: uno que NO tenga MySQL ni RabbitMQ
kubectl get pods -n sa-p9 -o wide | grep -E 'mysql|rabbitmq'   # nodo a evitar
kubectl get nodes                                              # elegir otro

# 4. Pestañas del navegador ya abiertas:
#    - README de /P9 en GitHub (tabla de enlaces)
#    - Repo GitOps: https://github.com/GeoNufio1404/software-avanzado-gitops
#    - docs/diagrama-bootstrap.md en GitHub (se ve el diagrama)
#    - docs/informe-dr.md en GitHub
```

Consejos: letra grande en la terminal (Ctrl + +), grabar con OBS y **acelerar o cortar las esperas
largas** en la edición (respaldo, drenaje y sobre todo la reconstrucción). Decir en voz alta la
hora que marca el log en cada punto importante.

### 9.2 Orden de grabación y minutaje sugerido

El orden importa: la reconstrucción destruye el clúster, así que va al final.

| Min | Qué se demuestra | Dónde | Qué hacer / comandos |
|---|---|---|---|
| 0:00–0:30 | Presentación | Navegador: README `/P9` | Mostrar la tabla de enlaces y explicar el objetivo: reconstruir todo con un solo comando |
| 0:30–1:15 | Terraform con estado remoto | Terminal + navegador | `ls P9/terraform` · `gcloud storage ls gs://sa-p9-tfstate-201901444/` · explicar capas persistentes (00, 10) y destruibles (20, 30). Mostrar `docs/diagrama-bootstrap.md` |
| 1:15–2:00 | GitOps y app-of-apps | ArgoCD (localhost:8080) + GitHub | Abrir `root-sa-p9` y mostrar el árbol de apps hijas por waves. En GitHub, la carpeta `apps/` del repo GitOps. `kubectl get applications -n argocd` |
| 2:00–2:45 | Respaldos con Velero | Terminal | Comandos del bloque **A** |
| 2:45–4:00 | Restauración de datos | Terminal | Comandos del bloque **B** (cortar la espera del respaldo) |
| 4:00–5:00 | Pérdida de nodo | Terminal | Comandos del bloque **C** (acelerar el drenaje) |
| 5:00–6:45 | Reconstrucción cronometrada | Terminal + ArgoCD | Comandos del bloque **D** (cortar las esperas; mostrar inicio, destrucción, apps levantándose, restauración y fin) |
| 6:45–7:30 | Todo sigue operando tras reconstruir | Terminal | Comandos del bloque **E** |
| 7:30–8:00 | Resultados | Navegador: `informe-dr.md` | RTO/RPO declarados frente a medidos, puntos únicos de fallo y plan |

**A · Respaldos programados**
```bash
kubectl get schedules.velero.io -n velero -o wide          # velero-sa-p9-hourly, cada hora
kubectl get backups.velero.io -n velero                     # respaldos Completed
kubectl get schedule velero-sa-p9-hourly -n velero -o jsonpath='{.spec.template.ttl}{"\n"}'   # retención 72h
gcloud storage ls gs://sa-p9-velero-201901444/backups/ | tail -5   # destino fuera del clúster
```

**B · Restauración de datos (borrado y recuperación)**
```bash
./P9/pruebas/datos.sh insertar dr_video 2                   # 1. datos conocidos
./P9/pruebas/datos.sh consultar dr_video                    #    anotar la huella
V=$(kubectl get pod -n velero -l name=velero -o name)       # 2. respaldo manual con la plantilla del schedule
kubectl -n velero exec $V -c velero -- /velero backup create demo-video --from-schedule velero-sa-p9-hourly --wait
./P9/pruebas/datos.sh borrar dr_video                       # 3. pérdida de datos
./P9/pruebas/datos.sh consultar dr_video                    #    total 0
./P9/pruebas/restaurar-datos.sh demo-video dr_video         # 4. recuperación desde el respaldo
./P9/pruebas/datos.sh consultar dr_video                    # 5. misma huella que en el paso 1
```

**C · Pérdida de nodo** (usar el nodo elegido en 9.1; el usuario `dr_video_1` se creó en B)
```bash
kubectl get pdb -n sa-p9                                    # PDB minAvailable 1
kubectl get pods -n sa-p9 -o wide                           # réplicas repartidas (anti-afinidad)
./P9/pruebas/drenaje-nodo.sh <nodo-sin-mysql> dr_video_1 Recupera-2026
#   mostrar que health=200 login=200 no se interrumpe y el resumen final (0 fallos)
```

**D · Reconstrucción cronometrada** (~35 min reales; en el video, ~2 min)
```bash
./P9/pruebas/reconstruccion.sh
#   mostrar: último respaldo · "DESTRUCCION del cluster" · "Cluster destruido" (empieza el RTO)
#   · "Cluster listo" · "ArgoCD instalado" · estados de las Applications por waves
#   · log del Job restore-mysql · "Todas las Applications Synced/Healthy" · RTO y RPO medidos
```
Cuando el log diga `ArgoCD instalado`, reabrir el port-forward (el anterior murió con el clúster),
obtener la contraseña nueva con el comando de 9.1 y mostrar las apps levantándose en la interfaz.

**E · Verificación posterior**
```bash
kubectl get applications -n argocd                          # todo Synced/Healthy
./P9/pruebas/datos.sh consultar dr_video                    # datos restaurados, misma huella
IP=$(kubectl get ingress -n sa-p9 -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}')
curl -s -c /tmp/c.txt -H 'Content-Type: application/json' \
  -d '{"username":"dr_video_1","password":"Recupera-2026"}' http://$IP/api/auth/login; echo
curl -s -b /tmp/c.txt http://$IP/api/auth/me; echo          # email descifrado: secretos continúan
kubectl run prueba-latest --image=nginx:latest -n sa-p9 --dry-run=server   # Kyverno lo rechaza
kubectl argo rollouts get rollout sa-platform-api-gateway -n sa-p9          # entrega progresiva operando
```

### 9.3 Después de grabar

- Subir el video (YouTube no listado o Drive **con acceso público**) y poner la URL y el minutaje real
  en la tabla de `P9/README.md`.
- La reconstrucción del video genera logs nuevos en `P9/evidencias/`; se pueden commitear junto a los
  existentes.
- Borrar los discos que deja el clúster destruido (`gcloud compute disks list --filter='-users:*'`)
  y, si ya no se usará, destruir el clúster: `terraform -chdir=P9/terraform/20-cluster destroy`.

---

## 10. Herramientas utilizadas (resumen teórico)

| Herramienta | Qué es | Para qué se usó en P9 |
|---|---|---|
| **Terraform** | Infraestructura como código: se describe la infraestructura en archivos `.tf` y Terraform la crea, cambia o destruye hasta que coincida | Crear en 4 capas el bucket de estado, la base de GCP, el clúster GKE, e instalar ArgoCD |
| **Backend remoto (GCS)** | Lugar donde Terraform guarda su estado (qué recursos existen) fuera de la máquina local, con bloqueo para que dos personas no apliquen a la vez | Que el estado sobreviva a la pérdida del clúster y de la laptop |
| **GKE** | Kubernetes administrado por Google Cloud | El clúster `sa-p9` (3 nodos) donde corre todo |
| **Kubernetes / kubectl** | Orquestador de contenedores; `kubectl` es su cliente de línea de comandos | Ejecutar y verificar la plataforma |
| **Helm** | Gestor de paquetes de Kubernetes: un *chart* es una plantilla de manifiestos que se llena con *values* | Chart `sa-platform` (un subchart por servicio + MySQL y RabbitMQ), valores por ambiente |
| **ArgoCD** | Herramienta GitOps: compara lo que hay en un repositorio Git con el clúster y aplica las diferencias | Desplegar todo desde el repo GitOps, sin `kubectl apply` manual |
| **App-of-apps** | Patrón de ArgoCD: una aplicación raíz cuyo contenido son otras aplicaciones | `root-sa-p9` crea las 7 apps hijas; basta instalarla para levantar todo |
| **Sync-waves** | Anotación de ArgoCD que define el orden en que se sincronizan los recursos | Operadores (0) → configuración y restauración (1) → plataforma (2) |
| **GitOps** | Práctica en la que Git es la única fuente de verdad del estado del sistema y los cambios entran por PR | El pipeline solo abre PRs; el clúster se reconstruye leyendo Git |
| **Argo Rollouts** | Reemplazo del `Deployment` que libera versiones por pasos (canary) y revierte solo si fallan las pruebas | `api-gateway` pasa por 20 → 50 → 80 → 100 % con análisis en cada paso |
| **AnalysisTemplate + k6** | Prueba automática que decide si un paso del canary sigue o se revierte; k6 es una herramienta de pruebas de carga | Smoke test (health, login, listado) con umbrales de error y latencia |
| **Kyverno** | Controlador de admisión: revisa cada recurso antes de crearlo y rechaza los que violan políticas | 3 políticas en `sa-p9`: sin `:latest`, con límites de CPU/memoria, sin root |
| **External Secrets Operator** | Operador que copia secretos de un gestor externo a `Secret` de Kubernetes | Traer contraseñas y la llave AES desde GCP Secret Manager |
| **GCP Secret Manager** | Almacén de secretos de Google Cloud, fuera del clúster | Guardar los 6 secretos para que sobrevivan a la pérdida del clúster |
| **Workload Identity / WIF** | Forma de que un pod (o GitHub Actions) actúe como una cuenta de servicio de GCP sin llaves JSON | Velero y ESO acceden a GCS/Secret Manager; el pipeline sube imágenes |
| **Velero** | Herramienta de respaldo y restauración de recursos y volúmenes de Kubernetes | Schedule cada hora del namespace `sa-p9` con volúmenes, hacia un bucket GCS |
| **File System Backup (Kopia)** | Modo de Velero que copia los archivos del volumen (en lugar de snapshots del disco) | Respaldar los datos de MySQL de forma portable a un clúster nuevo |
| **Artifact Registry** | Registro de imágenes de contenedor de Google Cloud | Guardar las imágenes de los 5 servicios con tags semver |
| **GitHub Actions** | Sistema de CI/CD de GitHub | Al crear un tag: `helm lint` → build → push → PR al repo GitOps |
| **Docker** | Empaqueta cada servicio con sus dependencias en una imagen | Construir las imágenes de los microservicios |
| **PDB, anti-afinidad, réplicas, HPA** | Mecanismos de Kubernetes: mínimo de pods disponibles durante interrupciones, repartir réplicas en nodos distintos, escalar según carga | Que el servicio siga respondiendo al drenar un nodo |
| **RTO / RPO** | RTO: cuánto tarda el sistema en volver a funcionar. RPO: cuántos datos (en tiempo) se pueden perder | Declarados 45 min / 1 h; medidos 23 min 18 s / 24 min 31 s |
