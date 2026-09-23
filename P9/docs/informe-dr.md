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

_Pendiente (Fase 11)._

## 3. Tiempos medidos

_Pendiente (Fase 11)._

## 4. Pérdida medida

_Pendiente (Fase 11)._

## 5. Puntos únicos de fallo detectados

_Pendiente (Fase 11)._

## 6. Brecha y plan

_Pendiente (Fase 11)._
