# Guía PrintHub — Práctica 8 (GitOps + Entrega progresiva + Seguridad)

> Continúa desde `GUIA_P6_P7.md`. Reutiliza el mismo cluster GKE y Artifact Registry.
> Evidencias/documentación quedan para el final (sección 11).
> **Cambio de paradigma respecto a P7:** P8 prohíbe explícitamente que el pipeline despliegue
> directo (`kubectl apply/set image/patch/create/delete`, `helm upgrade/install`, o guardar
> `kubeconfig`). Si en P7 llegaste a usar la "opción completa" (helm upgrade desde el workflow),
> **elimínala**: el pipeline de P7 se queda solo en build-test + docker-build-push, y en P8 se
> agrega el mecanismo de PR + ArgoCD descrito abajo.

---

## 0. Piezas nuevas y por qué

| Herramienta | Para qué | Por qué esta y no la alternativa |
|---|---|---|
| Terraform | namespace, quota, limits, RBAC | ya lo tenías contemplado en P6 como IaC |
| ArgoCD | único componente que aplica cambios al cluster | requisito explícito del enunciado |
| Argo Rollouts | canary con pasos + análisis | requisito explícito |
| Kyverno | políticas de admisión | YAML puro, sin Rego, instalación en 1 comando — más rápido que Gatekeeper para el alcance del curso |
| Sealed Secrets | secretos cifrados versionables | no depende de un secret store externo (Vault/GCP Secret Manager) — cero infraestructura adicional |
| Trivy + Cosign + SBOM | cadena de suministro | requisito explícito |
| k6 | validación de carga y umbral del canary | ya lo usas desde P5 (`P5/k6/load-test.js`) |

Namespace nuevo: **`sa-p8`**, en el mismo cluster `sa-p6`. No reutilices el namespace `sa-p6` con el release instalado a mano en P6/P7 — adoptar un release existente bajo ArgoCD genera conflictos de ownership. Empieza limpio, ArgoCD instala desde cero en `sa-p8`.

---

## 1. Dos repositorios

- **Repo de código** (el que ya usas): `.github/workflows/`, `P8/terraform/`, `P8/tests/`, `P8/README.md`. Aquí vive el pipeline.
- **Repo GitOps nuevo, público e independiente** (ej. `software-avanzado-gitops`): contiene los charts de Helm, los `values-*.yaml` por ambiente, el manifiesto de la `Application` de ArgoCD y las `SealedSecret`. Es lo único que ArgoCD lee.

```
software-avanzado-gitops/
├── charts/sa-platform/          # copia del chart de P6 (parent + 5 subcharts)
│   ├── values.yaml
│   ├── values-gke.yaml          # ArgoCD usa este + values.yaml
│   └── values-dev.yaml
├── argocd/application.yaml
├── policies/                    # ClusterPolicy de Kyverno
└── sealed-secrets/
```

El pipeline **nunca** hace `git push` directo a `main` de este repo — solo abre PR (sección 5).

---

## 2. Terraform — namespace, cuota, límites, RBAC

`P8/terraform/main.tf` en el repo de código:

