require('dotenv').config();

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;
const MAX_ATTEMPTS = parseInt(process.env.AUTH_SERVICE_RETRY_MAX_ATTEMPTS, 10);
const BACKOFF_MS = parseInt(process.env.AUTH_SERVICE_RETRY_BACKOFF_MS, 10);
const TIMEOUT_MS = parseInt(process.env.AUTH_SERVICE_TIMEOUT_MS || '2000', 10);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * fetch con timeout manual: si el microservicio no responde en TIMEOUT_MS,
 * abortamos la request en vez de quedarnos colgados indefinidamente.
 */
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Consulta al microservicio de autorización si `rol` puede acceder a `recurso`.
 *
 * Reintenta hasta MAX_ATTEMPTS veces ante fallas temporales o timeouts, con
 * backoff creciente entre intentos (AUTH_SERVICE_RETRY_BACKOFF_MS * intento).
 * Si se agotan los reintentos, deniega el acceso por error de comunicación
 * en vez de dejar la request colgada o asumir acceso permitido.
 *
 * Devuelve:
 *   { permitido: boolean, error: null | 'communication_failure' }
 */
async function checkAuthorization(rol, recurso) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetchWithTimeout(
        `${AUTH_SERVICE_URL}/authorize`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rol, recurso }),
        },
        TIMEOUT_MS
      );

      if (!res.ok) {
        throw new Error(`auth-service respondió con estado ${res.status}`);
      }

      const data = await res.json();
      return { permitido: !!data.permitido, error: null };
    } catch (err) {
      lastError = err;
      const motivo = err.name === 'AbortError' ? 'timeout' : err.message;
      console.warn(
        `[authServiceClient] intento ${attempt}/${MAX_ATTEMPTS} falló (${motivo}).`
      );

      const quedanIntentos = attempt < MAX_ATTEMPTS;
      if (quedanIntentos) {
        const backoff = BACKOFF_MS * attempt; // backoff lineal creciente
        await sleep(backoff);
      }
    }
  }

  console.error(
    `[authServiceClient] se agotaron los ${MAX_ATTEMPTS} intentos. ` +
      `Último error: ${lastError?.message}. Denegando acceso por error de comunicación.`
  );

  return { permitido: false, error: 'communication_failure' };
}

module.exports = { checkAuthorization };
