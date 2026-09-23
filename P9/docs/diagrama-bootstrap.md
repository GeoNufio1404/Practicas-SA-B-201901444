# Diagrama del bootstrap

Orden de reconstrucción del entorno `sa-p9` y dependencias entre componentes. Se distingue lo que
se hace **una sola vez a mano** (capas persistentes, antes de cualquier desastre), lo que dispara el
operador en la recuperación (**un solo comando**) y lo que ocurre **automáticamente**.

```mermaid
flowchart TD
    classDef manual fill:#fde2e1,stroke:#c0392b,color:#000
    classDef entrada fill:#fff3cd,stroke:#b7950b,color:#000
    classDef tf fill:#dbeafe,stroke:#1d4ed8,color:#000
    classDef argo fill:#dcfce7,stroke:#15803d,color:#000
    classDef ext fill:#f3f4f6,stroke:#6b7280,color:#000,stroke-dasharray: 4 3

    subgraph PREVIO["Una sola vez, antes del desastre (manual)"]
        S00["terraform apply 00-state<br/>bucket de estado GCS"]:::manual
        S10["terraform apply 10-base<br/>APIs · Artifact Registry · bucket Velero<br/>cuentas de servicio · Secret Manager · WIF"]:::manual
        SEC["gcloud secrets versions add<br/>valores de los 6 secretos"]:::manual
        S00 --> S10 --> SEC
    end

    subgraph PERSISTE["Sobrevive a la pérdida del clúster"]
        GCS[("gs://sa-p9-tfstate-201901444<br/>estado de Terraform")]:::ext
        VEL[("gs://sa-p9-velero-201901444<br/>respaldos cada hora")]:::ext
        SM[("Secret Manager<br/>sa-p9-*")]:::ext
        AR[("Artifact Registry sa-p9<br/>imágenes")]:::ext
        GIT[("Repo GitOps público<br/>software-avanzado-gitops")]:::ext
    end

    START(["./P9/bootstrap.sh<br/>ÚNICO paso del operador"]):::entrada

    subgraph TF["Terraform (automático)"]
        T20["1 · 20-cluster<br/>GKE sa-p9 + 3 nodos<br/>enlaces Workload Identity"]:::tf
        CRED["2 · get-credentials"]:::tf
        HUE["3 · descartar estado huérfano<br/>de 30-platform (si el clúster se perdió)"]:::tf
        T30["4 · 30-platform<br/>namespace sa-p9 · cuota · LimitRange · RBAC<br/>ArgoCD · app raíz root-sa-p9"]:::tf
        T20 --> CRED --> HUE --> T30
    end

    subgraph ARGO["ArgoCD app-of-apps (automático, por sync-waves)"]
        W0["wave 0 · operadores<br/>argo-rollouts · kyverno<br/>external-secrets · velero"]:::argo
        W1A["wave 1 · platform-config<br/>3 políticas Kyverno<br/>ClusterSecretStore"]:::argo
        W1B["wave 1 · velero-restore<br/>Job restore-mysql:<br/>¿existe el PVC? no → Restore<br/>del último respaldo"]:::argo
        W2["wave 2 · sa-platform<br/>MySQL (datos restaurados) · RabbitMQ<br/>5 servicios · Rollout api-gateway · Ingress"]:::argo
        W0 --> W1A
        W0 --> W1B
        W1A --> W2
        W1B -- "espera a que termine<br/>(la app queda Progressing)" --> W2
    end

    VER["5 · verificación del script<br/>apps Healthy · Rollout · políticas<br/>ExternalSecrets · usuarios · HTTP 200"]:::entrada

    START --> T20
    T30 --> W0
    W2 --> VER

    GCS -. estado y outputs de 10-base .-> TF
    GIT -. manifiestos .-> ARGO
    VEL -. respaldo de MySQL .-> W1B
    SM -. secretos vía Workload Identity .-> W2
    AR -. imágenes .-> W2
    PREVIO -. crea .-> PERSISTE
```

| Color | Significado |
|---|---|
| Rojo | Manual, una sola vez al preparar el proyecto (no forma parte de la recuperación) |
| Amarillo | Lo que ejecuta el operador: un solo comando, y la verificación final del mismo script |
| Azul | Automático, Terraform |
| Verde | Automático, ArgoCD a partir del repo GitOps |
| Gris punteado | Dependencias externas al clúster que sobreviven a su pérdida |

**Por qué este orden:**

- **Terraform antes de ArgoCD.** ArgoCD necesita un clúster y el namespace `sa-p9` con su cuota;
  el resto ya lo describe el repo GitOps.
- **Operadores antes que su configuración (wave 0 → 1).** Las políticas, el ClusterSecretStore y los
  Restore son recursos de CRDs que instalan Kyverno, External Secrets y Velero.
- **Restauración antes de la plataforma (wave 1 → 2).** Si `sa-platform` se sincronizara primero,
  el StatefulSet de MySQL crearía un PVC vacío y Velero ya no restauraría sobre él. El Job
  `restore-mysql` mantiene la wave 1 en `Progressing` hasta que el Restore termina.
- **Secretos al final.** El pod restaurado de MySQL espera el secreto `sa-platform-mysql-auth`,
  que External Secrets crea en la wave 2 desde Secret Manager. La copia de datos no lo necesita:
  Velero la hace en un init container antes de que arranque MySQL.
