const bcrypt = require('bcrypt');
const userModel = require('../models/user.model');
const { encrypt, decrypt, hashForLookup } = require('../utils/aes');
const { signToken, EXPIRATION_SECONDS } = require('../utils/jwt');
const { setAuthCookie, clearAuthCookie } = require('../utils/cookies');

const SALT_ROUNDS = 10;
const ROLES_VALIDOS = ['admin', 'cliente'];

async function register(req, res) {
  try {
    const { nombre, correo, password, rol } = req.body;

    if (!nombre || !correo || !password) {
      return res.status(400).json({ error: 'nombre, correo y password son requeridos.' });
    }

    const rolFinal = ROLES_VALIDOS.includes(rol) ? rol : 'cliente';

    const correoHash = hashForLookup(correo);
    const existente = await userModel.findByCorreoHash(correoHash);
    if (existente) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
    }

    const nombreEnc = encrypt(nombre);
    const correoEnc = encrypt(correo);
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const id = await userModel.create({
      nombreEnc,
      correoEnc,
      correoHash,
      passwordHash,
      rol: rolFinal,
    });

    return res.status(201).json({
      id,
      nombre,
      correo,
      rol: rolFinal,
    });
  } catch (err) {
    console.error('Error en register:', err);
    return res.status(500).json({ error: 'Error interno al registrar el usuario.' });
  }
}

async function login(req, res) {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ error: 'correo y password son requeridos.' });
    }

    const correoHash = hashForLookup(correo);
    const usuario = await userModel.findByCorreoHash(correoHash);

    // Mensaje genérico a propósito: no revelar si el correo existe o no.
    const credencialesInvalidas = () => res.status(401).json({ error: 'Credenciales inválidas.' });

    if (!usuario) {
      return credencialesInvalidas();
    }

    const passwordOk = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordOk) {
      return credencialesInvalidas();
    }

    const token = signToken({ sub: usuario.id, rol: usuario.rol });
    setAuthCookie(res, token, EXPIRATION_SECONDS);

    return res.status(200).json({
      id: usuario.id,
      nombre: decrypt(usuario.nombre_enc),
      correo: decrypt(usuario.correo_enc),
      rol: usuario.rol,
    });
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ error: 'Error interno al iniciar sesión.' });
  }
}

function logout(req, res) {
  clearAuthCookie(res);
  return res.status(200).json({ message: 'Sesión cerrada.' });
}

async function me(req, res) {
  try {
    // req.user lo llena el middleware de autenticación (ver auth.middleware.js)
    const usuario = await userModel.findById(req.user.sub);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    return res.status(200).json({
      id: usuario.id,
      nombre: decrypt(usuario.nombre_enc),
      correo: decrypt(usuario.correo_enc),
      rol: usuario.rol,
    });
  } catch (err) {
    console.error('Error en me:', err);
    return res.status(500).json({ error: 'Error interno.' });
  }
}

module.exports = { register, login, logout, me };
