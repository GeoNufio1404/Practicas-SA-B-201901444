# Límites de la instrumentación

Qué **no** puede ver, medir o decidir la observabilidad de PrintHub tal como está desplegada, con
la evidencia de cada caso y lo que haría para cerrarlo. Sirve de base para las preguntas teóricas.

## Cobertura

### 1. Solo 3 de los 5 servicios están instrumentados

`api-gateway`, `ordenes-service` y `figuras-service` tienen trazas, registros JSON y métricas.
`auth-service` y los dos CronJobs siguen con `console.log` en texto plano, y
`materiales-service` (Python) solo deja el registro de acceso de uvicorn. Ninguno tiene métricas
propias.

- **Consecuencia:** una traza de inicio de sesión termina en el span de cliente del gateway hacia
  `auth-service`, y desde ahí no se ve qué pasó adentro. El consumo de material
  (figuras → materiales) aparece como una llamada saliente sin continuación.
- **Qué haría:** instrumentar `auth-service` con el mismo `instrumentacion.mjs`, y
  `materiales-service` con `opentelemetry-instrument` de Python.

### 2. Los SLO solo miden la parte síncrona

Ambos SLI se miden en el gateway. Un pedido cuenta como bueno cuando el gateway responde sin 5xx,
pero la impresión ocurre después, por RabbitMQ (ordenes → figuras → materiales).

- **Evidencia:** el 13/10 a las 04:37 los consumidores de RabbitMQ no arrancaron
  (`No se pudo iniciar el consumidor`, visto en Loki). Los pedidos quedaron `pendiente` y el SLO
  siguió al 100 %, porque cada pedido ya había respondido 202. El bug se corrigió en v1.1.1.
- **Consecuencia:** el sistema puede estar "cumpliendo" mientras ningún pedido se imprime.
- **Qué haría:** un SLI de frescura, "% de pedidos que pasan de `pendiente` a `impreso` en
  menos de N min", a partir de una métrica de antigüedad del pedido más viejo sin procesar.

### 3. El tráfico es simulado

Los "usuarios" son el `generador-trafico` (k6, 4 peticiones/s, mitad pedidos y mitad consultas
GraphQL sobre 3 figuras). Las métricas, el canary y los SLO miden ese patrón y no el de usuarios
reales.

- **Consecuencia:** una regresión en una ruta que el generador no usa (registro, materiales, una
  figura con muchos materiales) no la ve el canary.

## Canary

### 4. Solo el gateway pasa por el canary

El `Rollout` y el `AnalysisTemplate` son del `api-gateway`. `ordenes-service` y `figuras-service`
siguen siendo `Deployment`: una versión mala de ellos llega al 100 % de una vez.

- **Consecuencia:** un fallo en esos servicios no se bloquea antes de llegar al usuario; lo
  detecta la alerta del SLO después de unos ~9–10 min. Por eso el recorrido de síntoma a causa
  usa un fallo fuera del gateway.
- **Qué haría:** convertir esos dos servicios en `Rollout` con el mismo AnalysisTemplate,
  parametrizado por servicio.

### 5. El peso del canary es aproximado

Sin `trafficRouting` (no hay service mesh ni Ingress con pesos), Argo Rollouts reparte el tráfico
por cantidad de pods detrás del mismo Service. Con 2 réplicas, el 20 % configurado es en la
práctica 1 pod canary contra 2 estables (~33 %).

- **Consecuencia:** el canary expone a más usuarios de lo que dicen los pasos, y un fallo en el
  canary se nota antes en el SLO.

### 6. Poco volumen y sin mínimo de peticiones

El canary recibe del orden de 1–2 peticiones/s, y la ventana de 2 min junta unas 150–250. El
análisis no exige un mínimo de peticiones.

