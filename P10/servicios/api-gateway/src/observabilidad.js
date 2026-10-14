// Observabilidad comun de los servicios instrumentados (P10).
// El mismo archivo vive en api-gateway, ordenes-service y figuras-service.
//
// El SDK de OpenTelemetry NO se inicia aqui sino en instrumentacion.mjs, que
// el Dockerfile carga antes que la app. Ese SDK instrumenta http, express,
// fetch (undici), amqplib, graphql y pino, propaga el contexto W3C
// (traceparent) entre servicios y exporta trazas y registros por OTLP.
// Este modulo solo agrega:
//   - logger: pino en JSON; la instrumentacion de pino le inyecta trace_id y
//     span_id y envia cada registro tambien por OTLP (-> Loki).
//   - metricas HTTP propias con etiquetas acotadas (metodo, ruta, codigo),
//     expuestas en :9464/metrics para Prometheus.
import { metrics } from "@opentelemetry/api";
import pino from "pino";

const SERVICIO = process.env.OTEL_SERVICE_NAME || "desconocido";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { service: SERVICIO },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: { level: (label) => ({ level: label }) },
});

export const meter = metrics.getMeter(SERVICIO);

const duracionHttp = meter.createHistogram("printhub.http.request.duration.seconds", {
  description: "Duracion de las peticiones HTTP atendidas por el servicio",
  unit: "s",
  // 0.5 s es el umbral del SLO de latencia: debe ser un limite de cubeta.
  advice: { explicitBucketBoundaries: [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] },
});

// Ruta con baja cardinalidad: prefijo montado + plantilla de la ruta
// ("/ordenes/:id", nunca "/ordenes/42").
function rutaDe(req) {
  return req.baseUrl + (req.route?.path ?? "") || "sin_ruta";
}

// Mide cada peticion y deja un registro de acceso (correlacionado con su
// traza). /health se omite: lo consultan las sondas cada pocos segundos.
export function middlewareHttp(req, res, next) {
  if (req.path === "/health") return next();
  const inicio = process.hrtime.bigint();
  res.on("finish", () => {
    const segundos = Number(process.hrtime.bigint() - inicio) / 1e9;
    const ruta = rutaDe(req);
    duracionHttp.record(segundos, {
      http_request_method: req.method,
      http_route: ruta,
      http_response_status_code: res.statusCode,
    });
    const nivel = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    logger[nivel](
      {
        http: { method: req.method, route: ruta, status: res.statusCode },
        duration_ms: Math.round(segundos * 1000),
      },
      `${req.method} ${req.originalUrl} -> ${res.statusCode}`
    );
  });
  next();
}
