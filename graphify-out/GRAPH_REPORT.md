# Graph Report - Practicas-SA-B-201901444  (2026-09-23)

## Corpus Check
- 238 files · ~237,590 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 43 file(s) not represented in the graph (top: (none) 30, .example 5, .css 2)

## Summary
- 1299 nodes · 2080 edges · 64 communities (51 shown, 13 thin omitted)
- Extraction: 89% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 218 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- P3 ER Data Model
- P1 Solicitudes API
- P5 Helm Umbrella Chart
- P4/P5 Figuras & Ordenes Services
- P4/P5 Auth Service Core
- P2 Backend Auth Controller
- P6-P9 GKE Deployment Docs
- P9 CI/GitOps & Terraform Evidence
- P4 Docker Compose Stack
- P2 Compose & Encryption Docs
- P3 Maker-Checker Approval Flow
- P5 api-gateway Chart
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
- P3 Core Bancario Sending
- P2 Frontend Assets & Lint
- P5 Materiales App Setup
- P4 Materiales App Setup
- P4 Materiales Models
- P5 Resumen CronJob
- P2 Authorization Service
- P2 Authorization Demo
- P2 Frontend Dev Dependencies
- P5 Heartbeat CronJob
- P9 Terraform State Bucket
- P5 k6 Load Test
- P5 Materiales Models
- P2 Oxlint Config
- P3 Auth UML Classes
- P8 Fix Script
- P2 Frontend Scripts
- P2 React Dependencies
- P9 30-platform Provider Lock
- P2 Users Schema
- P2 Register Page
- P1 Solicitudes Migration
- P4 Auth Init SQL
- P5 Auth Init SQL
- P9 00-state Provider Lock
- P9 10-base Provider Lock
- P9 20-cluster Provider Lock

## God Nodes (most connected - your core abstractions)
1. `Practica 3 - Diseno de Arquitectura de Microservicios Bancarios` - 32 edges
2. `Practica 4 README (PrintHub microservicios)` - 23 edges
3. `Practica 8: GitOps, entrega progresiva y seguridad de la cadena de suministro` - 21 edges
4. `Hoja de ruta P9` - 21 edges
5. `Base values (namespace sa-p5, quotas, subchart defaults)` - 19 edges
6. `Practica 9: Continuidad operativa y recuperacion ante desastres` - 17 edges
7. `Diagrama de Componentes UML` - 16 edges
8. `P5 Evidence Checklist (Helm on Minikube)` - 15 edges
9. `Microservicio Aprobacion` - 14 edges
10. `Microservicio Historial` - 14 edges

## Surprising Connections (you probably didn't know these)
- `/api/solicitudes Endpoint Tests (POST/GET/PUT/PATCH/DELETE)` --semantically_similar_to--> `POST Testing Instructions (201/400 curl cases)`  [INFERRED] [semantically similar]
  P1/README.md → P1/images/prompt1_2.png
- `Deployment diagram (printhub-net containers)` --semantically_similar_to--> `P4 docker-compose.yml`  [INFERRED] [semantically similar]
  P4/src/despliegue.png → P4/docker-compose.yml
- `Sealed Secrets / External Secrets` --semantically_similar_to--> `values.secrets.yaml (gitignored secrets)`  [INFERRED] [semantically similar]
  P9/Practica_8_2S2026-1.md → P6/Instrucciones.md
- `Social icons SVG sprite (bluesky, discord, github, x, docs)` --conceptually_related_to--> `React + Vite template`  [INFERRED]
  P2/frontend/public/icons.svg → P2/frontend/README.md
- `Hero illustration (stacked isometric layers, purple)` --conceptually_related_to--> `React + Vite template`  [INFERRED]
  P2/frontend/src/assets/hero.png → P2/frontend/README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **The five SOLID principles** — p1_readme_single_responsibility, p1_readme_open_closed, p1_readme_liskov_substitution, p1_readme_interface_segregation, p1_readme_dependency_inversion [EXTRACTED 1.00]
