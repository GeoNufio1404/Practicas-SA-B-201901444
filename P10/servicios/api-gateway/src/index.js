import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

import { requireAuth } from "./authMiddleware.js";
import { logger, middlewareHttp } from "./observabilidad.js";

const PORT = process.env.PORT || 8000;

const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL || "http://localhost:8004",
  materiales: process.env.MATERIALES_SERVICE_URL || "http://localhost:8001",
  figuras: process.env.FIGURAS_SERVICE_URL || "http://localhost:8002",
  ordenes: process.env.ORDENES_SERVICE_URL || "http://localhost:8003",
};

// Fallo inducido (P10): apagado por defecto. Se activa por variables de
// entorno desde el repo GitOps para probar el canary y las alertas:
//   FALLO_ORDENES_TASA        fraccion de peticiones a /api/ordenes que responden 500
//   FALLO_ORDENES_LATENCIA_MS latencia extra en cada peticion a /api/ordenes
const FALLO_TASA = Number(process.env.FALLO_ORDENES_TASA || 0);
const FALLO_LATENCIA_MS = Number(process.env.FALLO_ORDENES_LATENCIA_MS || 0);

async function falloInducido(req, res, next) {
  if (FALLO_LATENCIA_MS > 0) {
    await new Promise((r) => setTimeout(r, FALLO_LATENCIA_MS));
  }
  if (FALLO_TASA > 0 && Math.random() < FALLO_TASA) {
    logger.error(
      { fallo: "FALLO_ORDENES_TASA", tasa: FALLO_TASA },
      "Fallo inducido: la peticion a ordenes-service se descarta con 500"
    );
    return res.status(500).json({ error: "Error interno del gateway" });
  }
  next();
}

// Errores de red hacia un servicio (caido, rechazado, timeout): se registran
// con la traza activa y se responde 502 en vez de dejar la conexion colgada.
function proxyError(servicio) {
  return (err, req, res) => {
    logger.error({ err, upstream: servicio }, `No se pudo contactar ${servicio}: ${err.message}`);
    if (!res.headersSent) res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `${servicio} no disponible` }));
  };
}

const app = express();
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(middlewareHttp);

// --- Health agregado del gateway: pregunta a los 4 servicios río abajo ---
app.get("/health", async (_req, res) => {
  const resultados = {};

  await Promise.all(
    Object.entries(SERVICES).map(async ([nombre, baseUrl]) => {
      try {
        const r = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(2000) });
        resultados[nombre] = r.ok ? "ok" : `error (${r.status})`;
      } catch (err) {
        resultados[nombre] = `no disponible (${err.message})`;
      }
    })
  );

  res.json({ gateway: "ok", servicios: resultados });
});

// --- Rutas de auth: públicas, no requieren token (login/registro) ---
app.use(
  "/api/auth",
  createProxyMiddleware({
    target: SERVICES.auth,
    changeOrigin: true,
    on: { error: proxyError("auth-service") },
    pathRewrite: { "^/api/auth": "" },
  })
);

// --- Rutas protegidas: requieren JWT válido emitido por auth-service ---
app.use(
  "/api/materiales",
  requireAuth,
  createProxyMiddleware({
    target: SERVICES.materiales,
    changeOrigin: true,
    on: { error: proxyError("materiales-service") },
    pathRewrite: { "^/api/materiales": "" },
  })
);

app.use(
  "/api/figuras",
  requireAuth,
  createProxyMiddleware({
    target: SERVICES.figuras,
    changeOrigin: true,
    on: { error: proxyError("figuras-service") },
    pathRewrite: { "^/api/figuras": "" },
  })
);

app.use(
  "/api/ordenes",
  requireAuth,
  falloInducido,
  createProxyMiddleware({
    target: SERVICES.ordenes,
    changeOrigin: true,
    on: { error: proxyError("ordenes-service") },
    // Express ya elimina "/api/ordenes" de req.url por el mount point,
    // así que aquí solo queda "/" o "/5"; hay que reconstruir "/ordenes(/5)".
    pathRewrite: (path) => `/ordenes${path === "/" ? "" : path}`,
  })
);

app.listen(PORT, () => {
  logger.info(`api-gateway escuchando en puerto ${PORT}`);
  logger.info("Rutas: /api/auth, /api/materiales, /api/figuras, /api/ordenes");
  if (FALLO_TASA > 0 || FALLO_LATENCIA_MS > 0) {
    logger.warn({ tasa: FALLO_TASA, latencia_ms: FALLO_LATENCIA_MS }, "Fallo inducido ACTIVO en /api/ordenes");
  }
});
