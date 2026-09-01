import amqp from "amqplib";

const RABBITMQ_HOST = process.env.RABBITMQ_HOST || "localhost";
const RABBITMQ_PORT = process.env.RABBITMQ_PORT || "5672";
const RABBITMQ_USER = process.env.RABBITMQ_USER || "guest";
const RABBITMQ_PASSWORD = process.env.RABBITMQ_PASSWORD || "guest";
const RABBITMQ_VHOST = process.env.RABBITMQ_VHOST || "/";

const URL = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@${RABBITMQ_HOST}:${RABBITMQ_PORT}${RABBITMQ_VHOST}`;

let connection = null;
let channel = null;

export async function getChannel() {
  if (channel) return channel;

  connection = await amqp.connect(URL);
  connection.on("error", (err) => console.error("[broker] error de conexion:", err.message));
  connection.on("close", () => {
    console.warn("[broker] conexion cerrada, reintentando en 5s...");
    channel = null;
    connection = null;
    setTimeout(() => getChannel().catch(() => {}), 5000);
  });

  channel = await connection.createChannel();
  return channel;
}

export async function consume(queue, handler) {
  const ch = await getChannel();
  await ch.assertQueue(queue, { durable: true });
  await ch.prefetch(1);

  ch.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      await handler(payload);
      ch.ack(msg);
    } catch (err) {
      console.error(`[broker] fallo procesando mensaje de "${queue}":`, err.message);
      ch.nack(msg, false, true);
    }
  });

  console.log(`[broker] consumiendo cola "${queue}"`);
}
