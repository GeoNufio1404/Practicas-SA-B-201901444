import cors from "cors";
import express from "express";

import { db, ESTADOS, rowToOrden } from "./db.js";
import { obtenerFigura } from "./figurasClient.js";
import { consume, publish } from "./broker.js";
import { logger, meter, middlewareHttp } from "./observabilidad.js";

const PORT = process.env.PORT || 8003;

// Metricas de negocio: lo que un no ingeniero entiende ("cuantos pedidos
// entraron" y "cuantos se perdieron y por que").
const pedidosCreados = meter.createCounter("printhub.pedidos.creados", {
  description: "Pedidos aceptados y registrados",
});
const pedidosRechazados = meter.createCounter("printhub.pedidos.rechazados", {
  description: "Pedidos que no se pudieron registrar, por motivo",
});

const app = express();
app.use(cors());
app.use(express.json());
app.use(middlewareHttp);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "ordenes-service" });
});

// GET /ordenes - listar todas, con filtro opcional por estado
app.get("/ordenes", (req, res) => {
  const { estado } = req.query;
  let rows;
  if (estado) {
    rows = db.prepare("SELECT * FROM ordenes WHERE estado = ?").all(estado);
  } else {
    rows = db.prepare("SELECT * FROM ordenes ORDER BY id DESC").all();
  }
  res.json(rows.map(rowToOrden));
});

// GET /ordenes/:id
app.get("/ordenes/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM ordenes WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Orden no encontrada" });
  res.json(rowToOrden(row));
});

// POST /ordenes
// Body: { cliente, figuraId, cantidad, nota? }
// Consulta el precio real en figuras-service (sincrono, es solo una lectura),
// crea la orden en estado 'pendiente' y PUBLICA la reserva de material en
// RabbitMQ en vez de llamar directamente a figuras-service. El productor
// responde de inmediato sin esperar a que el material quede reservado.
app.post("/ordenes", async (req, res) => {
  const { cliente, figuraId, cantidad, nota } = req.body;

  if (!cliente || !figuraId || !cantidad || cantidad <= 0) {
    pedidosRechazados.add(1, { motivo: "datos_invalidos" });
    return res.status(400).json({
      error: "Se requiere cliente, figuraId y cantidad (> 0)",
    });
  }

  let figura;
  try {
    figura = await obtenerFigura(figuraId);
  } catch (err) {
    pedidosRechazados.add(1, { motivo: "figuras_no_disponible" });
    logger.error({ err, figuraId }, `No se pudo consultar figuras-service: ${err.message}`);
    return res.status(502).json({
      error: `No se pudo consultar figuras-service: ${err.message}`,
    });
  }

  if (!figura) {
    pedidosRechazados.add(1, { motivo: "figura_inexistente" });
    return res.status(404).json({ error: `Figura ${figuraId} no existe` });
  }

  const precioTotal = figura.precio * cantidad;

  const stmt = db.prepare(`
    INSERT INTO ordenes (cliente, figura_id, cantidad, precio_unitario, precio_total, estado, nota)
    VALUES (@cliente, @figuraId, @cantidad, @precioUnitario, @precioTotal, @estado, @nota)
  `);
  const info = stmt.run({
    cliente,
    figuraId,
    cantidad,
    precioUnitario: figura.precio,
    precioTotal,
    estado: "pendiente",
    nota: nota ?? null,
  });

  const ordenId = info.lastInsertRowid;
  pedidosCreados.add(1);
  logger.info({ ordenId, figuraId, cantidad, precioTotal }, `Orden ${ordenId} creada`);

  try {
    await publish("ordenes.creadas", { ordenId, figuraId, cantidad });
  } catch (err) {
    // El broker no respondio: la orden queda creada igual, solo se informa
    // que la reserva de material no pudo encolarse.
    logger.error({ err, ordenId }, `No se pudo publicar la orden ${ordenId}: ${err.message}`);
  }

  const row = db.prepare("SELECT * FROM ordenes WHERE id = ?").get(ordenId);

  res.status(202).json({
    orden: rowToOrden(row),
    impresion: { mensaje: "Orden encolada. La reserva de material se procesa de forma asincrona." },
  });
});

// PATCH /ordenes/:id/estado
app.patch("/ordenes/:id/estado", (req, res) => {
  const { estado } = req.body;
  if (!ESTADOS.includes(estado)) {
    return res.status(400).json({
      error: `Estado inválido. Usa uno de: ${ESTADOS.join(", ")}`,
    });
  }
  const info = db
    .prepare("UPDATE ordenes SET estado = ? WHERE id = ?")
    .run(estado, req.params.id);
  if (info.changes === 0) {
    return res.status(404).json({ error: "Orden no encontrada" });
  }
  const row = db.prepare("SELECT * FROM ordenes WHERE id = ?").get(req.params.id);
  res.json(rowToOrden(row));
});

// DELETE /ordenes/:id
app.delete("/ordenes/:id", (req, res) => {
  const info = db.prepare("DELETE FROM ordenes WHERE id = ?").run(req.params.id);
  if (info.changes === 0) {
    return res.status(404).json({ error: "Orden no encontrada" });
  }
  res.status(204).send();
});

// Consumidor: recibe el resultado de la reserva de material procesada por
// figuras-service y actualiza el estado de la orden. Ack solo tras el UPDATE.
consume("ordenes.procesadas", async ({ ordenId, ok, gramosDescontados, gramosRestantesMaterial, mensaje }) => {
  const nuevoEstado = ok ? "impresion" : "pendiente";
  db.prepare("UPDATE ordenes SET estado = ? WHERE id = ?").run(nuevoEstado, ordenId);
  logger.info(
    { ordenId, estado: nuevoEstado, gramosDescontados, gramosRestantesMaterial },
    `Orden ${ordenId} -> ${nuevoEstado} ${mensaje ?? ""}`
  );
}).catch((err) => logger.error({ err }, `No se pudo iniciar el consumidor: ${err.message}`));

app.listen(PORT, () => {
  logger.info(`ordenes-service escuchando en puerto ${PORT}`);
});
