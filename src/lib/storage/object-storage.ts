import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export interface ObjectStorage { put(bytes: Uint8Array, name: string): Promise<string>; }

export class LocalObjectStorage implements ObjectStorage {
  constructor(private root = process.env.UPLOAD_DIR || "uploads") {}
  async put(bytes: Uint8Array, name: string) {
    await mkdir(this.root, { recursive: true });
    const safe = name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${randomUUID()}-${safe}`;
    await writeFile(join(this.root, key), bytes);
    return `/uploads/${key}`;
  }
}

export const objectStorage: ObjectStorage = new LocalObjectStorage();
