import mysql from "mysql2/promise";
import amqp from "amqplib";

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "auth_db";

const RABBITMQ_HOST = process.env.RABBITMQ_HOST || "localhost";
const RABBITMQ_PORT = process.env.RABBITMQ_PORT || "5672";
const RABBITMQ_USER = process.env.RABBITMQ_USER || "guest";
const RABBITMQ_PASSWORD = process.env.RABBITMQ_PASSWORD || "guest";
const RABBITMQ_QUEUE = process.env.RABBITMQ_QUEUE || "resumen.heartbeat";

async function main() {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  const [rows] = await conn.query(`
    SELECT carne, COUNT(*) AS cantidad, MAX(fecha_gmt6) AS ultima_fecha
    FROM heartbeats
    WHERE fecha_gmt6 >= (UTC_TIMESTAMP() - INTERVAL 6 HOUR) - INTERVAL 1 HOUR
    GROUP BY carne
  `);
  await conn.end();

  const payload = {
    generadoEn: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " "),
    resumen: rows,
  };

  const url = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;
  const connection = await amqp.connect(url);
  const channel = await connection.createChannel();
  await channel.assertQueue(RABBITMQ_QUEUE, { durable: true });
  channel.sendToQueue(RABBITMQ_QUEUE, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
  });

  console.log(`[cronjob-resumen] publicado en "${RABBITMQ_QUEUE}":`, JSON.stringify(payload));

  await channel.close();
  await connection.close();
}

main().catch((err) => {
  console.error("[cronjob-resumen] error:", err.message);
  process.exit(1);
});
