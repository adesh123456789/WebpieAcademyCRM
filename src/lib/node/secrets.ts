import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { NodePairing } from "./local-store";

/**
 * EDGE-001 / C06 SEC-006 - the Academic Node's secret at rest. The pairing token
 * never lives in plaintext env vars or logs. `NodeSecrets` is the abstraction;
 * production should use an OS keychain (Windows DPAPI / macOS Keychain / libsecret)
 * via a platform adapter - `OsKeychainSecrets` is the seam for that. Until one is
 * wired, `EncryptedFileSecrets` gives real at-rest AES-256-GCM using the
 * OS-provided `NODE_ENCRYPTION_KEY`.
 */

export interface StoredSecrets {
  pairing: NodePairing;
}

export interface NodeSecrets {
  load(): StoredSecrets | null;
  save(secrets: StoredSecrets): void;
  clear(): void;
}

export class MemorySecrets implements NodeSecrets {
  private value: StoredSecrets | null = null;
  load() {
    return this.value ? structuredClone(this.value) : null;
  }
  save(secrets: StoredSecrets) {
    this.value = structuredClone(secrets);
  }
  clear() {
    this.value = null;
  }
}

function keyFrom(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest(); // 32 bytes
}

/** AES-256-GCM encrypted JSON file (mode 0600 where the OS honours it). */
export class EncryptedFileSecrets implements NodeSecrets {
  constructor(
    private path: string,
    private encryptionKey: string = process.env.NODE_ENCRYPTION_KEY || "",
  ) {
    if (!this.encryptionKey) {
      throw new Error("EncryptedFileSecrets requires NODE_ENCRYPTION_KEY (OS-provided)");
    }
  }

  load(): StoredSecrets | null {
    if (!existsSync(this.path)) return null;
    const raw = readFileSync(this.path, "utf8");
    let parsed: { iv: string; tag: string; data: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("node secrets file is corrupt");
    }
    const decipher = createDecipheriv("aes-256-gcm", keyFrom(this.encryptionKey), Buffer.from(parsed.iv, "base64"));
    decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));
    let json: string;
    try {
      json = decipher.update(Buffer.from(parsed.data, "base64"), undefined, "utf8") + decipher.final("utf8");
    } catch {
      throw new Error("node secrets could not be decrypted (wrong NODE_ENCRYPTION_KEY or tampered file)");
    }
    return JSON.parse(json) as StoredSecrets;
  }

  save(secrets: StoredSecrets): void {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", keyFrom(this.encryptionKey), iv);
    const enc = Buffer.concat([cipher.update(JSON.stringify(secrets), "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const dir = dirname(this.path);
    if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(
      this.path,
      JSON.stringify({ iv: iv.toString("base64"), tag: tag.toString("base64"), data: enc.toString("base64") }),
      { mode: 0o600 },
    );
    try {
      chmodSync(this.path, 0o600);
    } catch {
      /* Windows / restricted FS - best effort */
    }
  }

  clear(): void {
    if (existsSync(this.path)) rmSync(this.path);
  }
}

/** Seam for a real platform keychain. Not implemented in this build. */
export class OsKeychainSecrets implements NodeSecrets {
  load(): StoredSecrets | null {
    throw new Error("OsKeychainSecrets not implemented - use EncryptedFileSecrets or a platform adapter");
  }
  save(_secrets: StoredSecrets): void {
    throw new Error("OsKeychainSecrets not implemented - use EncryptedFileSecrets or a platform adapter");
  }
  clear(): void {
    throw new Error("OsKeychainSecrets not implemented");
  }
}
