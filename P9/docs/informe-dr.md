# Informe de la prueba de DR — Práctica 9

## 1. Objetivos declarados

Declarados el **2026-09-23 03:38 (UTC-6)**, commit `3456d7e`, antes de ejecutar las pruebas.

| Objetivo | Valor | Cómo se mide |
|---|---|---|
| **RTO** | **45 min** | Desde que el clúster termina de destruirse hasta que `bootstrap.sh` deja todas las Applications `Synced/Healthy`, la API responde HTTP 200 por el Ingress y los datos restaurados están en MySQL |
| **RPO** | **1 h** | Tiempo entre el último respaldo `Completed` y el momento de la pérdida. Lo escrito en ese intervalo se pierde |

**Justificación del RTO.** La reconstrucción no tiene pasos manuales; su duración es la suma de las etapas
automáticas, estimada con tiempos ya observados en este proyecto:

| Etapa | Estimado | Referencia |
|---|---|---|
| Terraform 20-cluster (plano de control + 3 nodos) | ~12 min | Primera creación: 11.5 min |
| Terraform 30-platform (ArgoCD + app raíz) | ~2 min | `helm_release.argocd`: 1 min 33 s |
| Wave 0: operadores (Rollouts, Kyverno, ESO, Velero) | ~4 min | — |
| Wave 1: restauración de MySQL con Velero | ~4 min | Prueba en namespace aislado: 3 min 28 s (206 MB) |
| Wave 2: plataforma (MySQL, RabbitMQ, 5 servicios) | ~5 min | — |
| Balanceador GCE del Ingress | ~5 min | — |
| **Total** | **~32 min** | |

Se declaran 45 min: el tiempo estimado más un margen de ~40 % por la variabilidad de GKE al crear
nodos y balanceadores. No incluye el tiempo de detección del incidente (la prueba es planificada).

**Justificación del RPO.** El `Schedule` de Velero `velero-sa-p9-hourly` respalda el namespace `sa-p9` con sus
volúmenes cada hora (`0 * * * *`, retención 72 h) en un bucket GCS fuera del clúster. En el peor caso
la pérdida ocurre justo antes del siguiente respaldo: se pierde hasta 1 h de escrituras. Para un sistema
académico sin transacciones críticas es aceptable y mantiene bajo el costo de almacenamiento.

## 2. Escenario ejecutado

Pérdida total del clúster GKE `sa-p9` el 2026-09-23, con la plataforma en operación
(`pruebas/reconstruccion.sh`). Hora local UTC-6.

1. **11:24:57** Último respaldo `Completed`: `velero-sa-p9-hourly-20260923170032` (inicio 11:00:32).
2. **11:24:58** Se registran `dr_c_1` y `dr_c_2` por la API, **después** del respaldo, para medir la pérdida.
3. **11:25:03** `terraform destroy` de la capa `20-cluster`: primero el pool de nodos, después el clúster.
   Con ellos se pierden todo lo que corría dentro, ArgoCD, los operadores y los volúmenes de MySQL y RabbitMQ.
   Las capas persistentes (estado de Terraform, bucket de Velero, Secret Manager, Artifact Registry) no se tocan.
4. **11:34:44** Clúster destruido (9 min 41 s).
5. **11:34:45** `./P9/bootstrap.sh`, sin intervención hasta el final.

Evidencia: `evidencias/reconstruccion-20260923-112456.log`, `evidencias/bootstrap-20260923-113445.log`
y `evidencias/verificacion-post-reconstruccion-20260923.log`.

## 3. Tiempos medidos

**RTO real: 23 min 18 s** (11:34:44 clúster destruido → 11:58:02 datos verificados). Si se cuenta desde el
inicio de la destrucción: 32 min 59 s. En ambos casos queda bajo el objetivo de 45 min.

| Etapa | Inicio → fin | Medido | Estimado |
|---|---|---|---|
| Terraform 20-cluster (clúster 9 min 33 s + pool 1 min 23 s) | 11:34:47 → 11:45:49 | 11 min 02 s | ~12 min |
| Terraform 30-platform (ArgoCD 1 min 28 s + app raíz) | 11:45:55 → 11:47:48 | 1 min 53 s | ~2 min |
| Wave 0 y wave 1 hasta iniciar la restauración | 11:47:48 → 11:51:04 | 3 min 16 s | ~4 min |
| Restauración de MySQL (Job `restore-mysql`, 7 ítems) | 11:51:04 → 11:52:13 | 1 min 09 s | ~4 min |
| Wave 2 hasta todo `Synced/Healthy` | 11:52:13 → 11:55:37 | 3 min 24 s | ~5 min |
| Balanceador GCE: primer HTTP 200 | 11:55:37 → 11:57:57 | 2 min 20 s | ~5 min |
| Verificación de datos | 11:57:57 → 11:58:02 | 5 s | — |

