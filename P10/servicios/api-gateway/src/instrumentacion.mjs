// Arranque de OpenTelemetry (P10). Se carga ANTES que la aplicacion:
//   node --import ./src/instrumentacion.mjs src/index.js
// El mismo archivo vive en api-gateway, ordenes-service y figuras-service.
//
// La configuracion sale de variables OTEL_* (ver values del chart):
//   OTEL_SERVICE_NAME, OTEL_EXPORTER_OTLP_ENDPOINT   -> a donde mandar trazas y registros
//   OTEL_TRACES_EXPORTER=otlp, OTEL_LOGS_EXPORTER=otlp, OTEL_METRICS_EXPORTER=prometheus (:9464)
//   OTEL_NODE_ENABLED_INSTRUMENTATIONS               -> http, express, undici, pino, ...
//
// Se usa este archivo en lugar de "@opentelemetry/auto-instrumentations-node/register"
// porque ese no registra el hook de ESM (los servicios son "type": "module" y sin
// el hook pino y express no se instrumentan) y su manejador de SIGTERM nunca
// termina el proceso (cada pod tardaria todo el grace period en apagarse).
import { register } from "node:module";

register("@opentelemetry/instrumentation/hook.mjs", import.meta.url);

// Import dinamico: el SDK y las instrumentaciones se cargan con el hook ya activo.
const { NodeSDK } = await import("@opentelemetry/sdk-node");
const { getNodeAutoInstrumentations } = await import("@opentelemetry/auto-instrumentations-node");

// Las sondas de Kubernetes consultan /health cada pocos segundos (y el /health
// del gateway consulta el de cada servicio): no aportan nada a las trazas.
const esHealth = (ruta = "") => ruta.split("?")[0].endsWith("/health");

const sdk = new NodeSDK({
  instrumentations: getNodeAutoInstrumentations({
    "@opentelemetry/instrumentation-http": {
      ignoreIncomingRequestHook: (req) => esHealth(req.url),
      ignoreOutgoingRequestHook: (opts) => esHealth(opts.path),
    },
    "@opentelemetry/instrumentation-undici": {
      ignoreRequestHook: (req) => esHealth(req.path),
    },
    // Sin un span por cada campo escalar de GraphQL (figura.id, figura.nombre...).
    "@opentelemetry/instrumentation-graphql": { ignoreTrivialResolveSpans: true },
  }),
});
sdk.start();

// Al recibir SIGTERM se vacian las trazas/registros pendientes y se termina.
process.once("SIGTERM", () => {
  sdk.shutdown().finally(() => process.exit(0));
});
