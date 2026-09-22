# Frontend Modernization Plan

This is the standing roadmap for the client rewrite described in `CLAUDE.md`'s
"Modernize" section. It's a living document — update the checkboxes and the
"Status" line as work actually happens. This repo has no test suite and
Claude is guidance-only on this effort by project convention, so every task
below is meant to be executed by hand, one screen at a time, not delegated.

Phases 0–3 each have their full checklist/detail in their own file (linked
below); this doc only carries a condensed summary of each plus the full
detail for the not-yet-started, forward-looking Phases 4–5.

**Status:** Phase 0, Phase 1, and Phase 2 done and committed (one noted gap
in Phase 2's verification — see its doc). Phase 3 not started.

---

## Phase 0 — Stabilize the legacy/new split *(done, committed)*

Moved `client/` → `client-legacy/src/` and relocated the webpack/eslint
build tooling into `client-legacy/`, fixed a stale `ESLintPlugin` context
path that was silently linting zero files, and verified the legacy build
and dev server both still work end-to-end.

Full detail: [phase-0-legacy-split.md](./phase-0-legacy-split.md)

---

## Phase 1 — Workspace setup *(done, committed)*

Converted the single root `package.json` into npm workspaces (`server`,
`client-legacy`, `client`, plus a `scripts` workspace added during
execution) behind a purely coordinating root, split dependencies by actual
grep'd usage rather than guesswork, and moved `server/`'s application code
into `server/src/` — which surfaced and fixed several cwd/`__dirname`-relative
path bugs (`views/` resolution, `../assets` climb, local config path,
a stale `dependency-cruiser` entrypoint pattern) along the way.

Full detail: [phase-1-workspace-setup.md](./phase-1-workspace-setup.md)

---

## Phase 2 — New client scaffold + vertical slice (`main.home`) *(done, committed)*

Scaffolds the new React/TS/Tailwind/Vite client and ports the authenticated
shell (nav, Zod-validated cookie parsing, flat + compound `and`/`or`
permission checks) plus the `main.home` screen — the first full vertical
slice (build tooling + shell + one real screen against the real API) that
every later screen will build on. The legacy client-side session-timeout
cookie was deliberately dropped rather than ported (the server session's
24h TTL already rolls forward on activity, so it wasn't buying any real
security — see phase-2-client-scaffold.md for the full reasoning). One
verification gap remains: a session going stale without a full page reload
isn't yet handled — see phase-2-client-scaffold.md's 2.3.

Full detail: [phase-2-client-scaffold.md](./phase-2-client-scaffold.md)

---

## Phase 3 — Screen-by-screen migration *(not started)*

The per-screen migration checklist template, plus the full inventory of
AngularJS screens/controllers/partials to port, grouped by nav section
(Lots, Manifests, Shipments, Inventory Pallets, Orders, Users, etc.), and
the shared modals/directives to port once and reuse.

Full detail: [phase-3-screen-migration.md](./phase-3-screen-migration.md)

---

## Phase 4 — Backend TypeScript (not started, forward-looking only)

Not begun. Don't start until Phase 2/3 are far enough along that the pattern
for "one file at a time" is well understood from the frontend side. When it
starts:

- [ ] Add `typescript` + `@types/node` as devDependencies in
      `server/package.json` (this is the backend workspace's own concern —
      it doesn't belong in the now purely-coordinating root `package.json`,
      nor in `client/package.json`).
- [ ] Add `server/tsconfig.json` with `allowJs: true`, `checkJs: false`
      initially (opt in per-file via `// @ts-check` or by converting a file
      to `.ts`, not repo-wide).
- [ ] Pick the first file deliberately: something small, leaf-level, with no
      module-load-order hazards — i.e. NOT `bstock-db.js` or the four
      `S3Client`-holding modules (`media-server.js`, `document-svc.js`,
      `manifest-svc.js`, `product-data.js`), all of which read
      `global.__config`/`__mongooseConnection` at module-load time (see
      Runtime & Networking in `CLAUDE.md`) and would need that hazard
      understood first.
- [ ] Vite + Vitest for the backend: also not started. Note when picked up
      that this is a separate concern from the Vite dev server the frontend
      already uses — the backend would use Vite in library/SSR mode or just
      Vitest alone for tests without Vite's dev server, since `server.js`
      isn't a Vite-servable frontend asset pipeline.

---

## Phase 5 — Deployment (not started, forward-looking only)

Deployment was broken by this exercise. If the product of this exercise is ever to be deployed, we must make some adjustments to the `Dockerfile` and `.gitlab-ci.yml` to account for the new folder structure and build system(s). The Phase 1 workspace split adds one more thing to account for whenever this is picked up: a single root `npm install` now pulls all three workspaces' deps into one `node_modules`, so a size-conscious multi-stage Docker build would need to prune or split that install rather than assuming it's backend-only.