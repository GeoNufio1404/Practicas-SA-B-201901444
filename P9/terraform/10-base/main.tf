# Capa 10 - Recursos PERSISTENTES del proyecto.
#
# Todo lo de esta capa sobrevive a la destruccion del cluster: es lo que
# permite reconstruirlo (imagenes, respaldos, secretos, identidades).
# La prueba de DR destruye solo 30-platform y 20-cluster, nunca esta capa.

terraform {
  required_version = ">= 1.6"
  backend "gcs" {
    bucket = "sa-p9-tfstate-201901444"
    prefix = "10-base"
  }
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

data "google_project" "this" {}

# ---------------------------------------------------------------- APIs
locals {
  apis = [
    "compute.googleapis.com",
    "container.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "storage.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "cloudresourcemanager.googleapis.com",
  ]
}

resource "google_project_service" "apis" {
  for_each           = toset(local.apis)
  service            = each.value
  disable_on_destroy = false
}

# ---------------------------------------------------- Artifact Registry
resource "google_artifact_registry_repository" "images" {
  repository_id = "sa-p9"
  location      = var.region
  format        = "DOCKER"
  description   = "Imagenes de la plataforma PrintHub (P9)"

  depends_on = [google_project_service.apis]
}

# --------------------------------------------- Bucket de respaldos (Velero)
# En otra region distinta a la del cluster: un desastre regional no se lleva
# los respaldos junto con el cluster.
resource "google_storage_bucket" "velero" {
  name                        = var.velero_bucket
  location                    = var.velero_bucket_location
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false

  lifecycle {
    prevent_destroy = true
  }
}

# ------------------------------------------------------ Cuentas de servicio
# Nodos de GKE: permisos minimos (logs, metricas y lectura de imagenes).
resource "google_service_account" "gke_nodes" {
  account_id   = "sa-p9-gke-nodes"
  display_name = "Nodos GKE sa-p9"
}

resource "google_project_iam_member" "gke_nodes" {
  for_each = toset([
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/monitoring.viewer",
    "roles/stackdriver.resourceMetadata.writer",
    "roles/artifactregistry.reader",
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

# Velero: lectura/escritura del bucket de respaldos. Los volumenes se respaldan
# con File System Backup (Kopia) al mismo bucket, sin snapshots de discos.
resource "google_service_account" "velero" {
  account_id   = "sa-p9-velero"
  display_name = "Velero sa-p9"
}

resource "google_project_iam_custom_role" "velero" {
  role_id = "saP9VeleroServer"
  title   = "Velero server (sa-p9)"
  permissions = [
    "storage.objects.create",
    "storage.objects.delete",
    "storage.objects.get",
    "storage.objects.list",
    "iam.serviceAccounts.signBlob",
  ]
}

resource "google_project_iam_member" "velero" {
  project = var.project_id
  role    = google_project_iam_custom_role.velero.name
  member  = "serviceAccount:${google_service_account.velero.email}"
}

resource "google_storage_bucket_iam_member" "velero" {
  bucket = google_storage_bucket.velero.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.velero.email}"
}

# External Secrets Operator: solo lectura de secretos.
resource "google_service_account" "eso" {
  account_id   = "sa-p9-external-secrets"
  display_name = "External Secrets sa-p9"
}

resource "google_project_iam_member" "eso" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.eso.email}"
}

# --------------------------------------------------------- Secret Manager
# Solo se crean los contenedores. Los VALORES se cargan con gcloud (runbook),
# para que nunca queden en el estado de Terraform ni en el repositorio.
resource "google_secret_manager_secret" "app" {
  for_each  = toset(var.secret_names)
  secret_id = each.value

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

# ------------------------------------ GitHub Actions (Workload Identity Federation)
# El pipeline se autentica sin llaves JSON y SOLO puede subir imagenes.
# No tiene ningun permiso sobre el cluster (requisito GitOps).
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "sa-p9-github"
  display_name              = "GitHub Actions sa-p9"

  depends_on = [google_project_service.apis]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-oidc"
  display_name                       = "GitHub OIDC"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }
  attribute_condition = "assertion.repository == \"${var.github_repo}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account" "github_ci" {
  account_id   = "sa-p9-github-ci"
  display_name = "GitHub Actions CI sa-p9 (solo push de imagenes)"
}

resource "google_artifact_registry_repository_iam_member" "github_ci" {
  location   = google_artifact_registry_repository.images.location
  repository = google_artifact_registry_repository.images.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.github_ci.email}"
}

resource "google_service_account_iam_member" "github_ci_wif" {
  service_account_id = google_service_account.github_ci.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repo}"
}
