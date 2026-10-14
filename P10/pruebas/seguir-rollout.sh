#!/usr/bin/env bash
# Registra con marcas de tiempo el avance de un Rollout del api-gateway y sus
# AnalysisRun (analisis por metricas de Prometheus) hasta que termina:
# promovido (Healthy) o abortado/revertido (Degraded).
#
#   ./P10/pruebas/seguir-rollout.sh <nombre-evidencia>
#
# Deja el registro en P10/evidencias/<nombre-evidencia>-<fecha>.log, con el
# detalle de cada medicion (consulta, valor y resultado) de los AnalysisRun.

set -euo pipefail

NOMBRE="${1:?uso: $0 <nombre-evidencia>}"
NS="sa-p9"
ROLLOUT="sa-platform-api-gateway"
DIR="$(cd "$(dirname "$0")/.." && pwd)/evidencias"
mkdir -p "$DIR"
LOG="$DIR/$NOMBRE-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG") 2>&1

marca() { echo "[$(date -Is)] $*"; }

rev_inicial=$(kubectl get rollout "$ROLLOUT" -n "$NS" -o jsonpath='{.status.currentPodHash}')
marca "Esperando una revision nueva del Rollout (hash actual: $rev_inicial)"
until [ "$(kubectl get rollout "$ROLLOUT" -n "$NS" -o jsonpath='{.status.currentPodHash}')" != "$rev_inicial" ]; do
  sleep 5
done
marca "Revision nueva: $(kubectl get rollout "$ROLLOUT" -n "$NS" -o jsonpath='{.status.currentPodHash}')"

anterior=""
while true; do
  fase=$(kubectl get rollout "$ROLLOUT" -n "$NS" -o jsonpath='{.status.phase}')
  paso=$(kubectl get rollout "$ROLLOUT" -n "$NS" -o jsonpath='{.status.currentStepIndex}')
  # Sin trafficRouting el peso es el ultimo setWeight alcanzado en los pasos.
  peso=$(kubectl get rollout "$ROLLOUT" -n "$NS" -o json | jq -r '
    (.status.currentStepIndex // 0) as $i
    | [.spec.strategy.canary.steps[0:$i][] | .setWeight // empty] | last // 0')
  abort=$(kubectl get rollout "$ROLLOUT" -n "$NS" -o jsonpath='{.status.abort}')
  runs=$(kubectl get analysisrun -n "$NS" --sort-by=.metadata.creationTimestamp --no-headers \
    -o custom-columns='N:.metadata.name,F:.status.phase' 2>/dev/null | tail -3 | tr '\n' ' ')
  actual="fase=$fase paso=$paso peso-canary=${peso:-0}% abortado=${abort:-false} | analisis: $runs"
  if [ "$actual" != "$anterior" ]; then
    marca "$actual"
    anterior="$actual"
  fi
  if [ "$fase" = "Healthy" ] || [ "$abort" = "true" ]; then
    break
  fi
  sleep 5
done

# Tras un abort, esperar a que la version estable vuelva al 100 %.
if [ "$abort" = "true" ]; then
  until [ "$(kubectl get rollout "$ROLLOUT" -n "$NS" -o jsonpath='{.status.phase}')" = "Degraded" ]; do sleep 5; done
  marca "Rollout abortado y revertido a la version estable: $(kubectl get rollout "$ROLLOUT" -n "$NS" -o jsonpath='{.status.message}')"
fi

marca "Resultado final"
kubectl argo rollouts get rollout "$ROLLOUT" -n "$NS" --no-color 2>/dev/null | sed 's/^/    /' || true

echo
marca "Mediciones de los AnalysisRun de esta revision"
for run in $(kubectl get analysisrun -n "$NS" --sort-by=.metadata.creationTimestamp -o name | tail -3); do
  kubectl get "$run" -n "$NS" -o json | jq -r '
    "  \(.metadata.name)  fase=\(.status.phase)  \(.status.message // "")",
    (.status.metricResults[]? | "    metrica \(.name): fase=\(.phase) exitosas=\(.successful // 0) fallidas=\(.failed // 0)",
      (.measurements[]? | "      \(.finishedAt)  valor=\(.value)  \(.phase)"))'
done
echo
marca "Consultas PromQL del AnalysisTemplate"
kubectl get analysistemplate sa-platform-api-gateway-metricas -n "$NS" -o json \
  | jq -r '.spec.metrics[] | "  \(.name)  (exito si: \(.successCondition))\n\(.provider.prometheus.query | split("\n") | map("    " + .) | join("\n"))"'
marca "Registro: ${LOG#"$(dirname "$DIR")"/}"
