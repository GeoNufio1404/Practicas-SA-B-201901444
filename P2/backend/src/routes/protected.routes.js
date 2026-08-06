const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/auth.middleware');
const { requireResourceAccess } = require('../middleware/authorize.middleware');

// Ruta 1: solo Admin
router.get('/ruta1', requireAuth, requireResourceAccess('ruta1'), (req, res) => {
  res.status(200).json({
    mensaje: 'Acceso concedido a Ruta 1 (solo Admin).',
    usuarioId: req.user.sub,
    rol: req.user.rol,
  });
});

// Ruta 2: Admin y Cliente
router.get('/ruta2', requireAuth, requireResourceAccess('ruta2'), (req, res) => {
  res.status(200).json({
    mensaje: 'Acceso concedido a Ruta 2 (Admin y Cliente).',
    usuarioId: req.user.sub,
    rol: req.user.rol,
  });
});

module.exports = router;