```hcl
resource "kubernetes_namespace" "sa_p8" {
  metadata {
    name   = "sa-p8"
    labels = { "app.kubernetes.io/part-of" = "sa-platform" }
  }
}

resource "kubernetes_resource_quota" "sa_p8" {
  metadata {
    name      = "sa-p8-quota"
    namespace = kubernetes_namespace.sa_p8.metadata[0].name
  }
  spec {
    hard = {
      "requests.cpu"    = "2"
      "requests.memory" = "2Gi"
      "limits.cpu"      = "4"
      "limits.memory"   = "4Gi"
      "pods"            = "30"
    }
  }
}

resource "kubernetes_limit_range" "sa_p8" {
  metadata {
    name      = "sa-p8-limits"
    namespace = kubernetes_namespace.sa_p8.metadata[0].name
  }
  spec {
    limit {
      type            = "Container"
      default         = { cpu = "200m", memory = "256Mi" }
      default_request = { cpu = "100m", memory = "128Mi" }
    }
  }
}

resource "kubernetes_service_account" "ci_readonly" {
  metadata {
    name      = "ci-readonly"
    namespace = kubernetes_namespace.sa_p8.metadata[0].name
  }
}

resource "kubernetes_role" "ci_readonly" {
  metadata {
    name      = "ci-readonly-role"
    namespace = kubernetes_namespace.sa_p8.metadata[0].name
  }
  rule {
    api_groups = [""]
    resources  = ["pods", "services"]
    verbs      = ["get", "list"]
  }
}

resource "kubernetes_role_binding" "ci_readonly" {
  metadata {
    name      = "ci-readonly-binding"
    namespace = kubernetes_namespace.sa_p8.metadata[0].name
  }
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.ci_readonly.metadata[0].name
  }
  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.ci_readonly.metadata[0].name
    namespace = kubernetes_namespace.sa_p8.metadata[0].name
  }
}
```

`provider.tf` apunta al kubeconfig local (el mismo que ya usas contra GKE, `~/.kube/config`, contexto `gke_...`).

Aplicar **manualmente**, no desde el pipeline (guardar la salida para evidencia después):
```bash
cd P8/terraform
terraform init
terraform validate
terraform plan -out=plan.out
terraform apply plan.out
```

**No** crear ningún `resource "helm_release"` ni `resource "kubectl_manifest"` aquí — Terraform solo prepara el namespace, ArgoCD instala la app.

---

## 3. ArgoCD — instalación y Application

Instalar (manual, una vez):
```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl -n argocd rollout status deploy/argocd-server

# password inicial
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d

# acceso (opcional, para el CLI/UI)
kubectl -n argocd port-forward svc/argocd-server 8080:443
argocd login localhost:8080
```

`argocd/application.yaml` (vive en el repo GitOps):
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: sa-platform-p8
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/<usuario>/software-avanzado-gitops
    targetRevision: main
    path: charts/sa-platform
    helm:
      valueFiles:
        - values.yaml
        - values-gke.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: sa-p8
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Aplicar una sola vez, a mano (bootstrap — permitido, no pasa por el pipeline):
```bash
kubectl apply -f argocd/application.yaml
argocd app sync sa-platform-p8
argocd app get sa-platform-p8    # debe quedar Synced / Healthy
```

Guarda para tu `p8.conf`:
```
APP="sa-platform-p8"
NS="sa-p8"
```

---

## 4. Argo Rollouts — canary en api-gateway

Instalar el controlador (manual, una vez):
```bash
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
kubectl argo rollouts version
```

Convertir **solo api-gateway** (el más visible; si el tiempo alcanza, replicar en los demás). En el chart, dentro del repo GitOps:

`charts/sa-platform/charts/api-gateway/templates/deployment.yaml` — cambios mínimos:
```yaml
apiVersion: argoproj.io/v1alpha1   # antes: apps/v1
kind: Rollout                      # antes: Deployment
...
spec:
  strategy:
    canary:
      steps:
        - setWeight: 20
        - pause: { duration: 30s }
        - analysis:
            templates:
              - templateName: api-gateway-smoke-check
        - setWeight: 50
        - pause: { duration: 30s }
        - setWeight: 100
```
(todo lo demás del manifiesto —selector, template de pod, labels— se queda igual, solo cambian `apiVersion`, `kind` y el bloque `strategy`).

Nuevo `charts/sa-platform/charts/api-gateway/templates/analysistemplate.yaml`:
```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: api-gateway-smoke-check
spec:
  metrics:
    - name: smoke-and-load
      provider:
        job:
          spec:
            template:
              spec:
                containers:
                  - name: k6
                    image: grafana/k6:latest
                    command: ["k6", "run", "/scripts/load-test.js"]
                    volumeMounts:
                      - name: script
                        mountPath: /scripts
                volumes:
                  - name: script
                    configMap:
                      name: k6-load-test-script
                restartPolicy: Never
```

