# PedidosPresupuestoQuemaLenta

| | |
|---|---|
| **Severidad** | ticket: atender en horario laboral (mismo día) |
| **SLO** | 1. Crear pedidos funciona (99 % sin 5xx, 28 días) |
| **Condición** | Fracción de `POST /api/ordenes` con 5xx > 6 % en las últimas 6 h **y** en los últimos 30 min |

## Qué significa y por qué amerita intervención

Una parte de los pedidos falla de forma sostenida, sin llegar a una caída. A este ritmo el
presupuesto de 28 días se agota en menos de 5 días, y entonces cualquier incidente adicional deja
al servicio incumpliendo su objetivo. No justifica despertar a nadie (por eso es *ticket*), pero
sí corregirlo hoy: una degradación que nadie atiende se vuelve permanente.

## Diagnóstico

Mismo recorrido que [PedidosPresupuestoQuemaRapida](PedidosPresupuestoQuemaRapida.md#diagnóstico-objetivo-llegar-al-registro-del-error-en--3-min),
con foco en patrones, no en un evento puntual:

1. Tablero → *¿Qué servicio está devolviendo errores 5xx?* con rango de 6 h o 24 h: ¿empezó con un
   despliegue (cambio de `service_version`), crece con el tráfico, o es constante?
2. Loki, agrupando los errores por mensaje para ver cuál domina:
   ```logql
   sum by (service_name) (count_over_time({service_name=~"api-gateway|ordenes-service|figuras-service"} | severity_text="error" [30m]))
   ```
3. ¿Coincide con saturación? Fila *Saturación*: un pod al límite de memoria que se reinicia, o con
   throttling alto, produce errores intermitentes.
4. Abrir 2–3 trazas con error y comparar: ¿falla siempre el mismo salto?

## Mitigación

- Error de una versión: revertir en el repo GitOps.
- Recursos insuficientes: ajustar `resources` o réplicas en `values-gke.yaml` (PR en GitOps).
- Dependencia inestable: abrir issue con las trazas y registros como evidencia.

## Cierre

Cerrar el ticket cuando la ventana de 30 min esté bajo 6 % y la causa tenga corrección en Git (no un
cambio manual en el clúster).
