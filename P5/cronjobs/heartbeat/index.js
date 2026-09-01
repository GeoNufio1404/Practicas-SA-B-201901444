import mysql from "mysql2/promise";

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "auth_db";
const CARNE = process.env.CARNE;

if (!CARNE) {
  console.error("CARNE no definido");
  process.exit(1);
}

function fechaGMT6() {
  // GMT-6 fijo (Guatemala no usa horario de verano)
  const ahora = new Date(Date.now() - 6 * 60 * 60 * 1000);
  return ahora.toISOString().slice(0, 19).replace("T", " ");
}

async function main() {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  await conn.query(`
    CREATE TABLE IF NOT EXISTS heartbeats (
      id INT AUTO_INCREMENT PRIMARY KEY,
      carne VARCHAR(20) NOT NULL,
      fecha_gmt6 DATETIME NOT NULL
    );
  `);

  const fecha = fechaGMT6();
  await conn.query(
    "INSERT INTO heartbeats (carne, fecha_gmt6) VALUES (?, ?)",
    [CARNE, fecha]
  );

  console.log(`[cronjob-heartbeat] insertado: carne=${CARNE} fecha_gmt6=${fecha}`);
  await conn.end();
}

main().catch((err) => {
  console.error("[cronjob-heartbeat] error:", err.message);
  process.exit(1);
});
