output "project_number" {
  value = data.google_project.this.number
}

output "registry" {
  value = "${google_artifact_registry_repository.images.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.images.repository_id}"
}

output "velero_bucket" {
  value = google_storage_bucket.velero.name
}

output "gke_nodes_sa" {
  value = google_service_account.gke_nodes.email
}

output "velero_sa" {
  value = google_service_account.velero.email
}

output "eso_sa" {
  value = google_service_account.eso.email
}

output "github_ci_sa" {
  value = google_service_account.github_ci.email
}

output "github_wif_provider" {
  value = google_iam_workload_identity_pool_provider.github.name
}
