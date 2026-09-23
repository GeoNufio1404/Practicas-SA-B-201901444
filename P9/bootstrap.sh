#!/usr/bin/env bash
# Bootstrap de dia cero - PUNTO DE ENTRADA UNICO de la reconstruccion (P9).
#
#   ./P9/bootstrap.sh
#
# 1. Terraform 20-cluster: crea el cluster GKE sa-p9 (o no hace nada si existe).
# 2. Terraform 30-platform: namespace, cuota, limites, RBAC, ArgoCD y la app
#    raiz root-sa-p9 (app-of-apps).
# 3. ArgoCD levanta el resto desde el repo GitOps, por sync-waves:
#      wave 0  argo-rollouts, kyverno, external-secrets, velero
#      wave 1  platform-config (politicas, ClusterSecretStore)
#              velero-restore  (restaura MySQL desde el ultimo respaldo)
#      wave 2  sa-platform
# 4. Verifica el resultado y deja el registro con marcas de tiempo en
#    P9/evidencias/bootstrap-<fecha>.log.
#
# Requisitos: gcloud autenticado, terraform, kubectl, curl. Las capas
# persistentes (00-state y 10-base) ya deben estar aplicadas: guardan el
# estado, los respaldos, las identidades y los secretos que sobreviven al cluster.

set -euo pipefail

P9_DIR="$(cd "$(dirname "$0")" && pwd)"
TF_DIR="$P9_DIR/terraform"
PROJECT="project-2cbee419-ed7b-469e-89d"
ZONE="us-central1-a"
CLUSTER="sa-p9"
APP_NS="sa-p9"
ROOT_APP="root-sa-p9"
STATE_BUCKET="sa-p9-tfstate-201901444"
TIMEOUT_APPS=2700   # 45 min para que ArgoCD deje todo Synced/Healthy

mkdir -p "$P9_DIR/evidencias"
LOG="$P9_DIR/evidencias/bootstrap-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG") 2>&1

T0=$(date +%s)
marca() { echo "[$(date -Is)] [+$(( $(date +%s) - T0 ))s] ==> $*"; }
falla() { marca "ERROR: $*"; exit 1; }

tf() {
  local capa="$1"; shift
  terraform -chdir="$TF_DIR/$capa" "$@" -no-color -input=false
}

marca "INICIO del bootstrap (log: ${LOG#"$P9_DIR"/})"

# ----------------------------------------------------------- 0. Verificaciones
for cmd in gcloud terraform kubectl curl; do
  command -v "$cmd" >/dev/null || falla "falta el comando $cmd"
done
gcloud auth print-access-token >/dev/null 2>&1 || falla "gcloud no esta autenticado"
gcloud storage ls "gs://$STATE_BUCKET/10-base/" >/dev/null 2>&1 \
  || falla "no existe el estado de 10-base en gs://$STATE_BUCKET (aplicar primero 00-state y 10-base)"

# ------------------------------------------------------- 1. Cluster (20-cluster)
marca "Terraform 20-cluster: cluster GKE $CLUSTER"
tf 20-cluster init
tf 20-cluster apply -auto-approve
marca "Cluster listo"

gcloud container clusters get-credentials "$CLUSTER" --zone "$ZONE" --project "$PROJECT"

# ---------------------------------------------- 2. ArgoCD + raiz (30-platform)
tf 30-platform init
# Si el cluster anterior se perdio, el estado de 30-platform describe objetos
# que murieron con el. Se descarta para que Terraform los cree de nuevo.
if ! kubectl get namespace argocd >/dev/null 2>&1; then
  huerfanos=$(tf 30-platform state list | grep -v '^data\.' || true)
  if [ -n "$huerfanos" ]; then
    marca "El estado de 30-platform apunta a un cluster que ya no existe: se descarta"
    # shellcheck disable=SC2086
    tf 30-platform state rm $huerfanos
  fi
fi

