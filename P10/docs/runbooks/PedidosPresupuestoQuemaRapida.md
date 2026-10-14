# PedidosPresupuestoQuemaRapida

| | |
|---|---|
| **Severidad** | page: atender de inmediato, a cualquier hora |
| **SLO** | 1. Crear pedidos funciona (99 % sin 5xx, 28 días) |
| **Condición** | Fracción de `POST /api/ordenes` con 5xx > 14.4 % en la última hora **y** en los últimos 5 min |

## Qué significa y por qué amerita intervención

Los clientes no pueden registrar pedidos. A este ritmo, el presupuesto de error de 28 días se acaba
en menos de 2 días, y cada minuto son ventas perdidas. No es un pico pasajero: la ventana de 1 h
confirma que el problema es sostenido y la de 5 min confirma que sigue ocurriendo **ahora**.

## Diagnóstico (objetivo: llegar al registro del error en < 3 min)

Acceso a Grafana y recorrido completo: [README](README.md).

1. **¿Dónde?** Tablero *Operación PrintHub* → fila *Errores* → *¿Qué servicio está devolviendo errores 5xx?*
   - Solo `api-gateway` sube → el problema está en el gateway (código, configuración, versión nueva).
   - `api-gateway` **y** `ordenes-service` → el problema está en ordenes o en lo que ordenes llama.
   - Además `figuras-service` → el problema está en figuras (ordenes lo consulta para el precio).
2. **¿Qué petición?** Panel *¿Qué peticiones fallaron?* → abrir una traza reciente. El span en rojo
   es el que falló; su servicio y operación dicen el salto exacto.
3. **¿Por qué?** En la traza → *Logs for this span*, o en Explore → Loki:
   ```logql
   {service_name=~"api-gateway|ordenes-service|figuras-service"} | severity_text="error" | trace_id="<trace_id>"
   ```
   El registro trae el mensaje, el pod y `service_version` (¿es una versión recién desplegada?).

## Mitigación

| Causa encontrada | Acción |
|---|---|
| Versión nueva del gateway (canary o recién promovida) | `kubectl argo rollouts abort sa-platform-api-gateway -n sa-p9`; luego revertir el PR de versión en el repo GitOps |
| Configuración nueva (variable de entorno en `values-gke.yaml`) | Revertir el commit en el repo GitOps; ArgoCD lo aplica en ≤ 3 min |
| Servicio de atrás caído (pods no listos, reinicios) | `kubectl get pods -n sa-p9`; ver eventos y registros del pod (`kubectl describe pod`, `kubectl logs --previous`) |
| MySQL / RabbitMQ caído (SPOF) | Ver `sa-platform-mysql-0` / `sa-platform-rabbitmq-0`; si se perdieron datos: `P9/docs/runbook.md` (restauración con Velero) |

## Cierre

La alerta se apaga sola cuando la ventana de 5 min baja de 14.4 %. Confirmar en el tablero que el
panel de 5xx volvió a 0 y que *pedidos creados* volvió a su nivel normal. Registrar en el informe:
inicio, detección, causa, recuperación y presupuesto consumido.
