CREATE DATABASE IF NOT EXISTS auth_db CHARACTER SET utf8mb4;
USE auth_db;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  -- El correo se guarda cifrado con AES-256-GCM: iv y authTag van aparte
  -- porque GCM no es determinístico (no se puede indexar/buscar directo).
  email_cifrado TEXT NOT NULL,
  email_iv VARCHAR(32) NOT NULL,
  email_auth_tag VARCHAR(32) NOT NULL,
  password_hash VARCHAR(60) NOT NULL, -- hash bcrypt
  rol ENUM('cliente', 'admin') NOT NULL DEFAULT 'cliente',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
