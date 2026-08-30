import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

import { requireAuth } from "./authMiddleware.js";

const PORT = process.env.PORT || 8000;

const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL || "http://localhost:8004",
  materiales: process.env.MATERIALES_SERVICE_URL || "http://localhost:8001",
  figuras: process.env.FIGURAS_SERVICE_URL || "http://localhost:8002",
  ordenes: process.env.ORDENES_SERVICE_URL || "http://localhost:8003",
};

const app = express();
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());

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
    pathRewrite: { "^/api/materiales": "" },
  })
);

app.use(
  "/api/figuras",
  requireAuth,
  createProxyMiddleware({
    target: SERVICES.figuras,
    changeOrigin: true,
    pathRewrite: { "^/api/figuras": "" },
  })
);

app.use(
  "/api/ordenes",
  requireAuth,
  createProxyMiddleware({
    target: SERVICES.ordenes,
    changeOrigin: true,
    // Express ya elimina "/api/ordenes" de req.url por el mount point,
    // así que aquí solo queda "/" o "/5"; hay que reconstruir "/ordenes(/5)".
    pathRewrite: (path) => `/ordenes${path === "/" ? "" : path}`,
  })
);

app.listen(PORT, () => {
  console.log(`api-gateway escuchando en puerto ${PORT}`);
  console.log("Rutas: /api/auth, /api/materiales, /api/figuras, /api/ordenes");
});
