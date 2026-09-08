import { copyFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { afterAll, inject } from "vitest";

// Runs before test modules import the application's Prisma singleton.
// A new DB per file also isolates parallel workers and watch-mode reruns.
const directory = mkdtempSync(join(inject("testDirectory"), "suite-"));
const database = join(directory, "test.db");
copyFileSync(inject("databaseTemplate"), database);
process.env.DATABASE_URL = `file:${database.replace(/\\/g, "/")}`;
process.env.JWT_SECRET = "synthetic-tests-only-not-a-production-secret";
delete process.env.GEMINI_API_KEY;
delete process.env.OPENAI_API_KEY;

afterAll(async () => {
  const { prisma } = await import("../../src/lib/prisma");
  await prisma.$disconnect();
});