- **Evidencia:** el primer intento de v1.1.1 se abortó con 2.8 % y 1.3 % de 5xx. Los errores eran
  reales (ordenes y figuras reiniciándose sin `preStop`), pero eran unas pocas peticiones
  ([evidencia](../evidencias/promocion-v1.1.1-20261013-232854.log)). Con tan poco volumen, 2
  errores ya superan el 1 %.
- **Consecuencia:** un error aislado puede abortar un despliegue sano; esa sensibilidad se
  aceptó a cambio de no promover nada sin poder medirlo (sin datos = fallo).
- **Qué haría:** agregar al AnalysisTemplate una condición de volumen mínimo y comparar el canary
  contra la versión estable en la misma ventana, en lugar de usar un umbral fijo.

## SLO y alertas

### 7. La ventana de 28 días es nominal

Prometheus guarda 3 días (`retention: 3d`) sin volumen persistente, y el entorno se apaga entre
sesiones. El "presupuesto consumido" corresponde al periodo observado, no a 28 días.

- **Qué haría:** almacenamiento persistente para Prometheus (o remote write a un almacén de largo
  plazo) y un clúster que no se apague.

### 8. Las alertas no notifican a nadie

Alertmanager no tiene receptores configurados (correo, Slack, PagerDuty). Las alertas se ven en
Alertmanager y en el panel *¿Hay algo que exija intervención ahora?* del tablero, pero no llegan
a nadie.

- **Consecuencia:** la severidad `page` está declarada pero no se ejecuta: una alerta que nadie
  ve se comporta como ninguna alerta.
- **Qué haría:** un receptor por severidad (`page` → notificación inmediata, `ticket` → canal de
  trabajo).

### 9. La detección es deliberadamente lenta

Con la alerta rápida (14.4× en 1 h y 5 min), una caída total de pedidos tarda ~9–10 min en
avisar, y un 30 % de fallos tarda ~29 min ([cálculo](slo.md#alertas)). Es el precio de no
despertar a nadie por un pico de 2 minutos.

## Plataforma de telemetría

### 10. El stack de telemetría tiene puntos únicos de fallo

Hay un solo Collector, un solo Loki (SingleBinary) y un solo Tempo, y no hay ninguna alerta sobre
la telemetría misma.

- **Consecuencia:** si el Collector cae se pierden trazas y registros en Loki. Los registros
  siguen en stdout (`kubectl logs`), pero nadie los recolecta. Las métricas no dependen del
  Collector.
- **Datos que no sobreviven a la reconstrucción:** Velero solo respalda el namespace `sa-p9`, así
  que métricas, trazas y registros se pierden al reconstruir el clúster.

### 11. Se guardan todas las trazas

No hay muestreo configurado (valor por defecto `parentbased_always_on`): se guarda el 100 % de
las trazas. A 4 peticiones/s no cuesta nada, pero con tráfico real haría falta muestreo, y sin
perder las trazas con error (*tail sampling* en el Collector).

### 12. La latencia se mide con un histograma

- El p95 del canary sale de `histogram_quantile`, que interpola dentro de la cubeta. Con cubetas
  de 0.25 y 0.5 s, un p95 informado de 0.4 s significa "entre 0.25 y 0.5 s".
- El SLO de latencia sí es exacto, porque 0.5 s es un límite de cubeta (`le="0.5"`).
- La latencia se mide dentro del servicio. No incluye el balanceador de GCP ni la red hasta el
  usuario.

### 13. Las NetworkPolicies no se aplican

Las reglas de red de P9 (y las que se agregaron para la telemetría) existen, pero el clúster no
tiene Dataplane V2 y no las aplica. Además, las de P9 seleccionan una etiqueta que los pods no
llevan. Hoy no bloquean nada, así que tampoco se probó que la telemetría funcione con ellas
activas.

### 14. Los IDs de traza no coinciden letra por letra

La API de Tempo devuelve los `trace_id` sin ceros a la izquierda, mientras que los registros los
guardan con 32 caracteres. Desde Grafana la correlación funciona, pero al buscar a mano en Loki
un ID copiado de Tempo hay que completarlo con ceros.
