# CLD-005 - first real CI run, three build-breaking bugs found and fixed (Claude, 2026-09-15)

**Final status: both jobs green.** `verify` (install, schema parity, Prisma generate/push,
tsc, full test suite, `next build`) and `container-smoke` (docker build, container run,
HTTP 200 wait, logs, teardown) both pass as of `9d70623`. CI has never actually run before
this pass - no remote existed - so this is the first real, end-to-end proof the build and
the Docker image both work, not just the source tree.

Wired a GitHub remote (`adesh123456789/WebpieAcademyCRM`) and pushed `master` -
`.github/workflows/ci.yml` had never actually run before (no remote existed
until now). Run #1 on `9025f4c` failed both jobs. Root-caused each via the
GitHub Checks API (`/check-runs/{id}/annotations`) rather than the (auth-walled)
raw logs, then reproduced and fixed both **without touching the live shared
checkout's uncommitted files** - Antigravity was actively editing
`src/components/views/CbtView.tsx` / `src/app/page.tsx` (UI-010) in this same
directory while I worked, so all reproduction happened in a throwaway
`git worktree` at the exact failing commit.

## Bug 1 - `verify` job: every SqliteNodeStore test threw

`TypeError: Cannot read properties of undefined (reading 'DatabaseSync')` in
`src/lib/node/sqlite-store.ts:108`, in all 10 `node-sqlite-store.test.ts` /
`offline-session-sqlite.e2e.test.ts` tests. Cause: `ci.yml` (and `Dockerfile`)
pinned **Node 20**; `node:sqlite` only exists from Node 22.5. On 20,
`process.getBuiltinModule` exists (backported) but returns `undefined` for a
module that isn't there - hence reading `.DatabaseSync` off `undefined`,
not a "not a function" error, which is what took a moment to place.

**Fix:** `ci.yml` `node-version: 20` -> `22`; `Dockerfile`'s three
`node:20-alpine` stages -> `node:22-alpine`. Both now carry a comment pointing
at each other so they don't drift again.

## Bug 2 - `container-smoke`: `next build` broke on `mupdf`

Never surfaced in `verify` because "Unit and route tests" failed first,
skipping "Production build" - so this was silent until `container-smoke`'s
`docker build` (which always reaches `npm run build`) hit it:

```
TypeError: e is not a function
  at .next/server/app/api/v1/omr/jobs/route.js:1:15636
Error: Failed to collect page data for /api/v1/omr/jobs
```

Cause: Next's "Collecting page data" build step actually **executes** each
route module (to read its runtime config) - and `/api/v1/omr/jobs` pulls in
`pdf-render.ts` -> `mupdf`, real ESM with a top-level await. Webpack-bundling
that for a Node.js route handler breaks. `sharp` is the same shape (native
binary) and had never been through a real build either.

**Fix:** `next.config.mjs` [NEW] - `experimental.serverComponentsExternalPackages:
["sharp", "mupdf"]`. Both now resolve from `node_modules` at runtime instead
of being bundled. Verified in an isolated `git worktree` at `9025f4c` (clean
`npm ci` + `npm run build`): all 39 routes build, including
`/api/v1/omr/jobs`.

## Process note

`git status` showed `src/components/views/CbtView.tsx`, `src/app/page.tsx`,
`docs/TASKS.md` modified and a new `docs/handoffs/UI-010-antigravity.md` -
Antigravity's live UI-010 work, uncommitted, in the same shared checkout I was
diagnosing in. I stashed those three paths once to get a clean baseline,
immediately found stashing was interfering with their concurrent edits
(`page.tsx` had already changed again between my revert and the stash), popped
the stash back right away, and moved all further reproduction into
`git worktree add --detach ../wpo-ci-check HEAD` instead - a full second
checkout, zero shared state. Left their files exactly as found; touched
nothing of theirs.

## Bug 3 - `container-smoke`: `docker build` still failed after the Node bump

No structured error available - GitHub gates raw Actions logs behind
sign-in, and the Checks annotations API only surfaces `::error::`-style
annotations, not plain shell output, so a failed opaque `docker build` step
gives nothing but "Process completed with exit code 1." Docker isn't
installed in this environment either, so no local repro was possible.

**Fix (evidence-based hypothesis, now confirmed by the green run):** Prisma's
query-engine binary needs `libssl` to run on musl libc - the single most
common "Prisma + Alpine" Docker failure, and this schema has no
`binaryTargets` override, so `prisma generate` relies entirely on runtime
platform auto-detection, which needs OpenSSL present to pick and validate
the right engine. Each Dockerfile stage starts a fresh `FROM node:22-alpine`
layer, so only `deps` had ever run `apk add` (`libc6-compat`, no openssl) -
`builder` (runs `prisma generate` twice) and `runner` (whose copied client
needs `libssl` to load the engine at container runtime) had none at all.
Added `apk add --no-cache openssl` to all three stages. Confirmed by
`9d70623`'s green run: `container-smoke` now builds, runs the container, and
serves HTTP 200.

## Landed

- `.github/workflows/ci.yml` - Node 20 -> 22.
- `Dockerfile` - `node:20-alpine` -> `node:22-alpine` (all 3 stages) + `openssl`
  installed in all three (Prisma's musl/libssl requirement).
- `next.config.mjs` [NEW] - externalizes `sharp` + `mupdf` from the server bundle.

## Checks

Isolated worktree at `9025f4c` + the Node/webpack fixes: clean `npm ci`, clean
`npm run build` (all routes, incl. `/api/v1/omr/jobs`). Local `tsc --noEmit`
and `npm test` (39 files / 324 pass / 16 todo) both stayed clean in the live
checkout throughout - none of these files intersect Antigravity's in-flight
UI-010 ones. Real CI, run 3 (`9d70623`): **verify success, container-smoke
success** - https://github.com/adesh123456789/WebpieAcademyCRM/actions/runs/34971151353