Tras la reconstrucción (verificado a las 11:58): 8 Applications `Synced/Healthy`; Rollout `api-gateway`
`Healthy` con la imagen `1.0.1`; Kyverno rechaza un Pod con `nginx:latest`; los 5 ExternalSecret en `SecretSynced`
y `/api/auth/me` devuelve descifrado el email de un usuario restaurado (misma llave AES de Secret Manager);
el Schedule `velero-sa-p9-hourly` quedó `Enabled` otra vez.

## 4. Pérdida medida

**RPO real: 24 min 31 s** (11:00:32 inicio del respaldo → 11:25:03 pérdida).

| Dato | Resultado |
|---|---|
| `dr_a_1..3` (en el respaldo) | Restaurados, con huella SHA-256 idéntica (`8c1edc1a…`) y login correcto |
| `dr_c_1..2` (escritos a las 11:24:58) | **Perdidos**: se escribieron después del respaldo |
| Mensajes en colas de RabbitMQ | **Perdidos**: solo se restaura MySQL; las colas son transitorias (resúmenes del CronJob) |
| Datos de materiales, figuras y órdenes | **Perdidos**: usan SQLite en `emptyDir`, que no se restaura; cada réplica tenía además su propia copia |

Prueba adicional de borrado lógico sin perder el clúster (`evidencias/restauracion-datos-20260923.log`):
se borraron `dr_a_*` y `dr_b_*`; `dr_a_*` volvió desde el respaldo de las 10:00 con la misma huella, y `dr_b_*`,
escrito después, se perdió. RPO 7 min 29 s; recuperación en 2 min 35 s con `pruebas/restaurar-datos.sh`.

## 5. Puntos únicos de fallo detectados

1. **SQLite en `emptyDir`** (materiales, figuras, órdenes): los datos se pierden al reiniciar un pod, y el
   plan de DR no los cubre. Es la pérdida más grande del sistema.
2. **Una sola instancia de MySQL** con disco zonal `ReadWriteOnce`. En la prueba de drenaje se eligió un nodo
   sin MySQL (`evidencias/drenaje-20260923-112116.log`: 150 de 150 sondeos respondieron 200). Si cae su nodo, auth no
   responde hasta que el pod se reprograma y el disco se vuelve a montar.
3. **Clúster zonal** (`us-central1-a`): si se pierde la zona, se pierde todo. Los respaldos (us-east1)
   sobreviven, pero habría que reconstruir en otra zona.
4. **Dependencias externas del bootstrap**: GitHub (repo GitOps), los repositorios de Helm de ArgoCD,
   Kyverno, Velero y External Secrets, y Docker Hub (`bitnamilegacy/*`, repositorio ya descontinuado). Si
   alguno no responde, la reconstrucción se detiene.
5. **La llave AES en Secret Manager** no tiene copia fuera del proyecto. Si se borra el secreto, los emails
   cifrados de todos los respaldos quedan ilegibles.
6. **Falla silenciosa detectada en el ensayo.** La primera versión del Job buscaba el schedule `sa-p9-hourly`,
   pero el chart lo nombra `velero-sa-p9-hourly`. Sin respaldos, el Job terminaba bien y la plataforma habría
   levantado con MySQL vacía. Se corrigió antes de la prueba, y ahora el Job falla y bloquea la wave 2 si no
   encuentra respaldo.

## 6. Brecha y plan

| Objetivo | Declarado | Medido | Brecha |
|---|---|---|---|
| RTO | 45 min | 23 min 18 s | Holgura de 21 min. Lo que más pesa es crear el clúster (48 %) |
| RPO | 1 h | 24 min 31 s | Se cumplió en esta prueba. **En el peor caso no se cumple**: un respaldo tarda ~2.5 min (16:00:32 → 16:03:04), así que lo escrito justo después de un respaldo se pierde si el siguiente no alcanza a terminar: hasta ~63 min |

El RTO sobró porque la estimación usó los tiempos más lentos observados (restauración de prueba: 3.5 min contra
1 min 9 s medido). El RPO de esta prueba depende de la hora a la que ocurrió la pérdida, no del diseño.

**Plan para cerrar las brechas y los SPOF:**

- **RPO:** programar el respaldo cada 30 min (`*/30 * * * *`). El peor caso queda en ~33 min, bajo el objetivo,
  a cambio del doble de almacenamiento en el bucket.
- **SQLite:** mover materiales, figuras y órdenes a MySQL (una base por servicio), para que la cubran los
  mismos respaldos y la misma restauración.
- **MySQL:** réplica con failover, o Cloud SQL regional, para no depender de un solo pod ni de una sola zona.
- **Zona:** clúster regional, o una variable de zona en `20-cluster` para reconstruir en otra.
- **Dependencias externas:** copiar las imágenes `bitnamilegacy/*` y los charts a Artifact Registry.
- **Llave AES:** exportarla cifrada a un segundo proyecto o a una bóveda offline.
