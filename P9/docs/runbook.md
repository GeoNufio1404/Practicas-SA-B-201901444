# Runbook de recuperación — plataforma PrintHub (`sa-p9`)

Procedimiento para reconstruir el entorno completo después de perder el clúster GKE, o para
recuperar datos borrados. Está escrito para alguien que no conoce el sistema: cada paso trae
el comando exacto y cómo verificar que funcionó antes de seguir.

| Dato | Valor |
|---|---|
| Proyecto GCP | `project-2cbee419-ed7b-469e-89d` |
| Clúster | `sa-p9` (GKE Standard zonal, `us-central1-a`, 3 × `e2-standard-2`) |
| Namespace de la aplicación | `sa-p9` |
| Repositorio de código | https://github.com/GeoNufio1404/Practicas-SA-B-201901444 (carpeta `P9/`) |
| Repositorio GitOps | https://github.com/GeoNufio1404/software-avanzado-gitops |
| App raíz de ArgoCD | `root-sa-p9` (namespace `argocd`) |
| Estado de Terraform | bucket GCS `sa-p9-tfstate-201901444` |
| Respaldos | Velero, schedule `velero-sa-p9-hourly` → bucket `sa-p9-velero-201901444` |
| Secretos | GCP Secret Manager, `sa-p9-*` |
| Tiempo esperado | ~35 min (RTO declarado: 45 min) |

## Qué sobrevive y qué se reconstruye

| Sobrevive a la pérdida del clúster (capas persistentes) | Se reconstruye (capas destruibles) |
|---|---|
| Bucket de estado de Terraform (`00-state`) | Clúster GKE y nodos (`20-cluster`) |
| APIs, Artifact Registry, bucket de Velero, cuentas de servicio, secretos, Workload Identity Federation (`10-base`) | Namespace, cuota, límites, RBAC, ArgoCD y app raíz (`30-platform`) |
| Imágenes en Artifact Registry | Todo lo que despliega ArgoCD desde el repo GitOps |
| Respaldos de Velero en GCS | Datos de MySQL: se restauran desde el último respaldo |

---

## 1. Preparación

### 1.1 Herramientas

| Herramienta | Versión probada | Verificar con |
|---|---|---|
| `gcloud` (con el componente `gke-gcloud-auth-plugin`) | 585 | `gcloud version` |
| `terraform` | 1.16 | `terraform version` |
| `kubectl` | 1.36 | `kubectl version --client` |
| `git`, `curl`, `python3` | cualquiera | — |

### 1.2 Acceso a GCP

```bash
gcloud auth login
gcloud auth application-default login      # Terraform usa estas credenciales
gcloud config set project project-2cbee419-ed7b-469e-89d
```

La cuenta necesita el rol **Editor** (o Owner) del proyecto.

**Verificar:** `gcloud auth print-access-token >/dev/null && echo OK` imprime `OK`.

### 1.3 Obtener el código

```bash
git clone https://github.com/GeoNufio1404/Practicas-SA-B-201901444.git
cd Practicas-SA-B-201901444
```

No hace falta clonar el repo GitOps: ArgoCD lo lee directamente desde GitHub (es público).

---

## 2. Comprobar que las capas persistentes siguen intactas

