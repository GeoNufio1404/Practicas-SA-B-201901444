import cors from "cors";
import express from "express";

import { db, ESTADOS, rowToOrden } from "./db.js";
import { obtenerFigura } from "./figurasClient.js";
import { consume, publish } from "./broker.js";

const PORT = process.env.PORT || 8003;

const app = express();
app.use(cors());
app.use(express.json());

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
    return res.status(400).json({
      error: "Se requiere cliente, figuraId y cantidad (> 0)",
    });
  }

  let figura;
  try {
    figura = await obtenerFigura(figuraId);
  } catch (err) {
    return res.status(502).json({
      error: `No se pudo consultar figuras-service: ${err.message}`,
    });
  }

  if (!figura) {
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

  try {
    await publish("ordenes.creadas", { ordenId, figuraId, cantidad });
  } catch (err) {
    // El broker no respondio: la orden queda creada igual, solo se informa
    // que la reserva de material no pudo encolarse.
    console.error(`[ordenes] no se pudo publicar orden ${ordenId}:`, err.message);
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
  console.log(
    `[ordenes] orden ${ordenId} -> ${nuevoEstado} (gramos: ${gramosDescontados ?? 0}, restante material: ${gramosRestantesMaterial ?? "n/a"}) ${mensaje ?? ""}`
  );
}).catch((err) => console.error("[ordenes] no se pudo iniciar el consumidor:", err.message));

app.listen(PORT, () => {
  console.log(`ordenes-service escuchando en puerto ${PORT}`);
});
