#!/usr/bin/env bash
# Datos verificables para las pruebas de restauracion (P9).
#
#   ./P9/pruebas/datos.sh insertar <prefijo> <n>   registra n usuarios por la API publica
#   ./P9/pruebas/datos.sh consultar <prefijo>      lista los usuarios del prefijo y su huella
#   ./P9/pruebas/datos.sh borrar <prefijo>         elimina los usuarios del prefijo (perdida de datos)
#
# La huella (SHA-256 de username, email cifrado, IV, tag y hash de la
# contrasena) permite comparar el contenido antes y despues de restaurar.

set -euo pipefail

NS="sa-p9"
POD="sa-platform-mysql-0"

sql() {
  kubectl exec -n "$NS" "$POD" -c mysql -- \
    sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" auth_db -e "$0" 2>/dev/null' "$1"
}

ingress_ip() {
  kubectl get ingress -n "$NS" -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}'
}

accion="${1:-}"; prefijo="${2:-}"
[ -n "$accion" ] && [ -n "$prefijo" ] || { sed -n '3,6p' "$0"; exit 1; }
case "$prefijo" in *[!a-z0-9_]*) echo "prefijo invalido: solo [a-z0-9_]"; exit 1 ;; esac

case "$accion" in
  insertar)
    n="${3:-3}"; ip=$(ingress_ip)
    for i in $(seq 1 "$n"); do
      codigo=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 \
        -H 'Content-Type: application/json' \
        -d "{\"username\":\"${prefijo}_$i\",\"email\":\"${prefijo}_$i@dr.test\",\"password\":\"Recupera-2026\"}" \
        "http://$ip/api/auth/register")
      echo "$(date -Is) POST /api/auth/register ${prefijo}_$i -> HTTP $codigo"
    done
    ;;
  consultar)
    echo "$(date -Is) usuarios con prefijo ${prefijo}_:"
    sql "SELECT id, username, creado_en FROM usuarios WHERE username LIKE '${prefijo}\\_%' ORDER BY id"
    sql "SELECT COUNT(*) AS total, SHA2(GROUP_CONCAT(CONCAT_WS('|', username, email_cifrado, email_iv, email_auth_tag, password_hash) ORDER BY username), 256) AS huella FROM usuarios WHERE username LIKE '${prefijo}\\_%'"
    ;;
  borrar)
    echo "$(date -Is) DELETE usuarios con prefijo ${prefijo}_"
    sql "DELETE FROM usuarios WHERE username LIKE '${prefijo}\\_%'; SELECT ROW_COUNT() AS borrados"
    ;;
  *) sed -n '3,6p' "$0"; exit 1 ;;
esac