- **P2 auth endpoint flow** — p2_setup_endpoint_register, p2_setup_endpoint_login, p2_setup_endpoint_me, p2_setup_endpoint_logout [EXTRACTED 1.00]
- **Role-based authorization chain** — p2_readme_requireresourceaccess, p2_readme_checkauthorization, p2_readme_retry_backoff, p2_readme_resource_roles, p2_docker_compose_auth_service [INFERRED 0.85]
- **P2 data/session security mechanisms** — p2_readme_jwt, p2_readme_http_only_cookies, p2_readme_aes_256_gcm, p2_readme_bcrypt [EXTRACTED 1.00]
- **Flujo asincrono de lote: Transacciones -> Aprobacion -> LoteAprobado -> Core Bancario/Notificaciones/Historial** — p3_readme_ms_transacciones, p3_readme_ms_aprobacion, p3_readme_lote_aprobado, p3_readme_rabbitmq, p3_readme_ms_core_bancario, p3_readme_ms_notificaciones, p3_readme_ms_historial [EXTRACTED 1.00]
- **Capa anticorrupcion hacia sistemas externos** — p3_readme_adapter, p3_readme_corebancarioclient, p3_readme_emailsender, p3_readme_core_externo, p3_readme_smtp [EXTRACTED 1.00]
- **Referencias externas (no FK) entre BDs de microservicios** — p3_images_er_er_aprobacion_solicitud_aprobacion, p3_images_er_er_transacciones_lote, p3_images_er_er_corebancario_envio_core_bancario, p3_images_er_er_historial_lote_historial, p3_images_er_er_notificaciones_notificacion_lote, p3_readme_db_per_service [INFERRED 0.85]
- **Order creation chain ordenes->figuras->materiales** — p4_readme_ordenes_service, p4_readme_figuras_service, p4_readme_materiales_service, p4_readme_imprimir_figura, p4_readme_consumir_gramos [EXTRACTED 1.00]
- **Logical FK chain across service databases** — p4_src_er_ordenes_ordenes, p4_src_er_figuras_figuras, p4_src_er_materiales_material, p4_readme_logical_foreign_key [INFERRED 0.85]
- **Ingress -> api-gateway -> auth-service traffic flow** — p5_charts_sa_platform_charts_api_gateway_templates_ingress_ingress, p5_charts_sa_platform_charts_api_gateway_templates_service_service, p5_charts_sa_platform_charts_api_gateway_templates_networkpolicy_networkpolicy, p5_charts_sa_platform_charts_auth_service_templates_networkpolicy_networkpolicy, p5_charts_sa_platform_charts_auth_service_templates_deployment_deployment [INFERRED 0.85]
- **Shared per-microservice Helm template set (Deployment/Service/HPA/PDB/NetPol/RBAC/ConfigMap)** — p5_charts_sa_platform_charts_api_gateway_templates_deployment_deployment, p5_charts_sa_platform_charts_auth_service_templates_deployment_deployment, p5_charts_sa_platform_charts_api_gateway_templates_hpa_horizontalpodautoscaler, p5_charts_sa_platform_charts_auth_service_templates_hpa_horizontalpodautoscaler, p5_charts_sa_platform_charts_api_gateway_templates_pdb_poddisruptionbudget, p5_charts_sa_platform_charts_auth_service_templates_pdb_poddisruptionbudget [INFERRED 0.95]
- **Shared per-microservice Helm chart template pattern** — p5_charts_sa_platform_charts_figuras_service_chart_figuras_service, p5_charts_sa_platform_charts_materiales_service_chart_materiales_service, p5_charts_sa_platform_charts_ordenes_service_chart_ordenes_service [INFERRED 0.95]
- **Availability controls per service (HPA + PDB + rolling deployment)** — p5_charts_sa_platform_charts_figuras_service_templates_hpa_hpa, p5_charts_sa_platform_charts_figuras_service_templates_pdb_pdb, p5_charts_sa_platform_charts_materiales_service_templates_hpa_hpa, p5_charts_sa_platform_charts_materiales_service_templates_pdb_pdb, p5_charts_sa_platform_charts_ordenes_service_templates_hpa_hpa, p5_charts_sa_platform_charts_ordenes_service_templates_pdb_pdb [INFERRED 0.75]
- **Ordenes -> Figuras -> Materiales call chain (network policy egress)** — p5_charts_sa_platform_charts_ordenes_service_templates_deployment_deployment, p5_charts_sa_platform_charts_figuras_service_templates_deployment_deployment, p5_charts_sa_platform_charts_materiales_service_templates_deployment_deployment [INFERRED 0.85]
- **Heartbeat -> Resumen -> RabbitMQ -> auth-service pipeline** — p5_charts_sa_platform_templates_cronjob_1_heartbeat_cronjob_heartbeat, p5_charts_sa_platform_templates_cronjob_2_resumen_cronjob_resumen, p5_charts_sa_platform_templates_cronjob_2_resumen_resumen_heartbeat_queue, p5_charts_sa_platform_chart_mysql_subchart, p5_charts_sa_platform_chart_rabbitmq_subchart, p5_charts_sa_platform_chart_auth_service_subchart [INFERRED 0.85]
- **Namespace resource governance** — p5_charts_sa_platform_templates_namespace_namespace, p5_charts_sa_platform_templates_limitrange_limitrange, p5_charts_sa_platform_templates_resourcequota_resourcequota [INFERRED 0.85]
- **Helm values layering (base + env override + secrets)** — p5_charts_sa_platform_values_base_values, p5_charts_sa_platform_values_dev_dev_overrides, p5_charts_sa_platform_values_prod_prod_overrides, p5_charts_sa_platform_values_gke_gke_overrides, p5_charts_sa_platform_values_example_secrets_template [INFERRED 0.95]
- **Seguridad de la cadena de suministro** — p9_practica_8_2s2026_1_trivy, p9_practica_8_2s2026_1_sbom, p9_practica_8_2s2026_1_cosign, p9_practica_8_2s2026_1_kyverno_policies [EXTRACTED 1.00]
- **Flujo de recuperacion ante desastres** — p9_practica_9_2s2026_day_zero_bootstrap, p9_practica_9_2s2026_terraform_remote_state, p9_practica_9_2s2026_app_of_apps, p9_practica_9_2s2026_velero_backups, p9_practica_9_2s2026_secrets_continuity, p9_practica_9_2s2026_timed_recovery_test [EXTRACTED 1.00]
- **Evolucion del flujo de entrega P6-P9** — p6_instrucciones_doc, p7_instrucciones_doc, p9_practica_8_2s2026_1_doc, p9_practica_9_2s2026_doc [INFERRED 0.95]
- **Solicitud request flow (routes -> controller -> service -> postgres repository)** — p1_readme_solicitudcontroller, p1_readme_solicitudservice, p1_readme_solicitudpostgresservice, p1_prompts_isolicitudrepository, p1_images_prompt1_database_pool [EXTRACTED 1.00]
- **Flujo asincrono del evento LoteAprobado via RabbitMQ** — p3_images_secuencia_secuencia_aprobacion_aprobacionservice, p3_images_secuencia_secuencia_aprobacion_loteaprobado, p3_images_secuencia_secuencia_aprobacion_rabbitmq, p3_images_secuencia_secuencia_corebancario_corebancarioadapterservice, p3_images_secuencia_secuencia_notificaciones_notificacionservice, p3_images_uml_uml_historial_proyeccioneventolistener [INFERRED 0.85]
- **Aprobacion en tres pasos Maker-Checker-Authorizer** — p3_images_secuencia_secuencia_aprobacion_maker, p3_images_secuencia_secuencia_aprobacion_checker, p3_images_secuencia_secuencia_aprobacion_authorizer, p3_images_secuencia_secuencia_aprobacion_aprobacionservice [EXTRACTED 1.00]
- **Patron Service + Repository en microservicios P3** — p3_images_uml_uml_aprobacion_aprobacionrepository, p3_images_uml_uml_corebancario_enviorepository, p3_images_uml_uml_historial_historialrepository, p3_images_uml_uml_notificaciones_notificacionrepository, p3_images_uml_uml_transacciones_loterepository [INFERRED 0.85]
- **GitOps release flow: tag -> build -> PR -> ArgoCD -> canary** — github_workflows_ci_build, github_workflows_ci_gitops_pr, p9_hoja_de_ruta_gitops_repo, p9_hoja_de_ruta_argocd, p9_hoja_de_ruta_argo_rollouts, p9_hoja_de_ruta_analysistemplate_k6 [EXTRACTED 1.00]
- **Layered Terraform provisioning 10-base/20-cluster/30-platform** — p9_evidencias_terraform_10_base_plan, p9_evidencias_terraform_20_cluster_plan, p9_evidencias_terraform_30_platform_plan, p9_hoja_de_ruta_terraform_layers, p9_hoja_de_ruta_terraform_gcs_backend [INFERRED 0.85]
- **Disaster recovery rebuild** — p9_hoja_de_ruta_bootstrap_sh, p9_hoja_de_ruta_velero, p9_hoja_de_ruta_external_secrets, p9_hoja_de_ruta_app_of_apps, p9_hoja_de_ruta_rto_rpo [EXTRACTED 1.00]

