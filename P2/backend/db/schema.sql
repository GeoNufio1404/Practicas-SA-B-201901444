-- Práctica 2 - Software Avanzado
-- Esquema de base de datos MySQL

CREATE DATABASE IF NOT EXISTS practica2_auth
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE practica2_auth;

CREATE TABLE IF NOT EXISTS usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,

  -- Datos sensibles encriptados con AES (reversibles: se necesitan para mostrarlos de vuelta)
  nombre_enc    VARCHAR(512) NOT NULL,
  correo_enc    VARCHAR(512) NOT NULL,

  -- El correo también se guarda con un hash determinístico (SHA-256) SOLO para poder
  -- buscar/validar unicidad y hacer login por correo sin desencriptar toda la tabla.
  -- Esto NO es información sensible legible, es un índice de búsqueda.
  correo_hash   CHAR(64) NOT NULL UNIQUE,

  -- La contraseña se guarda con hash (bcrypt), no con AES.
  -- Ver nota en el README: hash es irreversible por diseño, que es lo correcto
  -- para contraseñas (ni el sistema debe poder "leer" la contraseña real).
  password_hash VARCHAR(255) NOT NULL,

  rol           ENUM('admin', 'cliente') NOT NULL DEFAULT 'cliente',

  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Índice adicional por si se buscan usuarios por rol frecuentemente
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
