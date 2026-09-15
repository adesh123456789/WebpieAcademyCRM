/**
 * Minimal ambient typings for Node's built-in `node:sqlite` (stable, unflagged
 * since Node 22.5; ships in the Node 24 this repo runs). `@types/node` is
 * pinned to ^20.17 for the rest of the app, which predates this module, so
 * this local declaration covers only what `sqlite-store.ts` uses rather than
 * bumping the shared `@types/node` version for one file. Safe to delete once
 * `@types/node` moves to 22+.
 *
 * Kept as a plain ambient module declaration (no `declare global` / `export {}`
 * augmentation here) - adding those turned this file into a module and broke
 * TS's resolution of the "node:sqlite" specifier for `import type` elsewhere.
 * `process.getBuiltinModule`'s own typing is handled locally in sqlite-store.ts.
 */
declare module "node:sqlite" {
  export interface StatementResultingChanges {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  }

  export class StatementSync {
    run(...params: unknown[]): StatementResultingChanges;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  }

  export class DatabaseSync {
    constructor(path: string, options?: { open?: boolean; readOnly?: boolean; enableForeignKeyConstraints?: boolean });
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