## Communities (64 total, 13 thin omitted)

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

### Community 7 - "P9 CI/GitOps & Terraform Evidence"
Cohesion: 0.08
Nodes (48): CI Pipeline (ci.yaml), Job build (matrix build/push 7 images), Job gitops-pr (update image tags PR), Job lint (helm lint), 10-base apply (33 added), 10-base plan (33 to add), Artifact Registry repo images, WIF pool github (+40 more)

### Community 8 - "P4 Docker Compose Stack"
Cohesion: 0.09
Nodes (43): P4 docker-compose.yml, api-gateway container, auth-db (MySQL 8.0), auth-service container, figuras-service container, materiales-service container, ordenes-service container, printhub-net network (+35 more)

### Community 9 - "P2 Compose & Encryption Docs"
Cohesion: 0.08
Nodes (40): auth-service (p2-auth-service, 5000), backend service (p2-backend, 4000), frontend service (p2-frontend, 3000), mysql service (p2-mysql, 3306), practica2_auth database, P2 docker-compose services, AES-256-GCM encryption, Decoupled authentication and authorization (+32 more)

### Community 10 - "P3 Maker-Checker Approval Flow"
Cohesion: 0.10
Nodes (40): AprobacionService, Authorizer, Checker, Diagrama de Secuencia: Aprobacion Maker-Checker-Authorizer, LoteAprobado, Maker, RabbitMQ, Diagrama de Secuencia: Notificaciones por Email (+32 more)

