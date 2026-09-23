# Capa 30 - Plataforma base dentro del cluster (DESTRUIBLE).
#
# Terraform solo instala lo minimo: gobierno del namespace (cuota, limites,
# RBAC) y ArgoCD con la aplicacion raiz (app-of-apps). A partir de ahi, TODO
# lo demas (Rollouts, Kyverno, External Secrets, Velero y la propia
# plataforma) lo levanta ArgoCD leyendo el repositorio GitOps.

terraform {
  required_version = ">= 1.6"
  backend "gcs" {
    bucket = "sa-p9-tfstate-201901444"
    prefix = "30-platform"
  }
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.30"
    }
    helm = {
      source  = "hashicorp/helm"
      version = ">= 3.0"
    }
  }
}

data "terraform_remote_state" "cluster" {
  backend = "gcs"
  config = {
    bucket = "sa-p9-tfstate-201901444"
    prefix = "20-cluster"
  }
}

data "google_client_config" "current" {}

locals {
  cluster = data.terraform_remote_state.cluster.outputs
  host    = "https://${local.cluster.cluster_endpoint}"
  ca      = base64decode(local.cluster.cluster_ca_certificate)
}

provider "kubernetes" {
  host                   = local.host
  token                  = data.google_client_config.current.access_token
  cluster_ca_certificate = local.ca
}

provider "helm" {
  kubernetes = {
    host                   = local.host
    token                  = data.google_client_config.current.access_token
    cluster_ca_certificate = local.ca
  }
}

# ------------------------------------------------------------- Namespace
resource "kubernetes_namespace_v1" "app" {
  metadata {
    name = var.app_namespace
    labels = {
      "app.kubernetes.io/part-of" = "sa-platform"
      "practica"                  = "p9"
    }
  }
}

resource "kubernetes_resource_quota_v1" "app" {
  metadata {
    name      = "${var.app_namespace}-quota"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }
  spec {
    hard = {
      "requests.cpu"           = var.quota.requests_cpu
      "requests.memory"        = var.quota.requests_memory
      "limits.cpu"             = var.quota.limits_cpu
      "limits.memory"          = var.quota.limits_memory
      "pods"                   = var.quota.pods
      "persistentvolumeclaims" = var.quota.pvcs
    }
  }
}

resource "kubernetes_limit_range_v1" "app" {
  metadata {
    name      = "${var.app_namespace}-limits"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }
  spec {
    limit {
      type = "Container"
      default = {
        cpu    = "200m"
        memory = "256Mi"
      }
      default_request = {
        cpu    = "100m"
        memory = "128Mi"
      }
      max = {
        cpu    = "1"
        memory = "1Gi"
      }
    }
  }
}

# ------------------------------------------------------------------ RBAC
# RBAC minimo: rol de solo lectura del namespace, asignado a una cuenta de auditoria.
resource "kubernetes_role_v1" "readonly" {
  metadata {
    name      = "sa-p9-readonly"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }
  rule {
    api_groups = ["", "apps", "batch", "autoscaling", "policy", "networking.k8s.io"]
    resources  = ["pods", "pods/log", "services", "endpoints", "configmaps", "persistentvolumeclaims", "deployments", "replicasets", "statefulsets", "jobs", "cronjobs", "horizontalpodautoscalers", "poddisruptionbudgets", "ingresses", "networkpolicies", "events"]
    verbs      = ["get", "list", "watch"]
  }
  rule {
    api_groups = ["argoproj.io"]
    resources  = ["rollouts", "analysisruns", "analysistemplates", "experiments"]
    verbs      = ["get", "list", "watch"]
  }
}

resource "kubernetes_service_account_v1" "auditor" {
  metadata {
    name      = "sa-p9-auditor"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }
}

resource "kubernetes_role_binding_v1" "auditor_readonly" {
  metadata {
    name      = "sa-p9-auditor-readonly"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role_v1.readonly.metadata[0].name
  }
  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account_v1.auditor.metadata[0].name
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }
}

# ---------------------------------------------------------------- ArgoCD
resource "helm_release" "argocd" {
  name             = "argocd"
  namespace        = "argocd"
  create_namespace = true
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = var.argocd_chart_version
  wait             = true
  timeout          = 900

  values = [yamlencode({
    configs = {
      params = {
        # Sin TLS en el server: se accede por port-forward.
        "server.insecure" = true
      }
      cm = {
        # Necesario para que las sync-waves del app-of-apps esperen a que cada
        # Application hija este Healthy (p. ej. Velero antes que la plataforma).
        "resource.customizations.health.argoproj.io_Application" = <<-EOT
          hs = {}
          hs.status = "Progressing"
          hs.message = ""
          if obj.status ~= nil then
            if obj.status.health ~= nil then
              hs.status = obj.status.health.status
              if obj.status.health.message ~= nil then
                hs.message = obj.status.health.message
              end
            end
          end
          return hs
        EOT
      }
    }
    dex = {
      enabled = false
    }
    notifications = {
      enabled = false
    }
  })]
}

# Aplicacion raiz (app-of-apps). Se crea con el chart argocd-apps para no
# depender de que el CRD Application exista en tiempo de plan.
resource "helm_release" "root_app" {
  name       = "root-app"
  namespace  = "argocd"
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argocd-apps"
  version    = var.argocd_apps_chart_version

  values = [yamlencode({
    applications = {
      (var.root_app_name) = {
        namespace  = "argocd"
        project    = "default"
        finalizers = ["resources-finalizer.argocd.argoproj.io"]
        source = {
          repoURL        = var.gitops_repo_url
          targetRevision = var.gitops_revision
          path           = "apps"
        }
        destination = {
          server    = "https://kubernetes.default.svc"
          namespace = "argocd"
        }
        syncPolicy = {
          automated = {
            prune    = true
            selfHeal = true
          }
        }
      }
    }
  })]

  depends_on = [helm_release.argocd, kubernetes_namespace_v1.app]
}
