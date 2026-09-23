#!/usr/bin/env bash
# Apagar el entorno sin perder datos (P9).
#
#   ./P9/pruebas/apagar.sh
#
# 1. Respaldo final con retencion de 30 dias. Los respaldos por hora vencen
#    a las 72 h y Velero los borra al volver a arrancar: sin este respaldo, un
#    bootstrap despues de 3 dias no encontraria datos que restaurar.
# 2. terraform destroy de 20-cluster (las capas persistentes no se tocan).
# 3. Borra lo que GKE deja en GCP al perder el cluster: discos de los PVC y
#    el balanceador del Ingress (cobran aunque el cluster ya no exista).
#
# Para volver a levantar todo: ./P9/bootstrap.sh

set -euo pipefail

P9_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="project-2cbee419-ed7b-469e-89d"
ZONE="us-central1-a"
marca() { echo "[$(date -Is)] ==> $*"; }

# ------------------------------------------------------------ 1. Respaldo final
if kubectl get namespace sa-p9 >/dev/null 2>&1; then
  NOMBRE="antes-de-apagar-$(date +%Y%m%d%H%M)"
  marca "Respaldo final $NOMBRE (retencion 30 dias)"
  VELERO=$(kubectl get pod -n velero -l name=velero -o name)
  # La etiqueta del schedule hace que el Job restore-mysql lo encuentre al reconstruir.
  kubectl -n velero exec "$VELERO" -c velero -- /velero backup create "$NOMBRE" \
    --include-namespaces sa-p9 --default-volumes-to-fs-backup --ttl 720h \
    --labels velero.io/schedule-name=velero-sa-p9-hourly --wait
  fase=$(kubectl get backup "$NOMBRE" -n velero -o jsonpath='{.status.phase}')
  [ "$fase" = Completed ] || { marca "ERROR: el respaldo termino en $fase; no se destruye nada"; exit 1; }
  marca "Respaldo $NOMBRE Completed"
else
  marca "No hay cluster en operacion: se omite el respaldo"
fi

# ------------------------------------------------------------ 2. Cluster
marca "terraform destroy de 20-cluster"
terraform -chdir="$P9_DIR/terraform/20-cluster" init -no-color -input=false >/dev/null
terraform -chdir="$P9_DIR/terraform/20-cluster" destroy -auto-approve -no-color -input=false

if gcloud container clusters list --project "$PROJECT" --format='value(name)' | grep -q .; then
  marca "Hay otro cluster en el proyecto: no se borran recursos de balanceo ni discos"
  exit 0
fi

# ------------------------------------------------------------ 3. Huerfanos
borrar() {  # tipo, filtro de nombre, opciones de ubicacion
  local tipo="$1" filtro="$2"; shift 2
  for r in $(gcloud compute "$tipo" list --project "$PROJECT" --filter="name~$filtro" --format='value(name)'); do
    marca "Borrando $tipo $r"
    gcloud compute "$tipo" delete "$r" --project "$PROJECT" "$@" --quiet
  done
}

# Orden: de la regla de reenvio hacia atras, porque cada recurso usa al siguiente.
borrar forwarding-rules        '^k8s2-fr-' --global
borrar target-http-proxies     '^k8s2-tp-' --global
borrar url-maps                '^k8s2-um-' --global
borrar backend-services        '^k8s1-'    --global
borrar health-checks           '^k8s1-'    --global
borrar network-endpoint-groups '^k8s1-'    --zone "$ZONE"
borrar firewall-rules          '^k8s-fw-l7-'

# Discos de los PVC sin uso (ya estan respaldados en el bucket de Velero).
for d in $(gcloud compute disks list --project "$PROJECT" --filter='name~^pvc- AND -users:*' --format='value(name)'); do
  marca "Borrando disco $d"
  gcloud compute disks delete "$d" --project "$PROJECT" --zone "$ZONE" --quiet
done

marca "Entorno apagado. Quedan el estado, los respaldos, los secretos y las imagenes."
