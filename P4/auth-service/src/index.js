import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";

import { cifrarAES, descifrarAES, hashPassword, verificarPassword } from "./crypto.js";
import { pool } from "./db.js";

const PORT = process.env.PORT || 8004;
const JWT_SECRET = process.env.JWT_SECRET || "cambia-esto-en-produccion";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "2h";
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "token";
const COOKIE_SECURE = process.env.NODE_ENV === "production";

const app = express();
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "auth-service" });
});

// POST /register  { username, email, password, rol? }
app.post("/register", async (req, res) => {
  const { username, email, password, rol } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email y password son requeridos" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
  }

  try {
    const passwordHash = await hashPassword(password);
    const { cifrado, iv, authTag } = cifrarAES(email);

    const [resultado] = await pool.query(
      `INSERT INTO usuarios (username, email_cifrado, email_iv, email_auth_tag, password_hash, rol)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, cifrado, iv, authTag, passwordHash, rol === "admin" ? "admin" : "cliente"]
    );

    res.status(201).json({
      id: resultado.insertId,
      username,
      rol: rol === "admin" ? "admin" : "cliente",
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "El nombre de usuario ya existe" });
    }
    console.error(err);
    res.status(500).json({ error: "Error interno al registrar usuario" });
  }
});

// POST /login  { username, password }
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "username y password son requeridos" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT * FROM usuarios WHERE username = ? LIMIT 1",
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const usuario = rows[0];
    const passwordOk = await verificarPassword(password, usuario.password_hash);

    if (!passwordOk) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      { sub: usuario.id, username: usuario.username, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: "lax",
      maxAge: 2 * 60 * 60 * 1000, // 2h
    });

    res.json({
      id: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno al iniciar sesión" });
  }
});

// GET /me - requiere cookie válida
app.get("/me", async (req, res) => {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    const [rows] = await pool.query("SELECT * FROM usuarios WHERE id = ?", [
      payload.sub,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const usuario = rows[0];
    const email = descifrarAES(
      usuario.email_cifrado,
      usuario.email_iv,
      usuario.email_auth_tag
    );

    res.json({
      id: usuario.id,
      username: usuario.username,
      email,
      rol: usuario.rol,
      creadoEn: usuario.creado_en,
    });
  } catch (err) {
    return res.status(401).json({ error: `Token inválido: ${err.message}` });
  }
});

// POST /logout
app.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`auth-service escuchando en puerto ${PORT}`);
});
