const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Setea el JWT como cookie HTTP-only. El usuario/frontend nunca puede leer
 * ni manipular este valor vía JavaScript (document.cookie no lo expone).
 */
function setAuthCookie(res, token, maxAgeSeconds) {
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: IS_PRODUCTION, // en dev sobre http no se puede forzar 'secure'
    sameSite: 'lax',
    maxAge: maxAgeSeconds * 1000,
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.clearCookie('jwt', { path: '/' });
}

module.exports = { setAuthCookie, clearAuthCookie };
