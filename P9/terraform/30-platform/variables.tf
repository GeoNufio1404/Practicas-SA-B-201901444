variable "app_namespace" {
  type    = string
  default = "sa-p9"
}

variable "quota" {
  description = "ResourceQuota del namespace de la aplicacion"
  type = object({
    requests_cpu    = string
    requests_memory = string
    limits_cpu      = string
    limits_memory   = string
    pods            = string
    pvcs            = string
  })
  # 5 servicios x 2 replicas + pods canary + MySQL + RabbitMQ + cronjobs + jobs de analisis.
  default = {
    requests_cpu    = "3"
    requests_memory = "4Gi"
    limits_cpu      = "6"
    limits_memory   = "8Gi"
    pods            = "40"
    pvcs            = "5"
  }
}

variable "argocd_chart_version" {
  type    = string
  default = "10.9.2"
}

variable "argocd_apps_chart_version" {
  type    = string
  default = "2.0.5"
}

variable "root_app_name" {
  type    = string
  default = "root-sa-p9"
}

variable "gitops_repo_url" {
  type    = string
  default = "https://github.com/GeoNufio1404/software-avanzado-gitops.git"
}

variable "gitops_revision" {
  type    = string
  default = "main"
}
