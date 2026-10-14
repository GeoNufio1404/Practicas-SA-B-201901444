# Runbooks de PrintHub

Un runbook por alerta. Todas las alertas son por **consumo del presupuesto de error** de un SLO
(ver [`../slo.md`](../slo.md)); no hay alertas por umbral instantáneo.

| Alerta | Severidad | Runbook |
|---|---|---|
| `PedidosPresupuestoQuemaRapida` | page (atender ya) | [PedidosPresupuestoQuemaRapida.md](PedidosPresupuestoQuemaRapida.md) |
| `PedidosPresupuestoQuemaLenta` | ticket (horario laboral) | [PedidosPresupuestoQuemaLenta.md](PedidosPresupuestoQuemaLenta.md) |
| `LatenciaPresupuestoQuemaRapida` | page (atender ya) | [LatenciaPresupuestoQuemaRapida.md](LatenciaPresupuestoQuemaRapida.md) |
| `LatenciaPresupuestoQuemaLenta` | ticket (horario laboral) | [LatenciaPresupuestoQuemaLenta.md](LatenciaPresupuestoQuemaLenta.md) |

## Acceso (común a todos)

```bash
gcloud container clusters get-credentials sa-p9 --zone us-central1-a --project project-2cbee419-ed7b-469e-89d

# Grafana -> http://localhost:3000  (tablero "Operación PrintHub")
kubectl port-forward -n observability svc/kube-prometheus-stack-grafana 3000:80
kubectl get secret -n observability kube-prometheus-stack-grafana \
  -o jsonpath='{.data.admin-password}' | base64 -d; echo      # usuario: admin

# Alertmanager -> http://localhost:9093 (alertas activas)
kubectl port-forward -n observability svc/kube-prometheus-stack-alertmanager 9093:9093
```

## Recorrido del síntoma a la causa (las tres señales)

1. **Alerta → tablero.** En "Operación PrintHub", fila *Errores* o *Latencia*: el panel por servicio
   dice **dónde** (gateway solo, o gateway + un servicio de atrás).
2. **Tablero → traza.** Panel *¿Qué peticiones fallaron?* (Tempo, `{ status = error }`), o en
   Explore → Tempo. La traza muestra el salto exacto que falló y su duración.
3. **Traza → registro.** En la traza, botón *Logs for this span* (Loki filtrado por `trace_id`): el
   registro JSON trae el mensaje de error, el servicio, la versión (`service_version`) y el pod.

También al revés: en el panel *¿Qué dicen los registros de error?* cada línea trae `trace_id`, que
abre la traza.

## Acciones de mitigación comunes

```bash
# ¿Hay un despliegue en curso o reciente del gateway?
kubectl argo rollouts get rollout sa-platform-api-gateway -n sa-p9
kubectl argo rollouts abort sa-platform-api-gateway -n sa-p9     # vuelve a la versión estable

# ¿Qué versión tiene cada pod? ¿Hay pods que no están listos o reinician?
kubectl get pods -n sa-p9 -L rollouts-pod-template-hash
kubectl get pods -n sa-p9 | grep -vE 'Running|Completed'

# La fuente de verdad es Git: la corrección definitiva es un revert / PR en el repo GitOps,
# no un kubectl edit (ArgoCD lo revertiría).
```