El ConfigMap `k6-load-test-script` se genera desde `P5/k6/load-test.js` (ya tiene los `thresholds`: `http_req_duration p(95)<800`, `http_req_failed rate<0.02` — reutilízalos, no los reinventes):
```bash
kubectl create configmap k6-load-test-script \
  --from-file=load-test.js=P5/k6/load-test.js \
  -n sa-p8
```
(o versiónalo como `ConfigMap` dentro del chart si prefieres que ArgoCD lo gestione también).

---

## 5. Pipeline CI/CD — build, escaneo, firma, PR (nada de deploy directo)

### Disparo por tag — versionamiento semántico obligatorio
```yaml
on:
  push:
    tags: ['v*.*.*']
```
Nada de `latest`. Cada release: `git tag v1.0.0 && git push origin v1.0.0`.

### Jobs (en orden)
1. `build-test` — igual que en P7.
2. `docker-build-push` — igual que en P7, pero el tag es `${{ github.ref_name }}` (ej. `v1.0.3`), nunca `latest`.
3. `trivy-scan` — bloquea si hay CVE críticas.
4. `sbom-and-sign` — SBOM + firma keyless con Cosign.
5. `open-pr-gitops` — actualiza el tag en el repo GitOps vía Pull Request.

```yaml
  trivy-scan:
    needs: docker-build-push
    runs-on: ubuntu-latest
    steps:
      - uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGION }}-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/${{ env.REPO }}/api-gateway:${{ github.ref_name }}
          format: table
          exit-code: '1'
          severity: 'CRITICAL'
```

```yaml
  sbom-and-sign:
    needs: trivy-scan
    runs-on: ubuntu-latest
    permissions:
      id-token: write   # obligatorio para firma keyless (OIDC de GitHub)
      contents: read
    steps:
      - uses: anchore/sbom-action@v0
        with:
          image: ${{ env.REGION }}-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/${{ env.REPO }}/api-gateway:${{ github.ref_name }}
          format: spdx-json
          output-file: sbom.spdx.json
      - uses: actions/upload-artifact@v4
        with: { name: sbom, path: sbom.spdx.json }
      - uses: sigstore/cosign-installer@v3
      - run: |
          cosign sign --yes \
            ${{ env.REGION }}-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/${{ env.REPO }}/api-gateway:${{ github.ref_name }}
```

```yaml
  open-pr-gitops:
    needs: sbom-and-sign
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          repository: <usuario>/software-avanzado-gitops
          token: ${{ secrets.GITOPS_PAT }}
          path: gitops

      - uses: azure/setup-helm@v4
      - run: helm lint --with-subcharts gitops/charts/sa-platform

      - name: Actualizar tag de imagen
        run: sed -i "s|tag: .*|tag: \"${{ github.ref_name }}\"|" gitops/charts/sa-platform/values-gke.yaml

      - uses: peter-evans/create-pull-request@v6
        with:
          token: ${{ secrets.GITOPS_PAT }}
          path: gitops
          branch: bump-${{ github.ref_name }}
          title: "Actualizar api-gateway a ${{ github.ref_name }}"
          commit-message: "chore: bump image tag to ${{ github.ref_name }}"
```

`GITOPS_PAT`: Personal Access Token (permiso `repo`) sobre el repo GitOps — es acceso a Git, **no** kubeconfig ni credencial de cluster.

El merge del PR es **manual** (tú lo apruebas). Al llegar a `main`, ArgoCD (con `selfHeal`/`automated`) lo detecta y lo aplica solo — ningún job del pipeline toca el cluster.

---

## 6. Kyverno — 3 políticas obligatorias

