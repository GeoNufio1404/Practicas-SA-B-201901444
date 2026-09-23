#!/usr/bin/env bash
# Prueba de perdida de nodo (P9).
#
#   ./P9/pruebas/drenaje-nodo.sh <nodo> <usuario> <password>
#
# Mientras se drena el nodo, un bucle consulta la API cada 0.5 s:
#   - GET  /api/auth/health  (ruta Ingress -> api-gateway -> auth-service)
#   - POST /api/auth/login   (ademas consulta MySQL)
# Cada respuesta queda con su marca de tiempo en
# P9/evidencias/drenaje-<fecha>.log. Al final se reabre el nodo (uncordon).

set -euo pipefail

NODO="${1:?nodo}"; USUARIO="${2:?usuario}"; PASS="${3:?password}"
NS="sa-p9"
P9_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$P9_DIR/evidencias/drenaje-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG") 2>&1

marca() { echo "[$(date -Is)] ==> $*"; }
ip=$(kubectl get ingress -n "$NS" -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}')

sondeo() {
  while true; do
    h=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://$ip/api/auth/health" || true)
    l=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 -H 'Content-Type: application/json' \
      -d "{\"username\":\"$USUARIO\",\"password\":\"$PASS\"}" "http://$ip/api/auth/login" || true)
    echo "$(date +%H:%M:%S.%3N) health=$h login=$l"
    sleep 0.5
  done
}

marca "Pods de $NS en $NODO antes del drenaje:"
kubectl get pods -n "$NS" -o wide --field-selector "spec.nodeName=$NODO,status.phase=Running" --no-headers | awk '{print "    " $1}'
marca "PodDisruptionBudgets:"
kubectl get pdb -n "$NS" --no-headers | awk '{print "    " $1, "minAvailable=" $2, "allowed=" $4}'

sondeo &
PID_SONDEO=$!
trap 'kill $PID_SONDEO 2>/dev/null || true' EXIT

sleep 10
marca "kubectl drain $NODO"
kubectl drain "$NODO" --ignore-daemonsets --delete-emptydir-data --timeout=600s
marca "Drenaje completo. Distribucion de pods de $NS:"
kubectl get pods -n "$NS" -o wide --field-selector status.phase=Running --no-headers | awk '{print "    " $7, $1}' | sort

sleep 60
kill "$PID_SONDEO" 2>/dev/null || true
wait "$PID_SONDEO" 2>/dev/null || true

marca "kubectl uncordon $NODO"
kubectl uncordon "$NODO"

total=$(grep -c ' health=' "$LOG")
fallos_h=$(grep ' health=' "$LOG" | grep -vc 'health=200' || true)
fallos_l=$(grep ' health=' "$LOG" | grep -vc 'login=200' || true)
marca "Resumen: $total sondeos; health distinto de 200: $fallos_h; login distinto de 200: $fallos_l"
