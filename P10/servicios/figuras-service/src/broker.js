import amqp from "amqplib";

import { logger } from "./observabilidad.js";

const RABBITMQ_HOST = process.env.RABBITMQ_HOST || "localhost";
const RABBITMQ_PORT = process.env.RABBITMQ_PORT || "5672";
const RABBITMQ_USER = process.env.RABBITMQ_USER || "guest";
const RABBITMQ_PASSWORD = process.env.RABBITMQ_PASSWORD || "guest";
const RABBITMQ_VHOST = process.env.RABBITMQ_VHOST || "/";

const URL = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@${RABBITMQ_HOST}:${RABBITMQ_PORT}${RABBITMQ_VHOST}`;
const REINTENTO_MS = 5000;

let connection = null;
let channel = null;
let conectando = null;
let reconexionProgramada = false;

// Colas consumidas por este proceso. Se vuelven a suscribir en cada
// reconexion: un canal nuevo no conserva los consumidores del anterior.
const consumidores = new Map();

/**
 * Abre conexion y canal, y suscribe todos los consumidores registrados.
 * Si la conexion se cierra (broker reiniciado, red), se reintenta cada 5 s
 * hasta lograrlo, en vez de tumbar el proceso o quedarse sin consumir.
 */
async function abrirCanal() {
  const conn = await amqp.connect(URL);
  conn.on("error", (err) => logger.error({ err }, `Error de conexion con RabbitMQ: ${err.message}`));
  conn.on("close", () => {
    logger.warn(`Conexion con RabbitMQ cerrada, reintentando en ${REINTENTO_MS / 1000}s`);
    channel = null;
    connection = null;
    programarReconexion();
  });

  const ch = await conn.createChannel();
  for (const [queue, handler] of consumidores) {
    await suscribir(ch, queue, handler);
  }
  connection = conn;
  channel = ch;
  logger.info("Conectado a RabbitMQ");
  return ch;
}

/**
 * Canal compartido. Las llamadas concurrentes esperan la misma conexion en
 * curso en lugar de abrir varias.
 */
export async function getChannel() {
  if (channel) return channel;
  if (!conectando) {
    conectando = abrirCanal().finally(() => {
      conectando = null;
    });
  }
  return conectando;
}

function programarReconexion() {
  if (reconexionProgramada) return;
  reconexionProgramada = true;
  setTimeout(() => {
    reconexionProgramada = false;
    getChannel().catch((err) => {
      logger.warn({ err }, `RabbitMQ no disponible (${err.message}), reintentando en ${REINTENTO_MS / 1000}s`);
      programarReconexion();
    });
  }, REINTENTO_MS);
}

/**
 * Publica un mensaje persistente en una cola durable. No bloquea al
 * llamador esperando que alguien lo consuma (fire-and-forget del lado
 * del productor, mas alla de la confirmacion de encolado).
 */
export async function publish(queue, payload) {
  const ch = await getChannel();
  await ch.assertQueue(queue, { durable: true });
  ch.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), { persistent: true });
}

async function suscribir(ch, queue, handler) {
  await ch.assertQueue(queue, { durable: true });
  await ch.prefetch(1);

  await ch.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      await handler(payload);
      ch.ack(msg);
    } catch (err) {
      logger.error({ err, queue }, `Fallo procesando mensaje de "${queue}": ${err.message}`);
      ch.nack(msg, false, true);
    }
  });

  logger.info(`Consumiendo cola "${queue}"`);
}

/**
 * Consume una cola durable con prefetch(1): procesa un mensaje a la vez
 * y hace ack SOLO despues de que "handler" termine sin error. Si falla,
 * se hace nack con requeue para reintentar (o para acumularse si el
 * consumidor esta caido).
 *
 * Si RabbitMQ todavia no esta disponible (p. ej. el pod arranco antes que
 * el broker), el consumidor queda registrado y se suscribe en cuanto la
 * conexion se establezca: nunca se pierde.
 */
export async function consume(queue, handler) {
  consumidores.set(queue, handler);
  if (channel) {
    await suscribir(channel, queue, handler);
    return;
  }
  try {
    await getChannel();
  } catch (err) {
    logger.warn({ err }, `RabbitMQ no disponible (${err.message}), reintentando en ${REINTENTO_MS / 1000}s`);
    programarReconexion();
  }
}
