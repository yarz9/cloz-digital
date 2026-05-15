import crypto from 'crypto';

// ══════════════════════════════════════════════════════════════
//  Credential Encryption Service
//  AES-256-GCM encryption for mail account passwords
// ══════════════════════════════════════════════════════════════

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const ENCODING = 'hex';

/**
 * Derives a 32-byte key from the encryption secret.
 * Uses ADMIN_PASSWORD + a fixed salt as the base.
 * In production, set MAIL_ENCRYPTION_KEY env var for a dedicated secret.
 */
function getEncryptionKey() {
  const secret = process.env.MAIL_ENCRYPTION_KEY || process.env.ADMIN_PASSWORD || 'cloz-digital-default-key';
  return crypto.scryptSync(secret, 'cloz-mail-salt-v1', 32);
}

/**
 * Encrypt a plaintext string.
 * Returns hex-encoded: iv + authTag + ciphertext
 */
export function encrypt(plaintext) {
  if (!plaintext) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', ENCODING);
  encrypted += cipher.final(ENCODING);
  const authTag = cipher.getAuthTag();

  // Concatenate: iv (32 hex) + authTag (32 hex) + ciphertext
  return iv.toString(ENCODING) + authTag.toString(ENCODING) + encrypted;
}

/**
 * Decrypt an encrypted hex string.
 * Expects: iv (32 hex) + authTag (32 hex) + ciphertext
 */
export function decrypt(encryptedHex) {
  if (!encryptedHex) return '';
  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(encryptedHex.slice(0, IV_LENGTH * 2), ENCODING);
    const authTag = Buffer.from(encryptedHex.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2), ENCODING);
    const ciphertext = encryptedHex.slice((IV_LENGTH + TAG_LENGTH) * 2);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, ENCODING, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return '';
  }
}

/**
 * Mask a password for API display.
 * Shows first and last char with dots in between.
 */
export function maskPassword(password) {
  if (!password) return '';
  if (password.length <= 2) return '••••';
  return password[0] + '•'.repeat(Math.min(password.length - 2, 8)) + password[password.length - 1];
}

/**
 * Check if a string looks like it's already encrypted (hex, correct min length).
 */
export function isEncrypted(str) {
  if (!str) return false;
  // Minimum: 32 (iv) + 32 (tag) + 2 (1 byte cipher) = 66 hex chars
  return str.length >= 66 && /^[0-9a-f]+$/i.test(str);
}
