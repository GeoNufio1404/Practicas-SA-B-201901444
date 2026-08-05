const pool = require('../config/db');

async function create({ nombreEnc, correoEnc, correoHash, passwordHash, rol }) {
  const [result] = await pool.query(
    `INSERT INTO usuarios (nombre_enc, correo_enc, correo_hash, password_hash, rol)
     VALUES (?, ?, ?, ?, ?)`,
    [nombreEnc, correoEnc, correoHash, passwordHash, rol]
  );
  return result.insertId;
}

async function findByCorreoHash(correoHash) {
  const [rows] = await pool.query('SELECT * FROM usuarios WHERE correo_hash = ? LIMIT 1', [correoHash]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM usuarios WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

module.exports = { create, findByCorreoHash, findById };
