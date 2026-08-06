const { checkAuthorization } = require('../utils/authServiceClient');

/**
 * Debe usarse DESPUÉS de requireAuth (necesita req.user.rol ya resuelto).
 * Consulta al microservicio de autorización con retry/backoff antes de
 * decidir si el request pasa.
 */
function requireResourceAccess(recurso) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }

    const { permitido, error } = await checkAuthorization(req.user.rol, recurso);

    if (error === 'communication_failure') {
      return res.status(503).json({
        error: 'No se pudo validar la autorización con el servicio correspondiente. Acceso denegado.',
      });
    }

    if (!permitido) {
      return res.status(403).json({ error: 'No tienes permiso para acceder a este recurso.' });
    }

    return next();
  };
}

module.exports = { requireResourceAccess };
