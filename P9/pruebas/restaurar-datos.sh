#!/usr/bin/env bash
# Recuperacion de datos borrados desde un respaldo de Velero, sin detener la plataforma (P9).
#
#   ./P9/pruebas/restaurar-datos.sh <backup> <prefijo>
#
# 1. Velero restaura MySQL del respaldo en un namespace aislado (sa-p9-recuperacion).
# 2. Se exportan de esa copia las filas de usuarios con el prefijo y se reinsertan
#    en la MySQL en operacion (INSERT IGNORE: no pisa filas existentes).
# 3. Se elimina el namespace aislado.
#
# Si se pierde el volumen completo (clúster destruido), la restauracion la hace
# el Job restore-mysql del repo GitOps durante bootstrap.sh; este script cubre
# el borrado logico de filas.

set -euo pipefail

BACKUP="${1:?backup}"; PREFIJO="${2:?prefijo}"
case "$PREFIJO" in *[!a-z0-9_]*) echo "prefijo invalido: solo [a-z0-9_]"; exit 1 ;; esac
NS="sa-p9"
NS_TMP="sa-p9-recuperacion"
RESTORE="recuperacion-$(date +%Y%m%d%H%M%S)"
POD="sa-platform-mysql-0"
marca() { echo "[$(date -Is)] ==> $*"; }

marca "Restore $RESTORE del respaldo $BACKUP en el namespace $NS_TMP"
kubectl create -f - <<EOF
apiVersion: velero.io/v1
kind: Restore
metadata:
  name: $RESTORE
  namespace: velero
spec:
  backupName: $BACKUP
  includedNamespaces: [$NS]
  namespaceMapping: { $NS: $NS_TMP }
  includedResources: [serviceaccounts, configmaps, persistentvolumeclaims, persistentvolumes, pods, statefulsets]
  labelSelector:
    matchLabels:
      app.kubernetes.io/instance: sa-platform
      app.kubernetes.io/name: mysql
  restorePVs: true
EOF

while true; do
  fase=$(kubectl get restore "$RESTORE" -n velero -o jsonpath='{.status.phase}')
  case "$fase" in
    Completed) break ;;
    PartiallyFailed|Failed|FailedValidation)
      marca "ERROR: restore en $fase"; kubectl get restore "$RESTORE" -n velero -o jsonpath='{.status}'; exit 1 ;;
  esac
  sleep 10
done
marca "Restore Completed: $(kubectl get restore "$RESTORE" -n velero -o jsonpath='{.status.progress}')"

# La copia necesita la contrasena de root (en produccion la crea External Secrets).
kubectl get secret sa-platform-mysql-auth -n "$NS" -o json \
  | python3 -c "import json,sys; s=json.load(sys.stdin); s['metadata']={'name':s['metadata']['name'],'namespace':'$NS_TMP'}; print(json.dumps(s))" \
  | kubectl apply -f - >/dev/null
kubectl wait pod/"$POD" -n "$NS_TMP" --for=condition=Ready --timeout=300s

marca "Filas con prefijo ${PREFIJO}_ en la copia restaurada:"
kubectl exec -n "$NS_TMP" "$POD" -c mysql -- sh -c \
  'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" auth_db -e "SELECT id, username, creado_en FROM usuarios WHERE username LIKE '"'${PREFIJO}\\\\_%'"' ORDER BY id" 2>/dev/null'

marca "Reinsertando en la MySQL en operacion ($NS)"
kubectl exec -n "$NS_TMP" "$POD" -c mysql -- sh -c \
  'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --no-create-info --skip-triggers --insert-ignore --compact auth_db usuarios --where="username LIKE '"'${PREFIJO}\\\\_%'"'" 2>/dev/null' \
  | kubectl exec -i -n "$NS" "$POD" -c mysql -- sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" auth_db 2>/dev/null'

marca "Eliminando el namespace temporal $NS_TMP"
kubectl delete namespace "$NS_TMP" --wait=true --timeout=300s >/dev/null
marca "Recuperacion terminada"
