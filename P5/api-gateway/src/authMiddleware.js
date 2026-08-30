import jwt from "jsonwebtoken";

// Debe ser EXACTAMENTE el mismo secreto que usa auth-service (Práctica 2)
// para firmar el JWT. Ajusta el nombre de la cookie si en P2 se llama distinto.
const JWT_SECRET = process.env.JWT_SECRET || "cambia-esto-en-produccion";
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "token";

/**
 * Extrae el token de la cookie HTTP-only (como en P2) o, como respaldo,
 * de un header Authorization: Bearer <token> (útil para pruebas con curl/Postman).
 */
function extraerToken(req) {
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

export function requireAuth(req, res, next) {
  const token = extraerToken(req);

  if (!token) {
    return res.status(401).json({ error: "No autenticado: token no encontrado" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: `Token inválido: ${err.message}` });
  }
}
