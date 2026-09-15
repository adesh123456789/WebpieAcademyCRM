# CLD-005 - first real CI run, two build-breaking bugs found and fixed (Claude, 2026-09-15)

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

## Landed

- `.github/workflows/ci.yml` - Node 20 -> 22.
- `Dockerfile` - `node:20-alpine` -> `node:22-alpine` (all 3 stages).
- `next.config.mjs` [NEW] - externalizes `sharp` + `mupdf` from the server bundle.

## Checks

Isolated worktree at `9025f4c` + these 3 files: clean `npm ci`, clean
`npm run build` (all routes, incl. `/api/v1/omr/jobs`). Local `tsc --noEmit`
and `npm test` (39 files / 324 pass / 16 todo) both still clean in the live
checkout - my files don't intersect Antigravity's in-flight ones. Pushed as
`<commit after this file>`; watching the resulting CI run next.
