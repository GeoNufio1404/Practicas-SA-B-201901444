# Ruta P6 (GKE) → P7 (CI/CD)
## P6 — Cloud deployment

1. Cuenta/CLI: crear proyecto GCP, habilitar gcloud, gke-gcloud-auth-plugin.
2. Cluster: gcloud container clusters create sa-p6 --num-nodes=2 --machine-type=e2-medium --zone=... (usar capa gratuita/créditos, nodos mínimos).
3. Registry: crear repo en Artifact Registry; docker build + docker tag + docker push de las 5 imágenes (auth, materiales, figuras, ordenes, gateway).
4. Adaptar values: nuevo values-gke.yaml — image.repository apuntando a Artifact Registry, pullPolicy: Always, quitar referencias a Minikube/local.
5. Storage: cambiar StorageClass de RabbitMQ/MySQL al standard-rw (o el que dé GKE) — revisar mysql.primary.persistence.storageClass y rabbitmq.persistence.storageClass en values.
6. Secrets: mismo patrón values.secrets.yaml (gitignored) + required — nada nuevo, solo confirmar no se suba.
7. Exposición pública: cambiar Ingress a GCEIngress/ingress-gce o usar Service type: LoadBalancer directo en api-gateway si el Ingress nginx no aplica en GKE gestionado (revisar si usas ingress-nginx via Helm o el controlador nativo de GCP).
8. Deploy: helm dependency update && helm install sa-platform . -f values.yaml -f values-gke.yaml -f values.secrets.yaml -n sa-p6 --create-namespace.
9. Verificar: kubectl get svc/ingress -n sa-p6 → IP pública, curl desde fuera.
10. Evidencia: pods running, IP pública respondiendo, consola GCP.
11. Docs: procedimiento completo, costo aproximado, 5 preguntas teóricas, procedimiento de eliminación (gcloud container clusters delete).
12. Cleanup: eliminar cluster al terminar (costos).