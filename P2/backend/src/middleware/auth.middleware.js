const { verifyToken, checkRenewalEligibility, signToken, EXPIRATION_SECONDS } = require('../utils/jwt');
const { setAuthCookie, clearAuthCookie } = require('../utils/cookies');

/**
 * Requiere un JWT válido en la cookie 'jwt'. Si el token expiró pero está
 * dentro de la ventana de gracia (JWT_RENEWAL_GRACE_SECONDS), lo renueva
 * automáticamente y continúa la request sin interrumpir al usuario.
 */
function requireAuth(req, res, next) {
  const token = req.cookies?.jwt;

  if (!token) {
    return res.status(401).json({ error: 'No autenticado. Falta el token.' });
  }

  const result = verifyToken(token);

  if (result.valid) {
    req.user = result.payload; // { sub, rol, iat, exp }
    return next();
  }

  if (result.reason === 'expired') {
    const { eligible, payload } = checkRenewalEligibility(token);

    if (eligible) {
      const nuevoToken = signToken({ sub: payload.sub, rol: payload.rol });
      setAuthCookie(res, nuevoToken, EXPIRATION_SECONDS);
      req.user = payload;
      return next();
    }

    clearAuthCookie(res);
    return res.status(401).json({ error: 'Sesión expirada. Vuelve a iniciar sesión.' });
  }

  // Firma inválida, token malformado, etc.
  clearAuthCookie(res);
  return res.status(401).json({ error: 'Token inválido.' });
}

/**
 * Requiere que el usuario autenticado tenga uno de los roles permitidos.
 * Debe usarse DESPUÉS de requireAuth.
 */
function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para acceder a este recurso.' });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
