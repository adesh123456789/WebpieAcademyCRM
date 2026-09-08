# Isolated tests

Run `npm test` for the complete suite, or `npm run test:isolation` for tenant-boundary fixtures. `npm run test:watch` also uses isolated databases. Existing individual scripts continue to work; no dependency changes or seed command is required.

Prerequisites: installed package-lock dependencies, Node, and a Prisma client generated from the current schema (`npm ci`, `npx prisma generate`). The present test database provider is SQLite. FND-002 will establish the cloud PostgreSQL test lane separately.

## Isolation lifecycle

1. Vitest global setup creates an owned `webpie-tests-*` directory inside the OS temporary directory.
2. Prisma `db push --skip-generate` applies the repository schema to a new empty template database. An explicit temporary DATABASE_URL overrides any inherited development/production URL. This command never generates into shared node_modules and never runs the demo seed.
3. Before each test file imports application modules, setup copies that template into a unique suite directory and sets DATABASE_URL and a synthetic JWT secret. Model API keys are removed in the test worker. Concurrent suites and watch reruns cannot share their data.
4. Integration suites use `createTestWorld()` to create explicit synthetic records. The factory refuses a database URL outside the injected test directory.
5. Each suite disconnects Prisma. Global teardown validates directory location and its ownership marker before removing the temporary directory. An abruptly killed process can leave a temporary directory, but it does not redirect writes into the development database.

Only configured Vitest runs are supported. Do not bypass `vitest.config.ts` for database suites or point tests at the demo DB. Do not use `scripts/seed.js` in automated tests. An existing development server may continue using its own database.

## Fixture world

Two tenants (institute and individual teacher), each with two branches, one course, assigned/unassigned/other-branch batches and three enrolled students. A parent links to two children; the third is unlinked. Each tenant has owner/individual-teacher, branch-admin, teacher, counsellor, accountant, student and parent accounts. Account IDs differ from profile IDs; roll numbers deliberately overlap across tenants. A private question, finalized exam and fee plan support route and sync checks.

The current schema has no explicit account-to-student/account-to-parent relation. Fixture emails correspond and the returned world contains both IDs, but that is not an authorization policy. SEC-001 must implement and test authoritative identity linkage; never infer production access merely from matching fixture emails. Teacher assignment JSON is a fixture input, not proof that current routes enforce assignments.

## Route tests

`tests/support/request.ts` constructs real NextRequest objects with bearer or cookie sessions. `routes-foundation.test.ts` invokes production handlers and the real Prisma client: login/session round trip, invalid credentials/token, tenant-scoped student listing, denied teacher fee access and permitted accountant access.

These are handler integration tests, not browser/network end-to-end tests. They do not cover middleware, deployed cookies/proxy behavior, all scopes, parent authorization, CBT ownership or the full assessment loop. SEC-001 adds regression tests for those known access gaps. Existing sync tests still cover a prototype happy path, not durable offline/replay correctness.
