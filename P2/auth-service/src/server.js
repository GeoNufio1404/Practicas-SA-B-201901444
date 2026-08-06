require('dotenv').config();
const express = require('express');
const { authorize } = require('./controllers/authorize.controller');

const app = express();
app.use(express.json());

// Ruta de salud, para probar que el servicio está vivo antes de implementar
// la lógica real de validación de permisos (Fase 3).
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Recibe { rol, recurso } y responde { permitido: true/false }.
// Desacoplado por completo de la autenticación: no valida el JWT, no sabe qué
// es un usuario ni una contraseña. Solo conoce roles y recursos.
app.post('/authorize', authorize);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Microservicio de autorización escuchando en http://localhost:${PORT}`);
});
