const crypto = require('crypto');
require('dotenv').config();

// AES-256-GCM: cifrado simétrico autenticado (detecta si el dato fue alterado).
// La clave debe ser de 32 bytes (256 bits), la pasamos como hex en el .env.
const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.AES_SECRET_KEY, 'hex');
const IV_LENGTH = 12; // recomendado para GCM

/**
 * Encripta un texto plano y devuelve un string listo para guardar en BD.
 * Formato guardado: iv:authTag:cipherText (todo en hex, separado por ':')
 */
function encrypt(plainText) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(String(plainText), 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

/**
 * Desencripta un valor generado por encrypt().
 */
function decrypt(storedValue) {
  const [ivHex, authTagHex, encryptedHex] = storedValue.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Hash determinístico (no reversible) usado SOLO como índice de búsqueda,
 * por ejemplo para encontrar un usuario por correo sin desencriptar toda la tabla.
 */
function hashForLookup(plainText) {
  return crypto.createHash('sha256').update(String(plainText).toLowerCase().trim()).digest('hex');
}

module.exports = { encrypt, decrypt, hashForLookup };
