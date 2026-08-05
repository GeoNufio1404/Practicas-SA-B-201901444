const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET = process.env.JWT_SECRET;
const EXPIRATION_SECONDS = parseInt(process.env.JWT_EXPIRATION_SECONDS, 10);
const RENEWAL_GRACE_SECONDS = parseInt(process.env.JWT_RENEWAL_GRACE_SECONDS, 10);

/**
 * Firma un nuevo JWT. El payload debe contener SOLO lo necesario para autorizar
 * (nunca datos sensibles sin encriptar, ya que el JWT no es secreto: solo está firmado,
 * no encriptado, y cualquiera puede leer su contenido en base64).
 */
function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRATION_SECONDS });
}

/**
 * Intenta verificar un token de forma estricta (firma válida + no expirado).
 * Devuelve { valid: true, payload } o { valid: false, reason: 'expired' | 'invalid' }.
 */
function verifyToken(token) {
  try {
    const payload = jwt.verify(token, SECRET);
    return { valid: true, payload };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return { valid: false, reason: 'expired' };
    }
    return { valid: false, reason: 'invalid' };
  }
}

/**
 * Verifica la FIRMA de un token ignorando la expiración, y calcula si todavía
 * está dentro de la ventana de gracia para renovarlo automáticamente.
 * Importante: seguimos validando la firma (no decodificamos a ciegas), solo
 * ignoramos el campo `exp` para poder inspeccionarlo nosotros mismos.
 */
function checkRenewalEligibility(token) {
  try {
    const payload = jwt.verify(token, SECRET, { ignoreExpiration: true });
    const nowSeconds = Math.floor(Date.now() / 1000);
    const secondsSinceExpiration = nowSeconds - payload.exp;

    const eligible = secondsSinceExpiration >= 0 && secondsSinceExpiration <= RENEWAL_GRACE_SECONDS;

    return { eligible, payload };
  } catch (err) {
    // Firma inválida o token corrupto: nunca es elegible para renovación.
    return { eligible: false, payload: null };
  }
}

module.exports = {
  signToken,
  verifyToken,
  checkRenewalEligibility,
  EXPIRATION_SECONDS,
};
