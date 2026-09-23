# Capa 00 - Bucket del estado remoto de Terraform.
#
# Se ejecuta UNA sola vez por proyecto y es la unica capa con estado local
# (problema del huevo y la gallina: el backend remoto no puede guardar el estado
# del bucket que lo contiene). Si se pierde el estado local, el bucket se
# recupera con:  terraform import google_storage_bucket.tfstate <nombre-bucket>
#
# Las demas capas (10-base, 20-cluster, 30-platform) guardan su estado en este
# bucket con backend "gcs", que incluye bloqueo de estado nativo.

terraform {
  required_version = ">= 1.6"
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

resource "google_storage_bucket" "tfstate" {
  name                        = var.bucket_name
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false

  # Versionado: cada escritura del estado queda como version recuperable.
  versioning {
    enabled = true
  }

  # Conserva solo las 10 versiones no actuales mas recientes.
  lifecycle_rule {
    condition {
      num_newer_versions = 10
      with_state         = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

output "bucket" {
  value = google_storage_bucket.tfstate.name
}