marca "Terraform 30-platform: namespace $APP_NS, cuota, limites, RBAC, ArgoCD y $ROOT_APP"
tf 30-platform apply -auto-approve
marca "ArgoCD instalado; la app raiz $ROOT_APP toma el control"

# ------------------------------------------- 3. Esperar al app-of-apps (ArgoCD)
estado_apps() {
  kubectl get applications -n argocd --no-headers \
    -o custom-columns='N:.metadata.name,S:.status.sync.status,H:.status.health.status' 2>/dev/null | sort
}

anterior=""
restauracion_reportada=0
while true; do
  actual=$(estado_apps)
  if [ "$actual" != "$anterior" ]; then
    marca "Estado de las Applications:"
    echo "${actual:-  (todavia ninguna)}" | sed 's/^/    /'
    anterior="$actual"
  fi

  if [ "$restauracion_reportada" = 0 ] && echo "$actual" | grep -Eq '^velero-restore +Synced +Healthy'; then
    marca "Restauracion de datos terminada. Log del Job restore-mysql:"
    kubectl logs job/restore-mysql -n velero 2>/dev/null | sed 's/^/    /' || true
    restauracion_reportada=1
  fi

  # Listo cuando la raiz y todas sus hijas estan Synced/Healthy.
  if [ -n "$actual" ] && echo "$actual" | grep -q "^$ROOT_APP " \
     && ! echo "$actual" | grep -Ev ' +Synced +Healthy$' | grep -q .; then
    break
  fi

  if [ $(( $(date +%s) - T0 )) -gt "$TIMEOUT_APPS" ]; then
    kubectl get pods -A | grep -Ev 'Running|Completed' || true
    falla "tiempo agotado esperando que las Applications esten Synced/Healthy"
  fi
  sleep 15
done
marca "Todas las Applications Synced/Healthy"

# ---------------------------------------------------------- 4. Verificacion
marca "Verificacion final"

echo "  Rollout api-gateway: $(kubectl get rollout sa-platform-api-gateway -n "$APP_NS" -o jsonpath='{.status.phase}' 2>/dev/null || echo 'no encontrado')"

echo "  Politicas de Kyverno:"
kubectl get clusterpolicies --no-headers \
  -o custom-columns='N:.metadata.name,READY:.status.conditions[?(@.type=="Ready")].status' | sed 's/^/    /'

echo "  ExternalSecrets en $APP_NS:"
kubectl get externalsecrets -n "$APP_NS" --no-headers \
  -o custom-columns='N:.metadata.name,ESTADO:.status.conditions[0].reason' | sed 's/^/    /'

echo "  Restauraciones de Velero:"
kubectl get restores.velero.io -n velero --no-headers \
  -o custom-columns='N:.metadata.name,FASE:.status.phase,ITEMS:.status.progress.itemsRestored' 2>/dev/null \
  | sed 's/^/    /' || true

usuarios=$(kubectl exec -n "$APP_NS" sa-platform-mysql-0 -c mysql -- \
  sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -N -e "SELECT COUNT(*) FROM auth_db.usuarios" 2>/dev/null' || echo "?")
echo "  Usuarios en auth_db.usuarios: $usuarios"

# El balanceador de GCE puede tardar unos minutos en publicar la IP.
ip=""
for _ in $(seq 1 40); do
  ip=$(kubectl get ingress -n "$APP_NS" -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)
  [ -n "$ip" ] && break
  sleep 15
done
if [ -n "$ip" ]; then
  codigo=""
  for _ in $(seq 1 40); do
    codigo=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://$ip/api/auth/health" || true)
    [ "$codigo" = 200 ] && break
    sleep 15
  done
  echo "  Ingress: http://$ip/api/auth/health -> HTTP $codigo"
else
  echo "  Ingress: sin IP publica todavia"
fi

marca "FIN del bootstrap. Duracion total: $(( ($(date +%s) - T0) / 60 )) min $(( ($(date +%s) - T0) % 60 )) s"
