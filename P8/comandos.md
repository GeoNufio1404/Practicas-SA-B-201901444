# GKE — Encender y apagar nodos

Cluster: `sa-p6`
Zona: `us-central1-a`

> **Importante:** apagar los nodos reduce el costo de las máquinas virtuales, pero **los discos persistentes (PVC/PV) pueden seguir generando costo** mientras existan.

---

## 🛑 APAGAR EL CLÚSTER

### 1. Verificar estado actual

```bash
gcloud container clusters list
```

```bash
kubectl get nodes
```

---

### 2. Apagar los nodos del `default-pool`

```bash
gcloud container clusters resize sa-p6 \
  --node-pool=default-pool \
  --num-nodes=0 \
  --zone=us-central1-a
```

---

### 3. Apagar el `small-pool`

```bash
gcloud container clusters resize sa-p6 \
  --node-pool=small-pool \
  --num-nodes=0 \
  --zone=us-central1-a
```

### 4. Comprobar

```bash
gcloud container clusters list
```

```bash
kubectl get nodes
```

Es normal que `kubectl get nodes` no muestre nodos mientras ambos pools están en `0`.

---

# 🟢 ENCENDER EL CLÚSTER

## 1. Encender `default-pool`

```bash
gcloud container clusters resize sa-p6 \
  --node-pool=default-pool \
  --num-nodes=2 \
  --zone=us-central1-a
```

## 2. Encender `small-pool`

```bash
gcloud container clusters resize sa-p6 \
  --node-pool=small-pool \
  --num-nodes=1 \
  --zone=us-central1-a
```

---

## 3. Esperar a que los nodos estén listos

```bash
kubectl get nodes -w
```

Cuando los nodos aparezcan como:

```text
STATUS
Ready
```

presiona `Ctrl+C`.

También puedes comprobarlos con:

```bash
kubectl get nodes
```

---

# 🔎 VERIFICACIÓN DESPUÉS DE ENCENDER

## Pods

```bash
kubectl get pods -n sa-p6 -o wide
```

Los servicios deberían terminar en:

```text
Running
```

Los CronJobs que hayan ejecutado trabajos pueden aparecer como:

```text
Completed
```

Eso es normal.

---

## PVC

```bash
kubectl get pvc -n sa-p6
```

Debe mantenerse:

```text
data-sa-platform-mysql-0       Bound
data-sa-platform-rabbitmq-0    Bound
```

No borrar estos PVC para "limpiar" el clúster.

---

## CronJobs

```bash
kubectl get cronjobs -n sa-p6
```

Deberían aparecer:

```text
SUSPEND
False
```

---

# ⚡ COMANDOS RÁPIDOS

## 🛑 Apagar

```bash
gcloud container clusters resize sa-p6 --node-pool=default-pool --num-nodes=0 --zone=us-central1-a
gcloud container clusters resize sa-p6 --node-pool=small-pool --num-nodes=0 --zone=us-central1-a
```

## 🟢 Encender

```bash
gcloud container clusters resize sa-p6 --node-pool=default-pool --num-nodes=2 --zone=us-central1-a
gcloud container clusters resize sa-p6 --node-pool=small-pool --num-nodes=1 --zone=us-central1-a
```

---

# 🎓 ANTES DE UNA CALIFICACIÓN

Después de encender los nodos:

```bash
kubectl get nodes
kubectl get pods -n sa-p6
kubectl get pvc -n sa-p6
kubectl get cronjobs -n sa-p6
```

Espera hasta que los pods principales estén `Running`.

Si MySQL y RabbitMQ aparecen `Running`, comprueba:

```bash
kubectl get endpoints -n sa-p6 sa-platform-mysql sa-platform-rabbitmq
```

Y finalmente:

```bash
kubectl get hpa -n sa-p6
```

Los cinco HPA deberían tener:

```text
MINPODS   1
REPLICAS  1
```

---

# ⚠️ NO HACER

No ejecutar para "apagar":

```bash
kubectl delete cluster
```

No eliminar:

```bash
kubectl delete pvc --all -n sa-p6
```

No eliminar los StatefulSets de MySQL/RabbitMQ.

El objetivo es **poner los node pools en 0**, no destruir el clúster ni sus datos.
