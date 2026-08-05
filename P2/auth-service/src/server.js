require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());

// Ruta de salud, para probar que el servicio está vivo antes de implementar
// la lógica real de validación de permisos (Fase 3).
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Aquí en la Fase 3 se implementará, por ejemplo:
// POST /authorize  { rol, recurso }  ->  { permitido: true/false }

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Microservicio de autorización escuchando en http://localhost:${PORT}`);
});
