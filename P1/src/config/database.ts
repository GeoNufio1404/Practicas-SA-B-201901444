import { Pool } from "pg";
import { env } from "./env";

/**
 * Pool unico de conexiones a PostgreSQL (NeonDB).
 * Se exporta una sola instancia para reutilizar conexiones en toda la app
 * en vez de abrir una conexion nueva por cada consulta.
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // NeonDB requiere SSL
});

pool.on("error", (err) => {
  console.error("Error inesperado en el pool de PostgreSQL:", err.message);
});