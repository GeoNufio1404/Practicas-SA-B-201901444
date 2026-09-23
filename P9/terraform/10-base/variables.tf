variable "project_id" {
  type    = string
  default = "project-2cbee419-ed7b-469e-89d"
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "velero_bucket" {
  type    = string
  default = "sa-p9-velero-201901444"
}

# Region distinta a la del cluster (us-central1).
variable "velero_bucket_location" {
  type    = string
  default = "us-east1"
}

variable "github_repo" {
  description = "Repositorio de codigo autorizado a subir imagenes (owner/nombre)"
  type        = string
  default     = "GeoNufio1404/Practicas-SA-B-201901444"
}

variable "secret_names" {
  description = "Secretos de la aplicacion en Secret Manager (valores cargados fuera de Terraform)"
  type        = list(string)
  default = [
    "sa-p9-mysql-root-password",
    "sa-p9-mysql-password",
    "sa-p9-rabbitmq-password",
    "sa-p9-rabbitmq-erlang-cookie",
    "sa-p9-jwt-secret",
    "sa-p9-aes-key",
  ]
}
