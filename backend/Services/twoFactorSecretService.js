import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const PREFIX = "enc:v1:";

function encryptionKey() {
  const value = process.env.TWO_FACTOR_ENCRYPTION_KEY;
  if (!value) throw new Error("TWO_FACTOR_ENCRYPTION_KEY doit être configurée pour la 2FA.");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("TWO_FACTOR_ENCRYPTION_KEY doit être une clé Base64 de 32 octets.");
  return key;
}

export function encryptTwoFactorSecret(secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(secret), "utf8"), cipher.final()]);
  return `${PREFIX}${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptTwoFactorSecret(value) {
  if (!value) return "";
  const stored = String(value);
  // Compatibilité temporaire pour les comptes configurés avant le chiffrement.
  if (!stored.startsWith(PREFIX)) return stored;
  const [ivValue, tagValue, payload] = stored.slice(PREFIX.length).split(".");
  if (!ivValue || !tagValue || !payload) throw new Error("Secret 2FA chiffré invalide.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(payload, "base64url")), decipher.final()]).toString("utf8");
}

