import { execFileSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import type { GlobalSetupContext } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    databaseTemplate: string;
    testDirectory: string;
  }
}

export default function setup({ provide }: GlobalSetupContext) {
  const tempParent = realpathSync(tmpdir());
  const directory = realpathSync(mkdtempSync(join(tempParent, "webpie-tests-")));
  const marker = randomUUID();
  writeFileSync(join(directory, ".test-owner"), marker);
  const template = join(directory, "template.db");
  writeFileSync(template, "");
  const cleanup = () => {
    // Only remove the exact temporary directory created by this invocation.
    if (dirname(directory) !== tempParent || !basename(directory).startsWith("webpie-tests-") ||
        readFileSync(join(directory, ".test-owner"), "utf8") !== marker) {
      throw new Error("Refusing to remove an unowned test directory");
    }
    rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  };
  try {
    const require = createRequire(import.meta.url);
    execFileSync(process.execPath, [
      require.resolve("prisma/build/index.js"), "db", "push", "--skip-generate",
      "--schema", resolve("prisma/schema.prisma"),
    ], {
      cwd: directory,
      env: { ...process.env, DATABASE_URL: `file:${template.replace(/\\/g, "/")}` },
      stdio: "pipe",
      timeout: 60_000,
    });
    provide("databaseTemplate", template);
    provide("testDirectory", directory);
  } catch (error) {
    cleanup();
    const detail = error instanceof Error ? error.message : "Unknown initialization error";
    throw new Error(`Test schema initialization failed; no development database was used. ${detail}`);
  }
  return cleanup;
}
