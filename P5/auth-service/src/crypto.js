import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const ALGORITMO = "aes-256-gcm";
const BCRYPT_ROUNDS = 10;

// La clave debe ser de 32 bytes (256 bits). Se espera en hex (64 caracteres) por env var.
function obtenerClaveAES() {
  const claveHex = process.env.AES_KEY;
  if (!claveHex || claveHex.length !== 64) {
    throw new Error(
      "AES_KEY debe ser una cadena hex de 64 caracteres (32 bytes / 256 bits)"
    );
  }
  return Buffer.from(claveHex, "hex");
}

/**
 * Cifra un texto plano (ej. el correo del usuario) con AES-256-GCM.
 * Devuelve el texto cifrado, el IV y el authTag, todos en hex,
 * porque los tres son necesarios para poder descifrar después.
 */
export function cifrarAES(textoPlano) {
  const clave = obtenerClaveAES();
  const iv = crypto.randomBytes(12); // 96 bits recomendado para GCM
  const cipher = crypto.createCipheriv(ALGORITMO, clave, iv);

  let cifrado = cipher.update(textoPlano, "utf8", "hex");
  cifrado += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return {
    cifrado,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

/**
 * Descifra un valor previamente cifrado con cifrarAES.
 * Si el authTag no coincide (dato manipulado), lanza un error.
 */
export function descifrarAES(cifradoHex, ivHex, authTagHex) {
  const clave = obtenerClaveAES();
  const decipher = crypto.createDecipheriv(
    ALGORITMO,
    clave,
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  let textoPlano = decipher.update(cifradoHex, "hex", "utf8");
  textoPlano += decipher.final("utf8");
  return textoPlano;
}

export async function hashPassword(passwordPlano) {
  return bcrypt.hash(passwordPlano, BCRYPT_ROUNDS);
}

export async function verificarPassword(passwordPlano, hash) {
  return bcrypt.compare(passwordPlano, hash);
}