Si alguna de estas comprobaciones falla, ir a la [sección 6](#6-si-también-se-perdieron-las-capas-persistentes) antes de continuar.

```bash
# 2.1 Estado remoto de Terraform (debe listar 10-base/, 20-cluster/, 30-platform/)
gcloud storage ls gs://sa-p9-tfstate-201901444/

# 2.2 Respaldos de Velero (debe haber carpetas backups/velero-sa-p9-hourly-<fecha>/)
gcloud storage ls gs://sa-p9-velero-201901444/backups/ | tail -3

# 2.3 Secretos con versión cargada (cada uno debe mostrar una versión "enabled")
for s in $(gcloud secrets list --format='value(name)' --filter='name~sa-p9-'); do
  echo "$s: $(gcloud secrets versions list "$s" --filter=state=enabled --format='value(name)' | head -1)"
done

# 2.4 Imágenes de la aplicación
gcloud artifacts docker images list us-central1-docker.pkg.dev/project-2cbee419-ed7b-469e-89d/sa-p9 --include-tags | head
```

**Anotar** el respaldo más reciente de 2.2: es el punto al que volverán los datos (RPO).

---

## 3. Reconstruir: un solo comando

```bash
./P9/bootstrap.sh
```

No requiere intervención. El registro con marcas de tiempo queda en
`P9/evidencias/bootstrap-<fecha>.log`. Orden de lo que hace (ver `docs/diagrama-bootstrap.md`):

| # | Etapa | Duración típica | Marca en el log |
|---|---|---|---|
| 1 | `terraform apply` de `20-cluster`: clúster, pool de 3 nodos y enlaces de Workload Identity | ~12 min | `Cluster listo` |
| 2 | `gcloud container clusters get-credentials` | segundos | — |
| 3 | Si el estado de `30-platform` apunta al clúster perdido, lo descarta (`terraform state rm`) | segundos | `apunta a un cluster que ya no existe` |
| 4 | `terraform apply` de `30-platform`: namespace `sa-p9`, cuota, LimitRange, RBAC, ArgoCD y app raíz | ~2 min | `ArgoCD instalado` |
| 5 | ArgoCD, wave 0: `argo-rollouts`, `kyverno`, `external-secrets`, `velero` | ~4 min | `Estado de las Applications` |
| 6 | ArgoCD, wave 1: `platform-config` (políticas y ClusterSecretStore) y `velero-restore` (restaura MySQL) | ~4 min | `Restauracion de datos terminada` |
| 7 | ArgoCD, wave 2: `sa-platform` (MySQL, RabbitMQ, 5 servicios, CronJobs) | ~5 min | `Todas las Applications Synced/Healthy` |
| 8 | Verificación final y espera del balanceador | ~5 min | `FIN del bootstrap` |

**Verificar:** el log termina con `FIN del bootstrap` y la sección `Verificacion final` muestra:

- `Rollout api-gateway: Healthy`
- las 3 políticas de Kyverno con `True`
- los ExternalSecrets con `SecretSynced`
- un Restore `restore-mysql-velero-sa-p9-hourly-<fecha>` en `Completed`
- `Usuarios en auth_db.usuarios:` mayor que 0
- `Ingress: http://<IP>/api/auth/health -> HTTP 200`

Si el script se detiene con `ERROR`, ir a la [sección 5](#5-si-algo-falla). Es seguro volver a ejecutarlo:
cada etapa es idempotente.

---

## 4. Verificación manual (después del bootstrap)

```bash
# 4.1 Todas las Applications Synced/Healthy (8: la raíz y 7 hijas)
kubectl get applications -n argocd

# 4.2 La restauración de MySQL se hizo desde el último respaldo
kubectl logs job/restore-mysql -n velero
kubectl get restores.velero.io -n velero

# 4.3 Datos restaurados
kubectl exec -n sa-p9 sa-platform-mysql-0 -c mysql -- \
  sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" auth_db -e "SELECT id, username, creado_en FROM usuarios"'

# 4.4 Secretos descifrables: /me devuelve el email descifrado con la llave AES de Secret Manager
IP=$(kubectl get ingress -n sa-p9 -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}')
curl -s -c /tmp/c.txt -H 'Content-Type: application/json' \
  -d '{"username":"<usuario>","password":"<contraseña>"}' http://$IP/api/auth/login
curl -s -b /tmp/c.txt http://$IP/api/auth/me          # debe mostrar "email" en texto claro

# 4.5 Políticas de admisión activas: una imagen :latest debe ser RECHAZADA
kubectl run prueba-latest --image=nginx:latest -n sa-p9 --dry-run=server

# 4.6 Entrega progresiva operando
kubectl get rollout sa-platform-api-gateway -n sa-p9     # STATUS Healthy

# 4.7 Respaldos programados reanudados (el siguiente se crea a la hora en punto)
kubectl get schedules.velero.io,backupstoragelocations.velero.io -n velero
```

---

## 5. Si algo falla

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `20-cluster` falla con `QUOTA_EXCEEDED` | Cuotas `E2_CPUS` (8) o `SSD_TOTAL_GB` (250) ocupadas por otro clúster | `gcloud container clusters list`; eliminar clústeres sobrantes y reintentar `./P9/bootstrap.sh` |
| `30-platform` falla con errores de conexión a Kubernetes | Estado apuntando al clúster anterior | `terraform -chdir=P9/terraform/30-platform state list` y `state rm` de cada recurso (sin los `data.*`); reintentar |
| `velero-restore` queda `Degraded` | El Job `restore-mysql` falló | `kubectl logs job/restore-mysql -n velero`. Si dice `no hay respaldos Completed`: `kubectl get backups.velero.io -n velero` (Velero tarda ~1 min en leer el bucket). Si el Restore falló: `kubectl -n velero exec $(kubectl get pod -n velero -l name=velero -o name) -c velero -- /velero restore describe <restore> --details`. Corregir, borrar el Job (`kubectl delete job restore-mysql -n velero`) y ArgoCD lo vuelve a crear |
| `sa-platform` queda `Progressing` mucho tiempo | Pods sin arrancar | `kubectl get pods -n sa-p9`; `kubectl describe pod <pod> -n sa-p9`. Si un pod espera un secreto: `kubectl get externalsecrets -n sa-p9` |
| Pod de MySQL en `CreateContainerConfigError` | External Secrets aún no crea `sa-platform-mysql-auth` | Esperar a que `sa-platform` sincronice (crea los ExternalSecret); se resuelve solo |
| `Ingress: sin IP publica todavia` | El balanceador de GCE tarda | `kubectl get ingress -n sa-p9 -w` hasta que aparezca la IP (hasta 10 min) |
| Una app queda `OutOfSync` | Sincronización pendiente | `kubectl annotate application <app> -n argocd argocd.argoproj.io/refresh=hard --overwrite` |

---

## 6. Si también se perdieron las capas persistentes

Solo si la sección 2 falló. **Los datos de MySQL no se pueden recuperar si se perdió el bucket de Velero.**

1. **Bucket de estado** (si no existe):
   ```bash
   terraform -chdir=P9/terraform/00-state init
   terraform -chdir=P9/terraform/00-state apply
   ```
   Si el bucket existe pero falta el estado local de esta capa:
   `terraform -chdir=P9/terraform/00-state import google_storage_bucket.tfstate sa-p9-tfstate-201901444`.
2. **Capa base:**
   ```bash
   terraform -chdir=P9/terraform/10-base init
   terraform -chdir=P9/terraform/10-base apply
   ```
3. **Valores de los secretos:** Terraform solo crea los contenedores; los valores se cargan a mano
   (nunca pasan por Terraform ni por Git). Para cada secreto sin versión:
   ```bash
   openssl rand -base64 24 | tr -d '\n' | gcloud secrets versions add <secreto> --data-file=-
   # sa-p9-aes-key requiere 32 bytes en hexadecimal:
   openssl rand -hex 32 | tr -d '\n' | gcloud secrets versions add sa-p9-aes-key --data-file=-
   ```
   Con una llave AES nueva, los emails cifrados de respaldos anteriores **ya no se podrán descifrar**.
4. **Imágenes:** crear un tag nuevo (`git tag v1.0.2 && git push origin v1.0.2`); el pipeline las publica.
5. Continuar en la [sección 3](#3-reconstruir-un-solo-comando).

---

## 7. Recuperar datos borrados sin perder el clúster

Para un borrado lógico (filas eliminadas por error) con la plataforma funcionando:

```bash
# 7.1 Elegir el respaldo: el último anterior al borrado
kubectl get backups.velero.io -n velero --sort-by=.status.startTimestamp

# 7.2 Restaurar MySQL en un namespace aislado y reinsertar las filas perdidas
./P9/pruebas/restaurar-datos.sh <respaldo> <prefijo-de-username>
```

El script restaura una copia de MySQL en `sa-p9-recuperacion`, reinserta las filas que coinciden
con el prefijo (`INSERT IGNORE`, no pisa filas existentes) y borra la copia.
**Verificar** con `./P9/pruebas/datos.sh consultar <prefijo>`.

---

## 8. Después de la recuperación

1. Al perder un clúster, GKE no borra los discos de sus volúmenes ni el balanceador. Listarlos:
   ```bash
   gcloud compute disks list --filter='-users:*'           # discos sin uso
   gcloud compute forwarding-rules list
   ```
   Borrarlos solo después de confirmar que la restauración fue correcta (paso 4.3).
2. Registrar los tiempos del log en `P9/docs/informe-dr.md`.
