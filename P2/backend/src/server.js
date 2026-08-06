require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const pool = require('./config/db');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN,
    credentials: true, // necesario para que las cookies HTTP-only viajen
  })
);

// Ruta de salud: confirma que el servidor y la BD están vivos.
// Útil para probar la Fase 0-1 antes de construir login/JWT.
app.get('/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ server: 'ok', database: rows[0].ok === 1 ? 'ok' : 'fail' });
  } catch (err) {
    res.status(500).json({ server: 'ok', database: 'fail', error: err.message });
  }
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api', require('./routes/protected.routes'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend principal escuchando en http://localhost:${PORT}`);
});
