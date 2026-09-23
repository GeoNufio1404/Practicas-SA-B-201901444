# Informe de la prueba de DR — Práctica 9

Hora local UTC-6. Evidencia en `P9/evidencias/`.

## 1. Objetivos declarados

Declarados el 2026-09-23 a las 03:38 (commit `3456d7e`), antes de las pruebas.

- **RTO 45 min**, medido desde que el clúster termina de destruirse hasta que todas las Applications están
  `Synced/Healthy`, la API responde HTTP 200 y los datos restaurados están en MySQL. La suma de etapas
  automáticas se estimó en ~32 min (clúster 12, ArgoCD 2, operadores 4, restauración 4, plataforma 5,
  balanceador 5, según tiempos ya observados); se agregó ~40 % de margen por la variabilidad de GKE.
- **RPO 1 h**: el schedule `velero-sa-p9-hourly` respalda el namespace `sa-p9` con sus volúmenes cada hora
  (retención 72 h) en un bucket GCS de otra región. Es aceptable para un sistema académico y mantiene bajo el
  costo de almacenamiento.

## 2. Escenario ejecutado

Pérdida total del clúster con la plataforma en operación (`pruebas/reconstruccion.sh`):

1. 11:24:57 — Último respaldo `Completed`: `velero-sa-p9-hourly-20260923170032` (inicio 11:00:32).
2. 11:24:58 — Se registran `dr_c_1` y `dr_c_2` después del respaldo, para medir la pérdida.
3. 11:25:03 — `terraform destroy` de `20-cluster`: pool de nodos y clúster. Se pierden ArgoCD, los operadores,
   la plataforma y los volúmenes. No se tocan el estado de Terraform, los respaldos, Secret Manager ni las imágenes.
4. 11:34:44 — Clúster destruido. 11:34:45 — `./P9/bootstrap.sh`, sin intervención.

## 3. Tiempos medidos

**RTO real: 23 min 18 s** (11:34:44 → 11:58:02). Desde el inicio de la destrucción: 32 min 59 s.

| Etapa | Medido | Estimado |
|---|---|---|
| Terraform 20-cluster (clúster + pool) | 11 min 02 s | 12 min |
| Terraform 30-platform (ArgoCD + app raíz) | 1 min 53 s | 2 min |
| Waves 0 y 1 hasta iniciar la restauración | 3 min 16 s | 4 min |
| Restauración de MySQL (Job `restore-mysql`) | 1 min 09 s | 4 min |
| Wave 2 hasta todo `Synced/Healthy` | 3 min 24 s | 5 min |
| Balanceador GCE hasta el primer HTTP 200 | 2 min 20 s | 5 min |

Tras reconstruir: Rollout `api-gateway` `Healthy`, Kyverno rechaza `nginx:latest`, 5 ExternalSecret en
`SecretSynced` y `/api/auth/me` devuelve descifrado el email de un usuario restaurado (la llave AES
sobrevivió en Secret Manager). Log: `verificacion-post-reconstruccion-20260923.log`.

## 4. Pérdida medida

**RPO real: 24 min 31 s** (11:00:32 inicio del respaldo → 11:25:03 pérdida).

- **Recuperado:** `dr_a_1..3`, con la misma huella SHA-256 (`8c1edc1a…`) y login correcto.
- **Perdido:** `dr_c_1..2`, escritos después del respaldo. También los mensajes en cola de RabbitMQ (solo se
  restaura MySQL) y los datos de materiales, figuras y órdenes (SQLite en `emptyDir`, fuera del plan de DR).

Prueba aparte de borrado lógico, sin perder el clúster (`restauracion-datos-20260923.log`): se borraron
`dr_a_*` y `dr_b_*`. `dr_a_*` volvió del respaldo con la misma huella y `dr_b_*`, posterior al respaldo, se
perdió. RPO de 7 min 29 s; recuperación en 2 min 35 s.

## 5. Puntos únicos de fallo detectados

1. **SQLite en `emptyDir`** (materiales, figuras, órdenes): se pierde al reiniciar un pod y no se restaura.
2. **MySQL con una sola instancia** y disco zonal `ReadWriteOnce`. En el drenaje se eligió un nodo sin MySQL
   (150/150 respuestas 200); si cae su nodo, auth deja de responder hasta que el pod se reprograma.
3. **Clúster zonal** (`us-central1-a`): si se pierde la zona, cae todo el sistema.
4. **Dependencias externas del bootstrap:** GitHub, los repositorios de Helm y Docker Hub (`bitnamilegacy`,
   ya descontinuado).
5. **Llave AES sin copia fuera del proyecto:** si se borra, los emails de todos los respaldos quedan ilegibles.
6. **Falla silenciosa detectada en el ensayo:** el Job buscaba el schedule `sa-p9-hourly`, pero su nombre real es
   `velero-sa-p9-hourly`. Sin respaldo, la plataforma habría levantado con MySQL vacía. Se corrigió, y ahora el Job
   falla y bloquea la wave 2.

## 6. Brecha y plan

| | Declarado | Medido | Brecha |
|---|---|---|---|
| RTO | 45 min | 23 min 18 s | 21 min de holgura; crear el clúster es el 48 % del tiempo |
| RPO | 1 h | 24 min 31 s | Se cumplió en la prueba, pero **en el peor caso llega a ~63 min**: cada respaldo tarda ~2.5 min |

El RTO sobró porque la estimación usó los tiempos más lentos observados. El RPO medido depende de la hora a la
que ocurrió la pérdida, no del diseño. Plan:

- **RPO:** respaldar cada 30 min; el peor caso baja a ~33 min.
- **SQLite:** mover esos servicios a MySQL, para que los cubran los respaldos.
- **MySQL:** réplica con failover o Cloud SQL regional.
- **Zona:** clúster regional.
- **Dependencias externas:** imágenes y charts en Artifact Registry.
- **Llave AES:** copia cifrada en otro proyecto.
