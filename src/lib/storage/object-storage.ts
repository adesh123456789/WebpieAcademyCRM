import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export interface ObjectStorage {
  put(bytes: Uint8Array, name: string): Promise<string>;
  get(url: string): Promise<Buffer>;
}

export class LocalObjectStorage implements ObjectStorage {
  constructor(private root = process.env.UPLOAD_DIR || "uploads") {}
  async put(bytes: Uint8Array, name: string) {
    await mkdir(this.root, { recursive: true });
    const safe = name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${randomUUID()}-${safe}`;
    await writeFile(join(this.root, key), bytes);
    return `/uploads/${key}`;
  }

  async get(url: string) {
    const match = /^\/uploads\/([0-9a-f-]{36})-([a-zA-Z0-9._-]+)$/.exec(url);
    if (!match) throw new Error("Invalid stored OMR object key");
    const key = match[0].slice("/uploads/".length);
    return readFile(join(this.root, key));
  }
}

export const objectStorage: ObjectStorage = new LocalObjectStorage();