Instalar (manual, una vez):
```bash
helm repo add kyverno https://kyverno.github.io/kyverno/
helm install kyverno kyverno/kyverno -n kyverno --create-namespace
```

`policies/disallow-latest-tag.yaml`:
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata: { name: disallow-latest-tag }
spec:
  validationFailureAction: Enforce
  rules:
    - name: require-image-tag
      match: { resources: { kinds: ["Pod"] } }
      validate:
        message: "La etiqueta 'latest' esta prohibida."
        pattern:
          spec: { containers: [{ image: "!*:latest" }] }
```

`policies/require-resource-limits.yaml`:
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata: { name: require-resource-limits }
spec:
  validationFailureAction: Enforce
  rules:
    - name: require-limits
      match: { resources: { kinds: ["Pod"] } }
      validate:
        message: "Todo contenedor debe declarar limits de cpu y memory."
        pattern:
          spec:
            containers:
              - resources: { limits: { cpu: "?*", memory: "?*" } }
```

`policies/disallow-root.yaml`:
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata: { name: disallow-root-user }
spec:
  validationFailureAction: Enforce
  rules:
    - name: run-as-non-root
      match: { resources: { kinds: ["Pod"] } }
      validate:
        message: "Los contenedores deben ejecutarse sin privilegios de root."
        pattern:
          spec:
            =(securityContext): { runAsNonRoot: true }
```

Ya tienes `runAsNonRoot: true` desde P5 (`sa.securityContext` en `_helpers.tpl`) — esta política lo hace obligatorio, no debería romper nada existente.

```bash
kubectl apply -f policies/
kubectl get clusterpolicy
```

**Evidencia de rechazo** (manual, fuera del pipeline): aplicar un manifiesto que viole una política a propósito (imagen `:latest`, o sin límites) y guardar el mensaje de rechazo de Kyverno.

---

## 7. Sealed Secrets

Instalar (manual, una vez):
```bash
helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
helm install sealed-secrets sealed-secrets/sealed-secrets -n kube-system
# instalar el CLI kubeseal localmente
```

Sellar los secretos que hoy están en `values.secrets.yaml` (JWT_SECRET, AES_KEY, passwords de mysql/rabbitmq):
```bash
kubectl create secret generic sa-platform-app-secrets \
  --namespace sa-p8 \
  --from-literal=JWT_SECRET=... \
  --from-literal=AES_KEY=... \
  --dry-run=client -o yaml | kubeseal --format yaml > gitops/sealed-secrets/app-secrets.yaml
