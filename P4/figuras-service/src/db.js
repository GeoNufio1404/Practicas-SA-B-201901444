import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, "..", "figuras.db");

export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS figuras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    material_id INTEGER NOT NULL,
    gramos_requeridos REAL NOT NULL,
    piezas INTEGER NOT NULL DEFAULT 1,
    alto_mm REAL,
    ancho_mm REAL,
    profundo_mm REAL,
    tiempo_impresion_horas REAL,
    precio REAL NOT NULL
  );
`);

export function rowToFigura(row) {
  if (!row) return null;
  return {
    id: row.id,
    nombre: row.nombre,
    materialId: row.material_id,
    gramosRequeridos: row.gramos_requeridos,
    piezas: row.piezas,
    dimensiones: {
      altoMm: row.alto_mm,
      anchoMm: row.ancho_mm,
      profundoMm: row.profundo_mm,
    },
    tiempoImpresionHoras: row.tiempo_impresion_horas,
    precio: row.precio,
  };
}
