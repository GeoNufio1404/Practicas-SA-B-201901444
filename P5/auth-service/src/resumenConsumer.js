import { pool } from "./db.js";
import { consume } from "./broker.js";

async function iniciarResumenConsumer() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS resumen_heartbeats (
      id INT AUTO_INCREMENT PRIMARY KEY,
      generado_en DATETIME NOT NULL,
      resumen_json JSON NOT NULL,
      recibido_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await consume("resumen.heartbeat", async (payload) => {
    await pool.query(
      "INSERT INTO resumen_heartbeats (generado_en, resumen_json) VALUES (?, ?)",
      [payload.generadoEn, JSON.stringify(payload.resumen)]
    );
    console.log(`[auth-service] resumen.heartbeat almacenado (generado_en=${payload.generadoEn})`);
  });
}

iniciarResumenConsumer().catch((err) =>
  console.error("[auth-service] no se pudo iniciar el consumidor de resumen.heartbeat:", err.message)
);
