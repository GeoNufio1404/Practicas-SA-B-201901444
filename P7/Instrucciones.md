P7 — CI/CD (GitHub Actions)

Depende de P6 (necesita el cluster vivo y el registry).

Estructura: carpeta /P7 + .github/workflows/ci-cd.yaml.
Secrets en GitHub: DOCKERHUB_USER/TOKEN (o GHCR con GITHUB_TOKEN), KUBE_CONFIG (base64 del kubeconfig de GKE o usar google-github-actions/auth + get-gke-credentials).
Jobs del pipeline:
build-test: checkout, setup node/python, install deps, correr tests (si no hay tests reales, al menos lint/smoke).
docker-build-push: matrix por los 5 servicios, docker/build-push-action → DockerHub o GHCR con tag :${{ github.sha }} y :latest.
deploy: helm upgrade --install contra el cluster de P6, actualizando image.tag (via --set o helm upgrade -f values-gke.yaml --set image.tag=$SHA por servicio, o un solo values generado).
Trigger: push a main (o tags) dispara build+push+deploy; PR solo build+test.
Diagrama: 4 fases (Build → Test → Docker Build/Push → Deploy) en Mermaid o imagen.
Docs: explicación del flujo, versionamiento (tags/branches).
Evidencia: captura de Actions run exitoso + imágenes en el registry.