### Community 11 - "P5 api-gateway Chart"
Cohesion: 0.07
Nodes (40): api-gateway Helm Chart, api-gateway ConfigMap, api-gateway Deployment, api-gateway HorizontalPodAutoscaler, api-gateway Ingress (/api, nginx, sa-p5.local), api-gateway NetworkPolicy, api-gateway PodDisruptionBudget, api-gateway Role (+32 more)

### Community 12 - "P5 figuras-service Chart"
Cohesion: 0.11
Nodes (39): figuras-service Helm chart, figuras-service ConfigMap (-config), figuras-service Deployment, figuras-service HorizontalPodAutoscaler, figuras-service NetworkPolicy, figuras-service PodDisruptionBudget, figuras-service Role (get own configmap), figuras-service RoleBinding (+31 more)

### Community 13 - "P9 Terraform 10-base"
Cohesion: 0.10
Nodes (35): data.google_project.this, Terraform module: P9/terraform/10-base, google_artifact_registry_repository_iam_member.github_ci, google_artifact_registry_repository.images, google_iam_workload_identity_pool.github, google_iam_workload_identity_pool_provider.github, google_project_iam_custom_role.velero, google_project_iam_member.eso (+27 more)

### Community 14 - "P1 Dependencies"
Cohesion: 0.06
Nodes (34): dependencies, cors, dotenv, express, helmet, pg, zod, description (+26 more)

