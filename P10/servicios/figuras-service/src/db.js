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

// Catalogo inicial (P10): cada replica tiene su propia SQLite en emptyDir,
// asi que una figura creada en un pod no existe en el otro. Con el mismo
// catalogo base en todas las replicas, los ids 1-3 son validos en cualquiera
// (los usa el generador de trafico).
const CATALOGO_INICIAL = [
  { nombre: "Llavero PrintHub", materialId: 1, gramos: 8, precio: 15 },
  { nombre: "Maceta geometrica", materialId: 1, gramos: 120, precio: 85 },
  { nombre: "Soporte de telefono", materialId: 2, gramos: 45, precio: 40 },
];
if (db.prepare("SELECT COUNT(*) AS n FROM figuras").get().n === 0) {
  const insertar = db.prepare(
    "INSERT INTO figuras (nombre, material_id, gramos_requeridos, precio) VALUES (?, ?, ?, ?)"
  );
  for (const f of CATALOGO_INICIAL) insertar.run(f.nombre, f.materialId, f.gramos, f.precio);
}

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
