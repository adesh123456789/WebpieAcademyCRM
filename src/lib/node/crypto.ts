import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * EDGE-001 - the shared AES-256-GCM primitive behind every at-rest secret on the
 * Academic Node: `EncryptedFileSecrets` (the pairing-token file) and
 * `SqliteNodeStore` (the pairing token column in the durable store) both use
 * this instead of each rolling its own cipher plumbing.
 */

export interface EncryptedString {
  iv: string;
  tag: string;
  data: string;
}

function keyFrom(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest(); // 32 bytes
}

export function encryptString(plaintext: string, key: string): EncryptedString {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(key), iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString("base64"), tag: tag.toString("base64"), data: data.toString("base64") };
}

/** Throws if `key` is wrong or `enc` was tampered with (GCM auth tag mismatch). */
export function decryptString(enc: EncryptedString, key: string): string {
  const decipher = createDecipheriv("aes-256-gcm", keyFrom(key), Buffer.from(enc.iv, "base64"));
  decipher.setAuthTag(Buffer.from(enc.tag, "base64"));
  try {
    return decipher.update(Buffer.from(enc.data, "base64"), undefined, "utf8") + decipher.final("utf8");
  } catch {
    throw new Error("could not decrypt (wrong key or tampered data)");
  }
}