```
Ese `SealedSecret` sí se versiona en el repo GitOps (está cifrado; solo el controlador del cluster lo desencripta).

**Cambio mínimo en el chart:** donde hoy los templates inyectan `JWT_SECRET`/`AES_KEY` desde `.Values` directamente, usar `valueFrom.secretKeyRef` apuntando al Secret `sa-platform-app-secrets` ya existente (`existingSecret`), en vez de generarlo desde `values.secrets.yaml`. Se tocan solo esas 2-3 líneas de `env:`, no se rediseña el chart.

---

## 8. Fallo inducido — demo de reversión automática

1. Publicar un tag roto a propósito, ej. `v1.0.4-bad`, que rompa el `/health` del api-gateway o suba el `http_req_failed` por encima del umbral de k6.
2. Push del tag → pipeline corre → PR se abre → merge manual → ArgoCD sincroniza → Rollout entra en canary al 20% → el `AnalysisRun` corre el Job de k6 → falla el umbral → Argo Rollouts **aborta y revierte automáticamente**.
3. Capturar en el momento:
   ```bash
   kubectl argo rollouts get rollout api-gateway -n sa-p8
   kubectl get analysisrun -n sa-p8
   ```
   y anotar horas: push, detección, vuelta a estable (para el informe de incidente, sección 11).
4. Corregir con un tag bueno (`v1.0.5`) para que al momento de calificar el app esté `Synced`/`Healthy` (requisito eliminatorio) — **sin borrar** el `AnalysisRun` fallido anterior, es la evidencia de reversión que se revisa en el cluster.

---

## 9. Autoevaluación con el script del auxiliar

```bash
chmod +x verificar_p8.sh
./verificar_p8.sh --init
# editar p8.conf: CARNET, REPO_CODE, REPO_GITOPS, APP=sa-platform-p8, NS=sa-p8, IMAGE, COSIGN_IDENTITY_REGEXP/ISSUER
./verificar_p8.sh
```

Revisa `reporte_p8_<carnet>.txt`. Cosas puntuales que el script exige tal cual, no las pases por alto:
- `.github/workflows/` **sin** ninguna coincidencia de `kubectl apply|set image|patch|create|delete`, `helm upgrade|install`, ni `KUBE_CONFIG`/`kubeconfig` → eliminatorio si aparece.
- Ningún `resource "helm_release"` / `resource "kubectl_manifest"` en el código Terraform → eliminatorio si aparece.
- El workflow debe contener literalmente el string `helm lint` en algún paso.
- El workflow debe contener `peter-evans/create-pull-request` (o `gh pr create`) para el punto de PR automático.
- `argocd app get $APP` (o `kubectl get application $APP -n argocd`) con `sync=Synced` y `health=Healthy`, y `repoURL` debe coincidir con el nombre del repo GitOps.
- El primer `Rollout` que encuentre en `$NS` debe estar **gestionado por ArgoCD** (aparecer en el árbol de recursos de la Application) — por eso el chart con el `Rollout` vive en el repo GitOps, no se aplica a mano aparte.
- `AnalysisTemplate.spec.metrics[].provider.job` (o `.web`) debe existir de verdad — no un métrica dummy.
- Debe existir al menos un `AnalysisRun` con `phase: Failed/Error` **o** `rollout.status.abort=true` en el cluster al momento de correr el script (por eso no se borra la evidencia del paso 8).
- `clusterpolicy` ≥ 3 en el cluster.
- Ningún `password:`/`token:`/`apiKey:`/`secretKey:`/`clientSecret:` en texto plano en el repo GitOps → eliminatorio si aparece (por eso Sealed Secrets, sección 7).

---

## 10. Orden de ejecución recomendado
1. Crear repo GitOps + estructura de carpetas.
2. Terraform (`sa-p8`: namespace, quota, limits, RBAC) → `apply`.
3. Copiar charts de P6 al repo GitOps, confirmar `helm lint` local OK.
4. Instalar ArgoCD → `Application` manual → `Synced`/`Healthy`.
5. Instalar Argo Rollouts → convertir `api-gateway` a `Rollout` + `AnalysisTemplate`.
6. Reescribir el pipeline: quitar cualquier deploy directo heredado de P7 → build/test/push/trivy/sbom/cosign/PR.
7. Kyverno + 3 políticas.
8. Sealed Secrets, migrar los valores sensibles de `values.secrets.yaml`.
9. Conectar k6 + pruebas de humo/integración al `AnalysisTemplate`.
10. Fallo inducido, capturar evidencia de reversión.
11. Correr `verificar_p8.sh`, corregir lo que salga `[FALLA]`.
12. (Al final, sección 11) documentación, diagrama, informe de incidente, preguntas teóricas, video.

---

## 11. Pendiente para el final (no ahora)
- README de `/P8` con la tabla de enlaces obligatoria (repo GitOps, app ArgoCD, run del pipeline, run de la reversión, rechazo por política, PR bloqueado por vulnerabilidad, imagen firmada, reporte de k6, video).
- Documentación técnica (máx. 2 páginas).
- Diagrama del flujo GitOps (commit → cluster, marcando validaciones y reversión).
- Informe de incidente (5 campos: qué falló, cómo se detectó, cómo se contuvo, tiempo de recuperación, cómo prevenirlo).
- Preguntas teóricas.
- Video demostrativo (5-8 min).