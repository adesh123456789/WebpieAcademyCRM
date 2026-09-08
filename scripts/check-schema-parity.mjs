#!/usr/bin/env node
/**
 * Schema parity guard (FND-002 drift-guard decision, 2026-09-09).
 *
 * `prisma/schema.prisma` is the single source of truth. The PostgreSQL mirror
 * `prisma/schema.postgresql.prisma` must be byte-identical to it EXCEPT the
 * `datasource` block (which carries `provider = "postgresql"`). This guard fails
 * CI if anything else diverges, so a model/field edit can never land in one file
 * and silently miss the other.
 *
 * Run: `node scripts/check-schema-parity.mjs`
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const SQLITE = `${root}/prisma/schema.prisma`;
const POSTGRES = `${root}/prisma/schema.postgresql.prisma`;

const DATASOURCE_BLOCK = /datasource\s+\w+\s*\{[^}]*\}/m;

/** Drop the datasource block, normalize line endings / trailing whitespace / blank runs. */
function normalize(src) {
  return src
    .replace(DATASOURCE_BLOCK, "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function providerOf(src) {
  const m = src.match(/datasource\s+\w+\s*\{[^}]*provider\s*=\s*"([^"]+)"/m);
  return m ? m[1] : null;
}

let sqlite;
let postgres;
try {
  sqlite = readFileSync(SQLITE, "utf8");
  postgres = readFileSync(POSTGRES, "utf8");
} catch (err) {
  console.error(`schema parity: cannot read a schema file - ${err.message}`);
  process.exit(1);
}

const problems = [];

if (providerOf(sqlite) !== "sqlite") {
  problems.push(`prisma/schema.prisma datasource provider should be "sqlite", found ${JSON.stringify(providerOf(sqlite))}`);
}
if (providerOf(postgres) !== "postgresql") {
  problems.push(
    `prisma/schema.postgresql.prisma datasource provider should be "postgresql", found ${JSON.stringify(providerOf(postgres))}`,
  );
}

const a = normalize(sqlite).split("\n");
const b = normalize(postgres).split("\n");
if (a.join("\n") !== b.join("\n")) {
  const n = Math.max(a.length, b.length);
  let firstDiff = -1;
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) {
      firstDiff = i;
      break;
    }
  }
  problems.push(
    "prisma/schema.prisma and prisma/schema.postgresql.prisma diverge outside the datasource block.\n" +
      (firstDiff >= 0
        ? `  first difference at normalized line ${firstDiff + 1}:\n` +
          `    schema.prisma            : ${JSON.stringify(a[firstDiff] ?? "<eof>")}\n` +
          `    schema.postgresql.prisma : ${JSON.stringify(b[firstDiff] ?? "<eof>")}`
        : `  line counts differ: ${a.length} vs ${b.length}`),
  );
}

if (problems.length > 0) {
  console.error("Schema drift detected:\n");
  for (const p of problems) console.error(`- ${p}\n`);
  console.error(
    "Fix: mirror every change from prisma/schema.prisma into prisma/schema.postgresql.prisma\n" +
      "and regenerate prisma/migrations/, in the same commit.",
  );
  process.exit(1);
}

console.log(
  "schema parity OK: prisma/schema.postgresql.prisma mirrors prisma/schema.prisma (datasource block excluded)",
);