### Community 15 - "P1 Prompts & Endpoint Plans"
Cohesion: 0.09
Nodes (33): Claude Project Instructions Modal (SA - Practica 1), POST Testing Instructions (201/400 curl cases), config/database.ts Connection Pool, gen_random_uuid SQL Migration, POST Endpoint Plan (routes->controller->service->postgres->database), Generated Files and SolicitudPostgresService.create Code, GET Endpoint Plan (findAll, obtenerTodas, listar), Solicitud Model DTOs (CrearSolicitudDTO) and Files (+25 more)

### Community 16 - "P9 Terraform 30-platform"
Cohesion: 0.17
Nodes (23): data.google_client_config.current, data.terraform_remote_state.cluster, Terraform module: P9/terraform/30-platform, helm_release.argocd, helm_release.root_app, kubernetes_limit_range_v1.app, kubernetes_namespace_v1.app, kubernetes_resource_quota_v1.app (+15 more)

### Community 17 - "P2 Backend Dependencies"
Cohesion: 0.08
Nodes (23): dependencies, bcrypt, cookie-parser, cors, dotenv, express, jsonwebtoken, mysql2 (+15 more)

### Community 18 - "P5 Auth Dependencies"
Cohesion: 0.08
Nodes (23): dependencies, amqplib, bcryptjs, cookie-parser, cors, express, jsonwebtoken, mysql2 (+15 more)

### Community 19 - "P5 Figuras Dependencies"
Cohesion: 0.08
Nodes (23): dependencies, amqplib, @apollo/server, @as-integrations/express5, better-sqlite3, body-parser, cors, express (+15 more)

### Community 20 - "P9 Terraform 20-cluster"
Cohesion: 0.18
Nodes (20): data.terraform_remote_state.base, Terraform module: P9/terraform/20-cluster, google_container_cluster.this, google_container_node_pool.main, google_service_account_iam_member.wi, local.base, local.wi_bindings, output.cluster_ca_certificate (+12 more)

### Community 21 - "P4 Auth Dependencies"
Cohesion: 0.09
Nodes (21): dependencies, bcryptjs, cookie-parser, cors, express, jsonwebtoken, mysql2, description (+13 more)

### Community 22 - "P4 Figuras Dependencies"
Cohesion: 0.09
Nodes (21): dependencies, @apollo/server, @as-integrations/express5, better-sqlite3, body-parser, cors, express, description (+13 more)

### Community 23 - "P4 Gateway Dependencies"
Cohesion: 0.10
Nodes (19): dependencies, cookie-parser, cors, express, http-proxy-middleware, jsonwebtoken, description, cookie-parser (+11 more)

### Community 24 - "P5 Gateway Dependencies"
Cohesion: 0.10
Nodes (19): dependencies, cookie-parser, cors, express, http-proxy-middleware, jsonwebtoken, description, cookie-parser (+11 more)

### Community 25 - "P2 Frontend UI Components"
Cohesion: 0.26
Nodes (7): authApi, AmbientBackground(), GlassCard(), RoleBadge(), ConfirmationPage(), LoginPage(), react-router-dom

### Community 26 - "P5 Ordenes Dependencies"
Cohesion: 0.11
Nodes (17): dependencies, amqplib, better-sqlite3, cors, express, description, amqplib, better-sqlite3 (+9 more)

### Community 27 - "P4 Materiales GraphQL"
Cohesion: 0.21
Nodes (9): Material, Representa un rollo/lote de filamento de impresión 3D., MaterialType, Mutation, field, TipoFilamentoGQL, type, Query (+1 more)

### Community 28 - "P4 Ordenes Dependencies"
Cohesion: 0.12
Nodes (15): dependencies, better-sqlite3, cors, express, description, better-sqlite3, cors, express (+7 more)

### Community 29 - "P5 Materiales GraphQL"
Cohesion: 0.19
Nodes (10): ConsumirGramosInput, CrearMaterialInput, MaterialType, Mutation, field, input, TipoFilamentoGQL, type (+2 more)

