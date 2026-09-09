import { afterEach, describe, expect, it } from "vitest";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { EncryptedFileSecrets, MemorySecrets, OsKeychainSecrets, type StoredSecrets } from "../../src/lib/node/secrets";

const PAIRING: StoredSecrets = {
  pairing: { nodeId: "n1", tenantId: "T_A", branchId: "BR_1", token: "node_abc123secret456" },
};

const paths: string[] = [];
const tmpPath = () => {
  const p = join(tmpdir(), `node-secrets-${Math.random().toString(36).slice(2)}.json`);
  paths.push(p);
  return p;
};
afterEach(() => {
  for (const p of paths.splice(0)) if (existsSync(p)) rmSync(p);
});

describe("MemorySecrets", () => {
  it("round-trips and clears; returns a copy, not the stored reference", () => {
    const s = new MemorySecrets();
    expect(s.load()).toBeNull();
    s.save(PAIRING);
    const a = s.load()!;
    expect(a).toEqual(PAIRING);
    a.pairing.token = "mutated";
    expect(s.load()!.pairing.token).toBe(PAIRING.pairing.token); // stored copy untouched
    s.clear();
    expect(s.load()).toBeNull();
  });
});

describe("EncryptedFileSecrets", () => {
  const KEY = "test-node-encryption-key-please-32b";

  it("encrypts at rest - the token is never plaintext in the file", () => {
    const path = tmpPath();
    new EncryptedFileSecrets(path, KEY).save(PAIRING);
    const onDisk = readFileSync(path, "utf8");
    expect(onDisk).not.toContain(PAIRING.pairing.token);
    expect(onDisk).not.toContain("node_abc123");
    const parsed = JSON.parse(onDisk);
    expect(parsed).toHaveProperty("iv");
    expect(parsed).toHaveProperty("tag");
  });

  it("round-trips with the right key", () => {
    const path = tmpPath();
    const store = new EncryptedFileSecrets(path, KEY);
    store.save(PAIRING);
    expect(store.load()).toEqual(PAIRING);
    store.clear();
    expect(existsSync(path)).toBe(false);
  });

  it("fails to decrypt with the wrong key or a tampered file", () => {
    const path = tmpPath();
    new EncryptedFileSecrets(path, KEY).save(PAIRING);
    expect(() => new EncryptedFileSecrets(path, "a-different-key-entirely-abcdef12").load()).toThrow(/decrypt/i);

    const parsed = JSON.parse(readFileSync(path, "utf8"));
    parsed.data = Buffer.from("tampered-ciphertext").toString("base64");
    require("node:fs").writeFileSync(path, JSON.stringify(parsed));
    expect(() => new EncryptedFileSecrets(path, KEY).load()).toThrow();
  });

  it("requires an encryption key", () => {
    expect(() => new EncryptedFileSecrets(tmpPath(), "")).toThrow(/NODE_ENCRYPTION_KEY/);
  });
});

describe("OsKeychainSecrets", () => {
  it("is a not-implemented seam", () => {
    const s = new OsKeychainSecrets();
    expect(() => s.load()).toThrow(/not implemented/i);
    expect(() => s.save({} as StoredSecrets)).toThrow(/not implemented/i);
  });
});
