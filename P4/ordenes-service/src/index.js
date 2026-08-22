import cors from "cors";
import express from "express";

import { db, ESTADOS, rowToOrden } from "./db.js";
import { dispararImpresion, obtenerFigura } from "./figurasClient.js";

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
// Consulta el precio real en figuras-service, crea la orden y dispara
// el descuento de material (figuras-service -> materiales-service).
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

  // Intenta reservar el material. Si falla, la orden queda creada pero
  // se informa el problema (no bloqueamos la creación por un fallo aguas abajo).
  let impresion = null;
  try {
    impresion = await dispararImpresion(figuraId, cantidad);
    db.prepare("UPDATE ordenes SET estado = 'impresion' WHERE id = ?").run(
      info.lastInsertRowid
    );
  } catch (err) {
    impresion = { mensaje: `No se pudo reservar material: ${err.message}` };
  }

  const row = db
    .prepare("SELECT * FROM ordenes WHERE id = ?")
    .get(info.lastInsertRowid);

  res.status(201).json({
    orden: rowToOrden(row),
    impresion,
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

app.listen(PORT, () => {
  console.log(`ordenes-service escuchando en puerto ${PORT}`);
});