### Community 30 - "P2 Auth-Service Dependencies"
Cohesion: 0.14
Nodes (13): dependencies, dotenv, express, description, dotenv, express, main, name (+5 more)

### Community 31 - "P2 Frontend Build Config"
Cohesion: 0.15
Nodes (12): name, private, type, version, autoprefixer, oxlint, postcss, tailwindcss (+4 more)

### Community 32 - "P3 Core Bancario Sending"
Cohesion: 0.32
Nodes (13): CoreBancarioAdapterService, CoreBancarioClient, Diagrama de Secuencia: Envio a Core Bancario, EnvioCoreBancario, EnvioRepository, RabbitMQ, Sistema Core Bancario Externo, CoreBancarioAdapterService (+5 more)

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

### Community 40 - "P2 Frontend Dev Dependencies"
Cohesion: 0.22
Nodes (9): devDependencies, autoprefixer, oxlint, postcss, tailwindcss, @types/react, @types/react-dom, vite (+1 more)

### Community 41 - "P5 Heartbeat CronJob"
Cohesion: 0.22
Nodes (8): dependencies, mysql2, description, mysql2, main, name, type, version

### Community 42 - "P9 Terraform State Bucket"
Cohesion: 0.36
Nodes (7): Terraform module: P9/terraform/00-state, google_storage_bucket.tfstate, output.bucket, provider.google, var.bucket_name, var.project_id, var.region

### Community 43 - "P5 k6 Load Test"
Cohesion: 0.25
Nodes (5): errorRate, options, ordenLatency, ref_https, ref_k6

### Community 44 - "P5 Materiales Models"
Cohesion: 0.32
Nodes (6): Material, Enum, SQLModel, str, Representa un rollo/lote de filamento de impresión 3D., TipoFilamento

### Community 45 - "P2 Oxlint Config"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 46 - "P3 Auth UML Classes"
Cohesion: 0.60
Nodes (6): AuthService, Diagrama de Clases UML: Autenticacion, OAuthProvider, PasswordEncoder, TokenSesion, Usuario

### Community 47 - "P8 Fix Script"
Cohesion: 0.60
Nodes (5): avi(), bad(), ok(), sec(), Fix_Script_p8.sh script

### Community 48 - "P2 Frontend Scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, preview

### Community 49 - "P2 React Dependencies"
Cohesion: 0.50
Nodes (4): dependencies, react, react-dom, react-router-dom

### Community 50 - "P9 30-platform Provider Lock"
Cohesion: 0.50
Nodes (3): provider.registry.terraform.io/hashicorp/google, provider.registry.terraform.io/hashicorp/helm, provider.registry.terraform.io/hashicorp/kubernetes

## Ambiguous Edges - Review These
- `api-gateway Helm Chart` → `Auth: JWT + AES-256-GCM + bcrypt over MySQL`  [AMBIGUOUS]
  P5/charts/sa-platform/charts/api-gateway/Chart.yaml · relation: references

## Knowledge Gaps
- **394 isolated node(s):** `solicitudes`, `name`, `version`, `description`, `main` (+389 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 464 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `api-gateway Helm Chart` and `Auth: JWT + AES-256-GCM + bcrypt over MySQL`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `bcrypt` connect `P2 Backend Dependencies` to `P2 Backend Auth Controller`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `helmet` connect `P1 Solicitudes API` to `P1 Dependencies`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `Base values (namespace sa-p5, quotas, subchart defaults)` (e.g. with `Dev environment overrides (1 replica, dev tag)` and `GKE overrides (sa-p6, Artifact Registry, gce ingress)`) actually correct?**
  _`Base values (namespace sa-p5, quotas, subchart defaults)` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `solicitudes`, `name`, `version` to the rest of the system?**
  _394 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `P3 ER Data Model` be split into smaller, more focused modules?**
  _Cohesion score 0.07198748043818466 - nodes in this community are weakly interconnected._
- **Should `P1 Solicitudes API` be split into smaller, more focused modules?**
  _Cohesion score 0.0601404741000878 - nodes in this community are weakly interconnected._