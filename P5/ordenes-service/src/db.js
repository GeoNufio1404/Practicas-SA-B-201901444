import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, "..", "ordenes.db");

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

export const ESTADOS = ["pendiente", "impresion", "entregado", "cancelado"];

db.exec(`
  CREATE TABLE IF NOT EXISTS ordenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente TEXT NOT NULL,
    figura_id INTEGER NOT NULL,
    cantidad INTEGER NOT NULL,
    precio_unitario REAL NOT NULL,
    precio_total REAL NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    fecha TEXT NOT NULL DEFAULT (datetime('now')),
    nota TEXT
  );
`);

export function rowToOrden(row) {
  if (!row) return null;
  return {
    id: row.id,
    cliente: row.cliente,
    figuraId: row.figura_id,
    cantidad: row.cantidad,
    precioUnitario: row.precio_unitario,
    precioTotal: row.precio_total,
    estado: row.estado,
    fecha: row.fecha,
    nota: row.nota,
  };
}
