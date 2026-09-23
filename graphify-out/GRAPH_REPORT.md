# Graph Report - Practicas-SA-B-201901444  (2026-09-23)

## Corpus Check
- 248 files · ~245,313 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1348 nodes · 2143 edges · 78 communities (63 shown, 15 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 218 edges (avg confidence: 0.89)
- Token cost: 67,713 input · 0 output

## Community Hubs (Navigation)
- P3 ER Data Model
- P1 Solicitudes API
- P5 Helm Umbrella Chart
- P4/P5 Figuras & Ordenes Services
- P4/P5 Auth Service Core
- P2 Backend Auth Controller
- P6-P9 GKE Deployment Docs
- P4 Docker Compose Stack
- P2 Compose & Encryption Docs
- P5 api-gateway Chart
- P3 Approval & Core Bancario Sequence
- P5 figuras-service Chart
- P9 Terraform 10-base
- P1 Dependencies
- P1 Prompts & Endpoint Plans
- P9 Terraform 30-platform
- P2 Backend Dependencies
- P5 Auth Dependencies
- P5 Figuras Dependencies
- P9 Terraform 20-cluster
- P4 Auth Dependencies
- P4 Figuras Dependencies
- P4 Gateway Dependencies
- P5 Gateway Dependencies
- P2 Frontend UI Components
- P5 Ordenes Dependencies
- P4 Materiales GraphQL
- P4 Ordenes Dependencies
- P5 Materiales GraphQL
- P2 Auth-Service Dependencies
- P2 Frontend Build Config
- P3 Notifications Sequence
- P9 DR Docs & Bootstrap Flow
- P2 Frontend Assets & Lint
- P5 Materiales App Setup
- P4 Materiales App Setup
- P4 Materiales Models
- P5 Resumen CronJob
- P2 Authorization Service
- P2 Authorization Demo
- P9 Identities & Secrets Continuity
- P9 Terraform Apply Evidence
- P2 Frontend Dev Dependencies
- P5 Heartbeat CronJob
- P9 Terraform State Bucket
- P5 k6 Load Test
- P5 Materiales Models
- P9 RTO/RPO Results
- P9 SPOF & Improvement Plan
- P9 30-platform & App-of-Apps
- P9 CI Pipeline & GitOps
- P9 10-base Resources
- P2 Oxlint Config
- P3 Auth UML Classes
- P9 bootstrap.sh
- P8 Fix Script
- P2 Frontend Scripts
- P2 React Dependencies
- P9 apagar.sh
- P9 datos.sh
- P9 drenaje-nodo.sh
- P9 reconstruccion.sh
- P9 30-platform Provider Lock
- P2 Users Schema
- P2 Register Page
- P9 restaurar-datos.sh
- P1 Solicitudes Migration
- P4 Auth Init SQL
- P5 Auth Init SQL
- P9 00-state Provider Lock
- P9 10-base Provider Lock
- P9 20-cluster Provider Lock
- P9 Kyverno Policies

## God Nodes (most connected - your core abstractions)
1. `Practica 3 - Diseno de Arquitectura de Microservicios Bancarios` - 32 edges
2. `Practica 4 README (PrintHub microservicios)` - 23 edges
3. `Practica 8: GitOps, entrega progresiva y seguridad de la cadena de suministro` - 21 edges
4. `Base values (namespace sa-p5, quotas, subchart defaults)` - 19 edges
5. `Practica 9: Continuidad operativa y recuperacion ante desastres` - 17 edges
6. `Diagrama de Componentes UML` - 16 edges
7. `P5 Evidence Checklist (Helm on Minikube)` - 15 edges
8. `Diagrama de Arquitectura General` - 14 edges
9. `Microservicio Aprobacion` - 14 edges
10. `Microservicio Historial` - 14 edges

## Surprising Connections (you probably didn't know these)
- `/api/solicitudes Endpoint Tests (POST/GET/PUT/PATCH/DELETE)` --semantically_similar_to--> `POST Testing Instructions (201/400 curl cases)`  [INFERRED] [semantically similar]
  P1/README.md → P1/images/prompt1_2.png
- `Sealed Secrets / External Secrets` --semantically_similar_to--> `values.secrets.yaml (gitignored secrets)`  [INFERRED] [semantically similar]
  P9/Practica_8_2S2026-1.md → P6/Instrucciones.md
- `Job build (matrix build/push 7 images)` --shares_data_with--> `Artifact Registry repo images`  [INFERRED]
  .github/workflows/ci.yaml → P9/evidencias/terraform/10-base-plan.txt
- `Deployment diagram (printhub-net containers)` --semantically_similar_to--> `P4 docker-compose.yml`  [INFERRED] [semantically similar]
  P4/src/despliegue.png → P4/docker-compose.yml
- `helm dependency update + lint: 7 charts, 0 failed` --references--> `sa-platform Helm Umbrella Chart`  [INFERRED]
  P5/src/helm_lint.png → P5/charts/sa-platform/Chart.yaml

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Solicitud request flow (routes -> controller -> service -> postgres repository)** — p1_readme_solicitudcontroller, p1_readme_solicitudservice, p1_readme_solicitudpostgresservice, p1_prompts_isolicitudrepository, p1_images_prompt1_database_pool [EXTRACTED 1.00]
- **The five SOLID principles** — p1_readme_single_responsibility, p1_readme_open_closed, p1_readme_liskov_substitution, p1_readme_interface_segregation, p1_readme_dependency_inversion [EXTRACTED 1.00]
- **P2 auth endpoint flow** — p2_setup_endpoint_register, p2_setup_endpoint_login, p2_setup_endpoint_me, p2_setup_endpoint_logout [EXTRACTED 1.00]
- **P2 data/session security mechanisms** — p2_readme_jwt, p2_readme_http_only_cookies, p2_readme_aes_256_gcm, p2_readme_bcrypt [EXTRACTED 1.00]
- **Capa anticorrupcion hacia sistemas externos** — p3_readme_adapter, p3_readme_corebancarioclient, p3_readme_emailsender, p3_readme_core_externo, p3_readme_smtp [EXTRACTED 1.00]
- **Flujo asincrono de lote: Transacciones -> Aprobacion -> LoteAprobado -> Core Bancario/Notificaciones/Historial** — p3_readme_ms_transacciones, p3_readme_ms_aprobacion, p3_readme_lote_aprobado, p3_readme_rabbitmq, p3_readme_ms_core_bancario, p3_readme_ms_notificaciones, p3_readme_ms_historial [EXTRACTED 1.00]
- **Aprobacion en tres pasos Maker-Checker-Authorizer** — p3_images_secuencia_secuencia_aprobacion_maker, p3_images_secuencia_secuencia_aprobacion_checker, p3_images_secuencia_secuencia_aprobacion_authorizer, p3_images_secuencia_secuencia_aprobacion_aprobacionservice [EXTRACTED 1.00]
- **Order creation chain ordenes->figuras->materiales** — p4_readme_ordenes_service, p4_readme_figuras_service, p4_readme_materiales_service, p4_readme_imprimir_figura, p4_readme_consumir_gramos [EXTRACTED 1.00]
- **Seguridad de la cadena de suministro** — p9_practica_8_2s2026_1_trivy, p9_practica_8_2s2026_1_sbom, p9_practica_8_2s2026_1_cosign, p9_practica_8_2s2026_1_kyverno_policies [EXTRACTED 1.00]
- **Flujo de recuperacion ante desastres** — p9_practica_9_2s2026_day_zero_bootstrap, p9_practica_9_2s2026_terraform_remote_state, p9_practica_9_2s2026_app_of_apps, p9_practica_9_2s2026_velero_backups, p9_practica_9_2s2026_secrets_continuity, p9_practica_9_2s2026_timed_recovery_test [EXTRACTED 1.00]
- **GitOps release flow: tag -> build -> PR -> ArgoCD -> canary** — github_workflows_ci_build, github_workflows_ci_gitops_pr, p9_practica_8_2s2026_1_argocd, p9_hoja_de_ruta_analysistemplate_k6 [EXTRACTED 1.00]
- **Availability controls per service (HPA + PDB + rolling deployment)** — p5_charts_sa_platform_charts_figuras_service_templates_hpa_hpa, p5_charts_sa_platform_charts_figuras_service_templates_pdb_pdb, p5_charts_sa_platform_charts_materiales_service_templates_hpa_hpa, p5_charts_sa_platform_charts_materiales_service_templates_pdb_pdb, p5_charts_sa_platform_charts_ordenes_service_templates_hpa_hpa, p5_charts_sa_platform_charts_ordenes_service_templates_pdb_pdb [INFERRED 0.75]
- **Role-based authorization chain** — p2_readme_requireresourceaccess, p2_readme_checkauthorization, p2_readme_retry_backoff, p2_readme_resource_roles, p2_docker_compose_auth_service [INFERRED 0.85]
- **Flujo asincrono del evento LoteAprobado via RabbitMQ** — p3_images_secuencia_secuencia_aprobacion_aprobacionservice, p3_images_secuencia_secuencia_aprobacion_loteaprobado, p3_images_secuencia_secuencia_aprobacion_rabbitmq, p3_images_secuencia_secuencia_corebancario_corebancarioadapterservice, p3_images_secuencia_secuencia_notificaciones_notificacionservice, p3_images_uml_uml_historial_proyeccioneventolistener [INFERRED 0.85]
- **Referencias externas (no FK) entre BDs de microservicios** — p3_images_er_er_aprobacion_solicitud_aprobacion, p3_images_er_er_transacciones_lote, p3_images_er_er_corebancario_envio_core_bancario, p3_images_er_er_historial_lote_historial, p3_images_er_er_notificaciones_notificacion_lote, p3_readme_db_per_service [INFERRED 0.85]
- **Patron Service + Repository en microservicios P3** — p3_images_uml_uml_aprobacion_aprobacionrepository, p3_images_uml_uml_corebancario_enviorepository, p3_images_uml_uml_historial_historialrepository, p3_images_uml_uml_notificaciones_notificacionrepository, p3_images_uml_uml_transacciones_loterepository [INFERRED 0.85]
- **Logical FK chain across service databases** — p4_src_er_ordenes_ordenes, p4_src_er_figuras_figuras, p4_src_er_materiales_material, p4_readme_logical_foreign_key [INFERRED 0.85]
- **Heartbeat -> Resumen -> RabbitMQ -> auth-service pipeline** — p5_charts_sa_platform_templates_cronjob_1_heartbeat_cronjob_heartbeat, p5_charts_sa_platform_templates_cronjob_2_resumen_cronjob_resumen, p5_charts_sa_platform_templates_cronjob_2_resumen_resumen_heartbeat_queue, p5_charts_sa_platform_chart_mysql_subchart, p5_charts_sa_platform_chart_rabbitmq_subchart, p5_charts_sa_platform_chart_auth_service_subchart [INFERRED 0.85]
- **Namespace resource governance** — p5_charts_sa_platform_templates_namespace_namespace, p5_charts_sa_platform_templates_limitrange_limitrange, p5_charts_sa_platform_templates_resourcequota_resourcequota [INFERRED 0.85]
- **Ingress -> api-gateway -> auth-service traffic flow** — p5_charts_sa_platform_charts_api_gateway_templates_ingress_ingress, p5_charts_sa_platform_charts_api_gateway_templates_service_service, p5_charts_sa_platform_charts_api_gateway_templates_networkpolicy_networkpolicy, p5_charts_sa_platform_charts_auth_service_templates_networkpolicy_networkpolicy, p5_charts_sa_platform_charts_auth_service_templates_deployment_deployment [INFERRED 0.85]
- **Ordenes -> Figuras -> Materiales call chain (network policy egress)** — p5_charts_sa_platform_charts_ordenes_service_templates_deployment_deployment, p5_charts_sa_platform_charts_figuras_service_templates_deployment_deployment, p5_charts_sa_platform_charts_materiales_service_templates_deployment_deployment [INFERRED 0.85]
- **Helm values layering (base + env override + secrets)** — p5_charts_sa_platform_values_base_values, p5_charts_sa_platform_values_dev_dev_overrides, p5_charts_sa_platform_values_prod_prod_overrides, p5_charts_sa_platform_values_gke_gke_overrides, p5_charts_sa_platform_values_example_secrets_template [INFERRED 0.95]
- **Evolucion del flujo de entrega P6-P9** — p6_instrucciones_doc, p7_instrucciones_doc, p9_practica_8_2s2026_1_doc, p9_practica_9_2s2026_doc [INFERRED 0.95]
- **Shared per-microservice Helm chart template pattern** — p5_charts_sa_platform_charts_figuras_service_chart_figuras_service, p5_charts_sa_platform_charts_materiales_service_chart_materiales_service, p5_charts_sa_platform_charts_ordenes_service_chart_ordenes_service [INFERRED 0.95]
- **Shared per-microservice Helm template set (Deployment/Service/HPA/PDB/NetPol/RBAC/ConfigMap)** — p5_charts_sa_platform_charts_api_gateway_templates_deployment_deployment, p5_charts_sa_platform_charts_auth_service_templates_deployment_deployment, p5_charts_sa_platform_charts_api_gateway_templates_hpa_horizontalpodautoscaler, p5_charts_sa_platform_charts_auth_service_templates_hpa_horizontalpodautoscaler, p5_charts_sa_platform_charts_api_gateway_templates_pdb_poddisruptionbudget, p5_charts_sa_platform_charts_auth_service_templates_pdb_poddisruptionbudget [INFERRED 0.95]
- **Flujo de reconstruccion de dia cero** — p9_hoja_de_ruta_bootstrap_sh, p9_hoja_de_ruta_terraform_layers, p9_hoja_de_ruta_app_of_apps, p9_hoja_de_ruta_sync_waves, p9_hoja_de_ruta_velero_restore_job [EXTRACTED 1.00]
- **Estado que sobrevive a la perdida del cluster** — p9_hoja_de_ruta_terraform_gcs_backend, p9_hoja_de_ruta_gcp_secret_manager, p9_hoja_de_ruta_artifact_registry, p9_hoja_de_ruta_software_avanzado_gitops, p9_hoja_de_ruta_velero_schedule_hourly [EXTRACTED 1.00]
- **Puntos unicos de fallo detectados** — p9_docs_informe_dr_spof_sqlite_emptydir, p9_docs_informe_dr_spof_mysql_single, p9_docs_informe_dr_spof_zonal_cluster, p9_docs_informe_dr_spof_aes_key, p9_docs_informe_dr_falla_silenciosa_schedule [EXTRACTED 1.00]

## Communities (78 total, 15 thin omitted)

### Community 0 - "P3 ER Data Model"
Cohesion: 0.07
Nodes (72): ER Aprobacion, PASO_APROBACION, SOLICITUD_APROBACION, ER Autenticacion, TOKEN_SESION, USUARIO, DETALLE_ENVIO, ER Core Bancario (+64 more)

### Community 1 - "P1 Solicitudes API"
Cohesion: 0.06
Nodes (33): pool, env, envSchema, parsedEnv, SolicitudController, AppError, errorHandler(), validateParams() (+25 more)

### Community 2 - "P5 Helm Umbrella Chart"
Cohesion: 0.05
Nodes (54): sa-platform Chart.yaml, api-gateway subchart dependency, auth-service subchart dependency, Bitnami Helm Repository, figuras-service subchart dependency, materiales-service subchart dependency, mysql subchart dependency, ordenes-service subchart dependency (+46 more)

### Community 3 - "P4/P5 Figuras & Ordenes Services"
Cohesion: 0.06
Nodes (43): db, __dirname, rowToFigura(), apollo, app, resolvers, typeDefs, db (+35 more)

### Community 4 - "P4/P5 Auth Service Core"
Cohesion: 0.06
Nodes (42): mysql, pool, app, cookieParser, cors, express, pool, extraerToken() (+34 more)

### Community 5 - "P2 Backend Auth Controller"
Cohesion: 0.06
Nodes (47): bcrypt, { encrypt, decrypt, hashForLookup }, login(), logout(), me(), register(), ROLES_VALIDOS, { setAuthCookie, clearAuthCookie } (+39 more)

### Community 6 - "P6-P9 GKE Deployment Docs"
Cohesion: 0.06
Nodes (54): Artifact Registry, Eliminacion del cluster (cleanup de costos), P6 Instrucciones: Despliegue en GKE, GKE Cluster sa-p6, helm install sa-platform, GCE Ingress / LoadBalancer exposure, 5 microservicios (auth, materiales, figuras, ordenes, gateway), StorageClass (MySQL/RabbitMQ persistence) (+46 more)

### Community 7 - "P4 Docker Compose Stack"
Cohesion: 0.09
Nodes (43): P4 docker-compose.yml, api-gateway container, auth-db (MySQL 8.0), auth-service container, figuras-service container, materiales-service container, ordenes-service container, printhub-net network (+35 more)

### Community 8 - "P2 Compose & Encryption Docs"
Cohesion: 0.08
Nodes (40): auth-service (p2-auth-service, 5000), backend service (p2-backend, 4000), frontend service (p2-frontend, 3000), mysql service (p2-mysql, 3306), practica2_auth database, P2 docker-compose services, AES-256-GCM encryption, Decoupled authentication and authorization (+32 more)

### Community 9 - "P5 api-gateway Chart"
Cohesion: 0.07
Nodes (40): api-gateway Helm Chart, api-gateway ConfigMap, api-gateway Deployment, api-gateway HorizontalPodAutoscaler, api-gateway Ingress (/api, nginx, sa-p5.local), api-gateway NetworkPolicy, api-gateway PodDisruptionBudget, api-gateway Role (+32 more)

### Community 10 - "P3 Approval & Core Bancario Sequence"
Cohesion: 0.10
Nodes (39): AprobacionService, Authorizer, Checker, Diagrama de Secuencia: Aprobacion Maker-Checker-Authorizer, LoteAprobado, Maker, RabbitMQ, CoreBancarioAdapterService (+31 more)

### Community 11 - "P5 figuras-service Chart"
Cohesion: 0.11
Nodes (39): figuras-service Helm chart, figuras-service ConfigMap (-config), figuras-service Deployment, figuras-service HorizontalPodAutoscaler, figuras-service NetworkPolicy, figuras-service PodDisruptionBudget, figuras-service Role (get own configmap), figuras-service RoleBinding (+31 more)

### Community 12 - "P9 Terraform 10-base"
Cohesion: 0.10
Nodes (35): data.google_project.this, Terraform module: P9/terraform/10-base, google_artifact_registry_repository_iam_member.github_ci, google_artifact_registry_repository.images, google_iam_workload_identity_pool.github, google_iam_workload_identity_pool_provider.github, google_project_iam_custom_role.velero, google_project_iam_member.eso (+27 more)

### Community 13 - "P1 Dependencies"
Cohesion: 0.06
Nodes (34): dependencies, cors, dotenv, express, helmet, pg, zod, description (+26 more)

### Community 14 - "P1 Prompts & Endpoint Plans"
Cohesion: 0.09
Nodes (33): Claude Project Instructions Modal (SA - Practica 1), POST Testing Instructions (201/400 curl cases), config/database.ts Connection Pool, gen_random_uuid SQL Migration, POST Endpoint Plan (routes->controller->service->postgres->database), Generated Files and SolicitudPostgresService.create Code, GET Endpoint Plan (findAll, obtenerTodas, listar), Solicitud Model DTOs (CrearSolicitudDTO) and Files (+25 more)

### Community 15 - "P9 Terraform 30-platform"
Cohesion: 0.17
Nodes (23): data.google_client_config.current, data.terraform_remote_state.cluster, Terraform module: P9/terraform/30-platform, helm_release.argocd, helm_release.root_app, kubernetes_limit_range_v1.app, kubernetes_namespace_v1.app, kubernetes_resource_quota_v1.app (+15 more)

### Community 16 - "P2 Backend Dependencies"
Cohesion: 0.08
Nodes (23): dependencies, bcrypt, cookie-parser, cors, dotenv, express, jsonwebtoken, mysql2 (+15 more)

### Community 17 - "P5 Auth Dependencies"
Cohesion: 0.08
Nodes (23): dependencies, amqplib, bcryptjs, cookie-parser, cors, express, jsonwebtoken, mysql2 (+15 more)

### Community 18 - "P5 Figuras Dependencies"
Cohesion: 0.08
Nodes (23): dependencies, amqplib, @apollo/server, @as-integrations/express5, better-sqlite3, body-parser, cors, express (+15 more)

### Community 19 - "P9 Terraform 20-cluster"
Cohesion: 0.18
Nodes (20): data.terraform_remote_state.base, Terraform module: P9/terraform/20-cluster, google_container_cluster.this, google_container_node_pool.main, google_service_account_iam_member.wi, local.base, local.wi_bindings, output.cluster_ca_certificate (+12 more)

### Community 20 - "P4 Auth Dependencies"
Cohesion: 0.09
Nodes (21): dependencies, bcryptjs, cookie-parser, cors, express, jsonwebtoken, mysql2, description (+13 more)

### Community 21 - "P4 Figuras Dependencies"
Cohesion: 0.09
Nodes (21): dependencies, @apollo/server, @as-integrations/express5, better-sqlite3, body-parser, cors, express, description (+13 more)

### Community 22 - "P4 Gateway Dependencies"
Cohesion: 0.10
Nodes (19): dependencies, cookie-parser, cors, express, http-proxy-middleware, jsonwebtoken, description, cookie-parser (+11 more)

### Community 23 - "P5 Gateway Dependencies"
Cohesion: 0.10
Nodes (19): dependencies, cookie-parser, cors, express, http-proxy-middleware, jsonwebtoken, description, cookie-parser (+11 more)

### Community 24 - "P2 Frontend UI Components"
Cohesion: 0.26
Nodes (7): authApi, AmbientBackground(), GlassCard(), RoleBadge(), ConfirmationPage(), LoginPage(), react-router-dom

### Community 25 - "P5 Ordenes Dependencies"
Cohesion: 0.11
Nodes (17): dependencies, amqplib, better-sqlite3, cors, express, description, amqplib, better-sqlite3 (+9 more)

### Community 26 - "P4 Materiales GraphQL"
Cohesion: 0.21
Nodes (9): Material, Representa un rollo/lote de filamento de impresión 3D., MaterialType, Mutation, field, TipoFilamentoGQL, type, Query (+1 more)

### Community 27 - "P4 Ordenes Dependencies"
Cohesion: 0.12
Nodes (15): dependencies, better-sqlite3, cors, express, description, better-sqlite3, cors, express (+7 more)

### Community 28 - "P5 Materiales GraphQL"
Cohesion: 0.19
Nodes (10): ConsumirGramosInput, CrearMaterialInput, MaterialType, Mutation, field, input, TipoFilamentoGQL, type (+2 more)

### Community 29 - "P2 Auth-Service Dependencies"
Cohesion: 0.14
Nodes (13): dependencies, dotenv, express, description, dotenv, express, main, name (+5 more)

### Community 30 - "P2 Frontend Build Config"
Cohesion: 0.15
Nodes (12): name, private, type, version, autoprefixer, oxlint, postcss, tailwindcss (+4 more)

### Community 31 - "P3 Notifications Sequence"
Cohesion: 0.32
Nodes (14): Diagrama de Secuencia: Notificaciones por Email, EmailSender, NotificacionIndividual, NotificacionLote, NotificacionRepository, NotificacionService, RabbitMQ, Servidor SMTP (+6 more)

### Community 32 - "P9 DR Docs & Bootstrap Flow"
Cohesion: 0.28
Nodes (13): Diagrama del bootstrap, Orden del bootstrap (flowchart), Informe de la prueba de DR, Runbook de recuperacion, restaurar-datos.sh (borrado logico), Si algo falla (tabla de sintomas), Hoja de ruta P9, bootstrap.sh (punto de entrada unico) (+5 more)

### Community 33 - "P2 Frontend Assets & Lint"
Cohesion: 0.18
Nodes (12): Frontend index.html entry, #root mount point / main.jsx, Vite lightning favicon, Social icons SVG sprite (bluesky, discord, github, x, docs), Oxlint, @vitejs/plugin-react (Oxc), @vitejs/plugin-react-swc (SWC), React Compiler (disabled) (+4 more)

### Community 34 - "P5 Materiales App Setup"
Cohesion: 0.24
Nodes (8): init_db(), health(), lifespan(), FastAPI, get, Endpoint REST simple para verificación del gateway / Compose healthcheck., sqlmodel, strawberry_fastapi

### Community 35 - "P4 Materiales App Setup"
Cohesion: 0.24
Nodes (8): contextlib, os, init_db(), health(), lifespan(), FastAPI, get, Endpoint REST simple para verificación del gateway / Compose healthcheck.

### Community 36 - "P4 Materiales Models"
Cohesion: 0.25
Nodes (9): Enum, SQLModel, str, TipoFilamento, ConsumirGramosInput, CrearMaterialInput, input, strawberry (+1 more)

### Community 37 - "P5 Resumen CronJob"
Cohesion: 0.18
Nodes (10): dependencies, amqplib, mysql2, description, amqplib, mysql2, main, name (+2 more)

### Community 38 - "P2 Authorization Service"
Cohesion: 0.24
Nodes (7): authorize(), { RESOURCE_ROLES }, SIMULATED_FAILURE_RATE, RESOURCE_ROLES, app, { authorize }, express

### Community 39 - "P2 Authorization Demo"
Cohesion: 0.20
Nodes (7): resourceApi, App(), AuthorizationDemo(), ROUTES, p2_frontend_src_index, react, react-dom

### Community 40 - "P9 Identities & Secrets Continuity"
Cohesion: 0.24
Nodes (10): SPOF: llave AES sin copia externa, Reconstruir capas persistentes perdidas, SA eso, Workload Identity bindings (eso, velero), Artifact Registry sa-p9, Pipeline GitHub Actions ci.yaml (tag -> build -> push -> PR), External Secrets Operator, GCP Secret Manager sa-p9-* (+2 more)

### Community 41 - "P9 Terraform Apply Evidence"
Cohesion: 0.24
Nodes (10): 10-base apply (33 added), SA gke_nodes, 20-cluster apply (4 added), 20-cluster plan (4 to add), google_container_cluster sa-p9, Node pool main, 30-platform apply (8 added), apagar.sh (respaldo 30 dias + destruir cluster) (+2 more)

### Community 42 - "P2 Frontend Dev Dependencies"
Cohesion: 0.22
Nodes (9): devDependencies, autoprefixer, oxlint, postcss, tailwindcss, @types/react, @types/react-dom, vite (+1 more)

### Community 43 - "P5 Heartbeat CronJob"
Cohesion: 0.22
Nodes (8): dependencies, mysql2, description, mysql2, main, name, type, version

### Community 44 - "P9 Terraform State Bucket"
Cohesion: 0.36
Nodes (7): Terraform module: P9/terraform/00-state, google_storage_bucket.tfstate, output.bucket, provider.google, var.bucket_name, var.project_id, var.region

### Community 45 - "P5 k6 Load Test"
Cohesion: 0.25
Nodes (5): errorRate, options, ordenLatency, ref_https, ref_k6

### Community 46 - "P5 Materiales Models"
Cohesion: 0.32
Nodes (6): Material, Enum, SQLModel, str, Representa un rollo/lote de filamento de impresión 3D., TipoFilamento

### Community 47 - "P9 RTO/RPO Results"
Cohesion: 0.36
Nodes (8): Escenario: perdida total del cluster, Falla silenciosa: nombre del schedule en Job, RPO real 24 min 31 s, RTO real 23 min 18 s, RTO / RPO (declarado 45 min / 1 h), Backend remoto GCS sa-p9-tfstate-201901444, Schedule velero-sa-p9-hourly, Tabla de enlaces P9

### Community 48 - "P9 SPOF & Improvement Plan"
Cohesion: 0.25
Nodes (8): Brecha y plan de mejora DR, SPOF: MySQL de una sola instancia, SPOF: SQLite en emptyDir, SPOF: cluster zonal, AnalysisTemplate con smoke k6, Argo Rollouts canary 20/50/80/100, Chart Helm sa-platform, PDB, anti-afinidad y replicas

### Community 49 - "P9 30-platform & App-of-Apps"
Cohesion: 0.29
Nodes (8): 30-platform plan (8 to add), helm_release argocd (argo-cd), helm_release root_app (argocd-apps), LimitRange sa-p9, Namespace sa-p9, ResourceQuota sa-p9, RBAC readonly role + auditor, App-of-apps root-sa-p9

### Community 50 - "P9 CI Pipeline & GitOps"
Cohesion: 0.38
Nodes (7): CI Pipeline (ci.yaml), Job build (matrix build/push 7 images), Job gitops-pr (update image tags PR), Job lint (helm lint), Capas persistentes vs destruibles, WIF pool github, GitOps (pull-based)

### Community 51 - "P9 10-base Resources"
Cohesion: 0.33
Nodes (7): 10-base plan (33 to add), Artifact Registry repo images, Secret Manager secrets (5), SA github_ci, SA velero, GCS bucket Velero, Velero con File System Backup (Kopia)

### Community 52 - "P2 Oxlint Config"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 53 - "P3 Auth UML Classes"
Cohesion: 0.60
Nodes (6): AuthService, Diagrama de Clases UML: Autenticacion, OAuthProvider, PasswordEncoder, TokenSesion, Usuario

### Community 54 - "P9 bootstrap.sh"
Cohesion: 0.67
Nodes (5): estado_apps(), falla(), marca(), bootstrap.sh script, tf()

### Community 55 - "P8 Fix Script"
Cohesion: 0.60
Nodes (5): avi(), bad(), ok(), sec(), Fix_Script_p8.sh script

### Community 56 - "P2 Frontend Scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, preview

### Community 57 - "P2 React Dependencies"
Cohesion: 0.50
Nodes (4): dependencies, react, react-dom, react-router-dom

### Community 58 - "P9 apagar.sh"
Cohesion: 1.00
Nodes (3): borrar(), marca(), apagar.sh script

### Community 59 - "P9 datos.sh"
Cohesion: 0.83
Nodes (3): ingress_ip(), datos.sh script, sql()

### Community 60 - "P9 drenaje-nodo.sh"
Cohesion: 0.83
Nodes (3): marca(), drenaje-nodo.sh script, sondeo()

### Community 61 - "P9 reconstruccion.sh"
Cohesion: 0.83
Nodes (3): datos(), marca(), reconstruccion.sh script

### Community 62 - "P9 30-platform Provider Lock"
Cohesion: 0.50
Nodes (3): provider.registry.terraform.io/hashicorp/google, provider.registry.terraform.io/hashicorp/helm, provider.registry.terraform.io/hashicorp/kubernetes

## Ambiguous Edges - Review These
- `api-gateway Helm Chart` → `Auth: JWT + AES-256-GCM + bcrypt over MySQL`  [AMBIGUOUS]
  P5/charts/sa-platform/charts/api-gateway/Chart.yaml · relation: references

## Knowledge Gaps
- **399 isolated node(s):** `ActualizarEstadoInput`, `ActualizarSolicitudInput`, `CrearSolicitudInput`, `provider.registry.terraform.io/hashicorp/google`, `provider.registry.terraform.io/hashicorp/google` (+394 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 469 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `api-gateway Helm Chart` and `Auth: JWT + AES-256-GCM + bcrypt over MySQL`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `bcrypt` connect `P2 Backend Dependencies` to `P2 Backend Auth Controller`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `ArgoCD` connect `P6-P9 GKE Deployment Docs` to `P9 Identities & Secrets Continuity`, `P9 30-platform & App-of-Apps`, `P9 CI Pipeline & GitOps`, `P9 Terraform Apply Evidence`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `helmet` connect `P1 Solicitudes API` to `P1 Dependencies`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `Base values (namespace sa-p5, quotas, subchart defaults)` (e.g. with `Dev environment overrides (1 replica, dev tag)` and `GKE overrides (sa-p6, Artifact Registry, gce ingress)`) actually correct?**
  _`Base values (namespace sa-p5, quotas, subchart defaults)` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ActualizarEstadoInput`, `ActualizarSolicitudInput`, `CrearSolicitudInput` to the rest of the system?**
  _399 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `P3 ER Data Model` be split into smaller, more focused modules?**
  _Cohesion score 0.07198748043818466 - nodes in this community are weakly interconnected._