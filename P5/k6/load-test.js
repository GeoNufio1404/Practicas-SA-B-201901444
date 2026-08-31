import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

// --- Configuracion ---
// BASE_URL debe apuntar al Ingress del api-gateway (host configurado en values*.yaml)
const BASE_URL = __ENV.BASE_URL || "http://sa-p5.local";
const USERNAME = __ENV.LOAD_USER || "k6user";
const PASSWORD = __ENV.LOAD_PASS || "k6password123";

const errorRate = new Rate("errores_negocio");
const ordenLatency = new Trend("latencia_ordenes", true);

export const options = {
  scenarios: {
    carga_creciente: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 20 },  // rampa inicial: deberia disparar HPA (>70% CPU)
        { duration: "2m", target: 60 },  // concurrencia alta sostenida
        { duration: "2m", target: 60 },  // sostenido: capturar aqui "kubectl get hpa -w"
        { duration: "1m", target: 0 },   // rampa de bajada: evidenciar descenso de replicas
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<800"],
    http_req_failed: ["rate<0.02"],
    errores_negocio: ["rate<0.02"],
  },
};

// setup(): corre una sola vez, registra/loguea un usuario y comparte la cookie JWT
export function setup() {
  http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({ username: USERNAME, email: `${USERNAME}@example.com`, password: PASSWORD }),
    { headers: { "Content-Type": "application/json" } }
  );

  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { "Content-Type": "application/json" } }
  );

  check(loginRes, { "login devuelve 200": (r) => r.status === 200 });

  const cookies = loginRes.cookies.token ? loginRes.cookies.token[0].value : null;
  return { cookie: cookies };
}

export default function (data) {
  const jar = http.cookieJar();
  if (data.cookie) {
    jar.set(BASE_URL, "token", data.cookie);
  }

  // Lectura tipica: listar ordenes via el gateway (requiere JWT)
  const res = http.get(`${BASE_URL}/api/ordenes`, { tags: { name: "GET /api/ordenes" } });
  ordenLatency.add(res.timings.duration);

  const ok = check(res, {
    "status 200": (r) => r.status === 200,
  });
  errorRate.add(!ok);

  // 1 de cada 5 iteraciones tambien golpea el health agregado del gateway
  if (Math.random() < 0.2) {
    const health = http.get(`${BASE_URL}/health`, { tags: { name: "GET /health" } });
    check(health, { "health 200": (r) => r.status === 200 });
  }

  sleep(1);
}

// Resumen legible con RPS, p95 y % de error al terminar la prueba
export function handleSummary(data) {
  const rps = data.metrics.http_reqs ? data.metrics.http_reqs.values.rate.toFixed(2) : "n/a";
  const p95 = data.metrics.http_req_duration
    ? data.metrics.http_req_duration.values["p(95)"].toFixed(2)
    : "n/a";
  const errorPct = data.metrics.http_req_failed
    ? (data.metrics.http_req_failed.values.rate * 100).toFixed(2)
    : "n/a";

  console.log(`\n=== Resumen prueba de carga ===`);
  console.log(`RPS promedio: ${rps} req/s`);
  console.log(`Latencia p95: ${p95} ms`);
  console.log(`Tasa de error: ${errorPct} %`);

  return {
    stdout: textSummary(data, { indent: " ", enableColors: true }),
    "k6/resultados.json": JSON.stringify(data, null, 2),
  };
}
