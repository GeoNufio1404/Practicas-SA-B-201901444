#!/usr/bin/env bash
# Prueba de recuperacion cronometrada (P9): destruir el cluster y reconstruirlo.
#
#   ./P9/pruebas/reconstruccion.sh
#
# 1. Registra el ultimo respaldo y escribe usuarios dr_c_* DESPUES de el
#    (se perderan: evidencia del RPO).
# 2. Destruye el cluster con Terraform (capa 20-cluster). Las capas
#    persistentes (estado, respaldos, identidades, secretos) no se tocan.
# 3. Ejecuta bootstrap.sh (punto de entrada unico).
# 4. Verifica los datos y calcula RTO y RPO reales.
# Registro: P9/evidencias/reconstruccion-<fecha>.log

set -euo pipefail

P9_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$P9_DIR/evidencias/reconstruccion-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG") 2>&1
marca() { echo "[$(date -Is)] ==> $*"; }
datos() { "$P9_DIR/pruebas/datos.sh" "$@"; }

marca "INICIO de la prueba de reconstruccion"

ultimo=$(kubectl get backups.velero.io -n velero -l velero.io/schedule-name=velero-sa-p9-hourly \
  --sort-by=.status.startTimestamp \
  -o jsonpath='{range .items[?(@.status.phase=="Completed")]}{.metadata.name} {.status.startTimestamp}{"\n"}{end}' | tail -n1)
BACKUP=${ultimo% *}; BACKUP_INICIO=${ultimo#* }
marca "Ultimo respaldo Completed: $BACKUP (inicio $BACKUP_INICIO)"

marca "Datos escritos despues del respaldo (se perderan):"
datos insertar dr_c 2
marca "Estado de los datos antes de la destruccion:"
datos consultar dr_a
datos consultar dr_c

T_PERDIDA=$(date +%s)
marca "DESTRUCCION del cluster: terraform destroy de 20-cluster"
terraform -chdir="$P9_DIR/terraform/20-cluster" init -no-color -input=false >/dev/null
terraform -chdir="$P9_DIR/terraform/20-cluster" destroy -auto-approve -no-color -input=false
T_DESTRUIDO=$(date +%s)
marca "Cluster destruido ($(( (T_DESTRUIDO - T_PERDIDA) / 60 )) min $(( (T_DESTRUIDO - T_PERDIDA) % 60 )) s). Empieza a correr el RTO"
gcloud container clusters list --project project-2cbee419-ed7b-469e-89d 2>&1

marca "RECONSTRUCCION: bootstrap.sh"
"$P9_DIR/bootstrap.sh"

marca "Verificacion de datos tras la reconstruccion:"
datos consultar dr_a
datos consultar dr_c
T_FIN=$(date +%s)

rto=$(( T_FIN - T_DESTRUIDO ))
rpo=$(( T_PERDIDA - $(date -d "$BACKUP_INICIO" +%s) ))
marca "RTO medido: $(( rto / 60 )) min $(( rto % 60 )) s (cluster destruido -> plataforma verificada)"
marca "RPO medido: $(( rpo / 60 )) min $(( rpo % 60 )) s (inicio del respaldo $BACKUP -> perdida)"
marca "FIN de la prueba de reconstruccion"
