const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Protegida: requiere JWT válido (o renovable dentro de la ventana de gracia).
// El frontend la usa para la página de confirmación tras el login.
router.get('/me', requireAuth, authController.me);

module.exports = router;
