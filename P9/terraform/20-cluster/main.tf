# Capa 20 - Cluster GKE (DESTRUIBLE).
#
# Esta capa y 30-platform son las que se destruyen y reconstruyen en la prueba
# de DR. Lo que necesita para reconstruirse (identidades, buckets, registry)
# vive en 10-base y se lee de su estado remoto.

terraform {
  required_version = ">= 1.6"
  backend "gcs" {
    bucket = "sa-p9-tfstate-201901444"
    prefix = "20-cluster"
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

data "terraform_remote_state" "base" {
  backend = "gcs"
  config = {
    bucket = "sa-p9-tfstate-201901444"
    prefix = "10-base"
  }
}

locals {
  base = data.terraform_remote_state.base.outputs
}

resource "google_container_cluster" "this" {
  name     = var.cluster_name
  location = var.zone

  # El pool por defecto se elimina: los nodos se gestionan en un pool propio.
  remove_default_node_pool = true
  initial_node_count       = 1

  # Solo aplica al nodo temporal del pool por defecto (se borra al crear el
  # cluster). Disco pd-standard pequeno para no consumir la cuota SSD (250 GB).
  node_config {
    disk_size_gb    = 20
    disk_type       = "pd-standard"
    service_account = local.base.gke_nodes_sa
  }

  release_channel {
    channel = "REGULAR"
  }

  # Workload Identity: los pods (Velero, External Secrets) usan cuentas de
  # servicio de GCP sin llaves.
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  networking_mode = "VPC_NATIVE"
  ip_allocation_policy {}

  # Menos costo de observabilidad: solo componentes del sistema.
  logging_config {
    enable_components = ["SYSTEM_COMPONENTS"]
  }
  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS"]
  }

  # Necesario para poder destruirlo en la prueba de DR.
  deletion_protection = false

  # Tras crear el cluster, GKE reporta aqui el node_config del pool "main"
  # (50 GB) y cada apply intentaria cambiarlo a 20 GB.
  lifecycle {
    ignore_changes = [node_config]
  }
}

resource "google_container_node_pool" "main" {
  name       = "main"
  cluster    = google_container_cluster.this.id
  location   = var.zone
  node_count = var.node_count

  node_config {
    machine_type = var.machine_type
    disk_size_gb = var.disk_size_gb
    # pd-standard: pd-balanced/ssd consumen la cuota SSD_TOTAL_GB (250 GB)
    # que se reserva para los volumenes persistentes.
    disk_type       = "pd-standard"
    service_account = local.base.gke_nodes_sa
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    labels = {
      pool = "main"
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }
}

# ----------------------------------------------- Workload Identity bindings
# Cuenta de Kubernetes (namespace/nombre) -> cuenta de servicio de GCP.
# Viven aqui (y no en 10-base) porque el pool <proyecto>.svc.id.goog solo
# existe una vez creado un cluster con Workload Identity.
locals {
  wi_bindings = {
    velero = {
      gsa = local.base.velero_sa
      ksa = "velero/velero-server"
    }
    eso = {
      gsa = local.base.eso_sa
      ksa = "external-secrets/external-secrets"
    }
  }
}

resource "google_service_account_iam_member" "wi" {
  for_each           = local.wi_bindings
  service_account_id = "projects/${var.project_id}/serviceAccounts/${each.value.gsa}"
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${each.value.ksa}]"

  depends_on = [google_container_cluster.this]
}
