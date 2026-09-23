variable "project_id" {
  type    = string
  default = "project-2cbee419-ed7b-469e-89d"
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "zone" {
  type    = string
  default = "us-central1-a"
}

variable "cluster_name" {
  type    = string
  default = "sa-p9"
}

# 3 nodos: permite drenar uno (prueba de perdida de nodo) y que las replicas
# con anti-afinidad sigan repartidas en los otros dos.
# Cuota del proyecto: E2_CPUS = 8 -> 3 x e2-standard-2 = 6 vCPU (+2 de margen
# para el nodo extra de las actualizaciones automaticas).
variable "node_count" {
  type    = number
  default = 3
}

variable "machine_type" {
  type    = string
  default = "e2-standard-2"
}

variable "disk_size_gb" {
  type    = number
  default = 50
}
