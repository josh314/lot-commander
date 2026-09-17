# Frontend Modernization Plan

This is the standing roadmap for the client rewrite described in `CLAUDE.md`'s
"Modernize" section. It's a living document — update the checkboxes and the
"Status" line as work actually happens. This repo has no test suite and
Claude is guidance-only on this effort by project convention, so every task
below is meant to be executed by hand, one screen at a time, not delegated.

**Status:** Phase 0 nearly done (legacy move + build system relocated to
`client-legacy/` on disk, verified building; one stale path left, nothing
committed yet). Phase 1 not started.

## Actual `client-legacy/` structure

The move didn't just rename `client/` to `client-legacy/` — the build
tooling moved *into* `client-legacy/` too, and the old client source now
lives one level deeper, under `src/`:

```
client-legacy/
  .eslintrc.angularjs.js   (was root .eslintrc.angularjs.js)
  .eslintrc.client.js      (was root .eslintrc.client.js)
  webpack.common.js        (was root webpack.common.js)
  webpack.dev.js           (was root webpack.dev.js)
  webpack.prod.js          (was root webpack.prod.js)
  dist/                    (build output, gitignored)
  src/                     (was root client/ — index.js, js/, less/, partials/, etc.)
```

Root `webpack.*.js` and root `.eslintrc.{client,angularjs}.js` no longer
exist — everything client-build-related is self-contained under
`client-legacy/`. Root `package.json` scripts now point in:

```json
"build-client-dev-legacy": "webpack --config client-legacy/webpack.dev.js",
"build-client-legacy": "webpack --mode production --config client-legacy/webpack.prod.js",
"dev-server-legacy": "webpack-dev-server --config client-legacy/webpack.dev.js",
```

Every path below that used to say `client-legacy/js/...` or
`client-legacy/partials/...` in earlier drafts of this plan means
`client-legacy/src/js/...` / `client-legacy/src/partials/...` — fixed
throughout this revision.

## Why this order

The new client can't be validated screen-by-screen until one full vertical
slice exists: build tooling, the authenticated shell (nav + permissions +
session timeout), and one real screen talking to the real API. `main.home`
was chosen as that first screen specifically because it has almost no
business logic (`client-legacy/src/partials/_home.html` is a static
jumbotron) — so Phase 2 is entirely about the *shell*, not the screen. Every
screen after that reuses the shell and just swaps in new feature code.

---

## Phase 0 — Stabilize the legacy/new split

The move to the structure above is already done and already verified to
build. One stale path is left inside it, and none of it is committed yet.

- [x] `client/` → `client-legacy/src/`, plus the webpack configs and eslint
      configs relocated into `client-legacy/` — done on disk.
- [x] `client-legacy/webpack.common.js`'s `clientSrcPath` already correctly
      reads `path.join(__dirname, "src")` — no fix needed, this one was
      updated as part of the move.
- [x] `npm run build-client-legacy` verified: completes clean (only the
      usual webpack bundle-size warnings, no errors) and correctly emits
      `partials/`, `assets/`, `app.js`, `app.css`, and the copied favicon
      into `client-legacy/dist/`.
- [x] Fix the one path that's still stale: `client-legacy/webpack.common.js`'s
      active `ESLintPlugin` `context` option still reads
      `path.join(__dirname, 'client/js/')` (~line 83) — `client-legacy/client/`
      doesn't exist, so this silently lints **zero files** instead of erroring
      (ESLintPlugin treats "no matching files" as a no-op, not a failure,
      which is why the build above is clean). Change it to
      `path.join(__dirname, 'src/js/')`. There's also a *commented-out*
      second `ESLintPlugin` block a few lines above with the same stale
      `'client/js/'` path — fix it too while you're in there even though
      it's inactive, so it isn't a trap if someone re-enables it.
- [x] Re-run `npm run build-client-legacy` after the fix and confirm actual
      lint errors/warnings now surface (if the AngularJS source has any —
      if the build is still silent, double check the path change took by
      temporarily introducing an obvious lint violation).
- [x] Run `npm run dev-server-legacy`, hit `http://localhost:9000`, confirm
      the legacy app still logs in and navigates (needs `npm run demon`
      running separately on the port `server/config.local.json` specifies,
      since `client-legacy/webpack.dev.js`'s devServer proxies `/` there).
- [x] `Dockerfile` line 14 (`RUN npm run build-client`) still references the
      pre-rename script name and will fail as-is. Since deployment is
      explicitly back-burnered for this exercise, leave this as a decision
      for later rather than fixing now: once the new client has its own
      build step, `Dockerfile` needs to decide whether it ships legacy, new,
      or both. Don't fix it in Phase 0 — note it and move on.
- [x] Stage and commit the whole reorg as one commit: `git add -A` (or the
      more targeted `git add client-legacy/ package.json` plus whatever the
      ESLintPlugin fix above touches) — `git status --short` currently shows
      the move already staged as renames (`R`/`RM`), just `package.json`
      still unstaged and this plan doc still untracked. Suggested message:
      "Move legacy AngularJS client + build tooling into client-legacy/, fix
      stale ESLintPlugin context path".

---

## Phase 1 — Workspace setup

Goal: convert the single-`package.json` repo into three npm workspaces —
`server`, `client-legacy`, `client` — with a purely coordinating root
`package.json` that holds no runtime dependencies of its own. This is pure
restructuring: no application behavior changes, and by the end every
existing `npm run <script>` command at the root still works exactly as
before, just delegating into a workspace via `-w`.

Dependency split (verified by grep against actual `require`/`import` usage
in `server/` and `client-legacy/src/`, not guessed from package names):

- **`server/package.json`** — all Node-only/native-module deps: the five
  `@aws-sdk/*` packages, `@wazue/barcodes`, `@wazue/excel`,
  `@wazue/upc-item-db`, `bcryptjs`, `body-parser`, `canvas`,
  `connect-mongodb-session`, `cookie-parser`, `debug`, `express`,
  `express-handlebars`, `express-session`, `ffmpeg-ffprobe-static`,
  `fluent-ffmpeg`, `formidable`, `jsbarcode` (confirmed server-only via
  `server/modules/print.js` — despite the name, it's not a client-legacy
  dep), `mime-types`, `mongoose`, `morgan`, `passport`, `passport-local`,
  `pdfkit`, `serve-favicon`, `sharp`.
- **`client-legacy/package.json`** — all AngularJS/webpack-build deps:
  `angular`, `angular-animate`, `angular-cookies`, `angular-sanitize`,
  `angular-ui-bootstrap`, `angular-ui-router`, `angular-ui-tinymce`,
  `bootstrap`, `bootswatch`, `copy-webpack-plugin`, `croppie`,
  `css-loader`, `eslint-config-angular`, `eslint-plugin-angular`,
  `eslint-plugin-import` (only referenced from
  `client-legacy/.eslintrc.client.js`, not `.eslintrc.server.js`),
  `eslint-webpack-plugin`, `less`, `less-loader`, `mini-css-extract-plugin`,
  `ngstorage`, `path-browserify` (only referenced from
  `client-legacy/webpack.common.js`'s `resolve.fallback` — a webpack
  polyfill registration, not a direct import, so grep for it alone won't
  find a source-file hit and that's expected), `print-js`, `webpack`,
  `webpack-cli`, `webpack-merge`, `webpack-dev-server`.
- **Genuinely duplicated, not shared** — `axios`, `dayjs`,`eslint` (`^8.x`), `xlsx-js-style` are each used by both `server/` and `client-legacy/src/`. Give each workspace
  its own independent entry rather than trying to share one. That's the
  point of the split: `client-legacy`'s eslint (old `.eslintrc.*` format)
  and `client`'s upcoming eslint 9 flat config can't share one hoisted
  `eslint` anyway, so don't build a habit of sharing this one just because
  the versions happen to match today.
- **Stays at root** — `dependency-cruiser` (repo-wide dependency-graph
  tool, not scoped to one workspace) as the only real devDependency.
  `ngrok` has no package.json entry today (it invokes a globally-installed
  CLI) and doesn't need one — its script stays at root since tunneling a
  port isn't a workspace concern.
- **Needs verification before deciding** — `playwright` has no `require`/
  `import` anywhere in `server/`, `client-legacy/src/`, or the local
  `__scripts/`/`scripts/` folders. It may be dead. Re-grep after the move;
  if still unused, drop it rather than shipping it into whichever
  workspace looked most plausible.

### 1.1 — Root `package.json`

- [ ] Add `"workspaces": ["server", "client-legacy", "client"]`.
- [ ] Remove `main` (root no longer runs code directly).
- [ ] Remove the `dependencies` block entirely; trim `devDependencies` to
      just `dependency-cruiser` (see `playwright` note above).
- [ ] Rewrite every script to delegate via `-w`, keeping the **same script
      names** so nothing calling them (muscle memory, this doc, CI if it
      ever exists) needs to change: `"demon": "npm run demon -w server"`,
      `"start": "npm run start -w server"`, `"debug": "npm run debug -w
      server"`, `"lint-server": "npm run lint -w server"`,
      `"build-client-legacy": "npm run build -w client-legacy"`,
      `"build-client-dev-legacy": "npm run build-dev -w client-legacy"`,
      `"dev-server-legacy": "npm run dev -w client-legacy"`. Leave `ngrok`
      untouched.
- [ ] Add a new root script, `"depcruise": "depcruise --config
      .dependency-cruiser.js ."` — not wired to anything today (it's a
      devDependency with no script pointing at it yet); this phase is the
      first real reason to run it, since it's what actually catches a
      dependency landing in the wrong workspace (see 1.5).

### 1.2 — `server/` workspace

- [ ] Create `server/package.json`: `name: "server"`, `private: true`,
      `main: "index.js"`, the dependency list above, and scripts renamed
      now that they run with `server/` as cwd: `"start": ". ../.env &&
      DEBUG=lot-commander node index.js"`, `"demon": ". ../.env && nodemon
      index.js"`, `"debug": "DEBUG=lot-commander node inspect index.js"`,
      `"lint": "eslint --config .eslintrc.server.js ."`.
- [ ] **`.env` gotcha**: the current root scripts do `. .env && ...`,
      sourcing the root-level `.env` relative to cwd. Once these scripts
      live in `server/package.json` and run with cwd `server/`, that
      becomes `. ../.env` (already reflected above) — leave `.env` itself
      at repo root (a cross-workspace concern, same reasoning as keeping
      `dependency-cruiser` at root), don't move or duplicate it.
- [ ] Move `.eslintrc.server.js` from repo root into `server/`. Its
      content has no relative-path references, so it moves as-is — only
      the target argument in the `lint` script changes, from `server/` to
      `.` (already reflected above).
- [ ] Move `nodemon.json` from repo root into `server/nodemon.json` and
      fix its `watch` list, which currently reads `[".env", "server/*"]`
      relative to the old root-cwd assumption: with cwd now `server/`,
      change to `["../.env", "."]`. Also change its `events.start`/
      `events.restart`, which call `npm run lint-server`, to `npm run
      lint` (the workspace-local script name, not root's delegating name).
- [ ] `.dependency-cruiser.js` stays at root unchanged — its `^server/`
      path patterns still match, since `server/` doesn't move, it just
      gains a `package.json` alongside the files already there.

### 1.3 — `client-legacy/` workspace

- [ ] Create `client-legacy/package.json`: `name: "client-legacy"`,
      `private: true`, the dependency list above (`webpack-dev-server` as
      a devDependency, matching its current placement), and scripts
      renamed now that they run with `client-legacy/` as cwd: `"build":
      "webpack --mode production --config webpack.prod.js"`, `"build-dev":
      "webpack --config webpack.dev.js"`, `"dev": "webpack-dev-server
      --config webpack.dev.js"` (dropping the `client-legacy/` prefix from
      each config path, since it's implicit in cwd now).
- [ ] No changes needed inside `webpack.common.js`/`webpack.dev.js`/
      `webpack.prod.js` — their `__dirname`-based paths (fixed in Phase 0)
      are already relative to `client-legacy/` itself, not repo root, so
      they're unaffected by the npm-script cwd change.
- [ ] `.eslintrc.client.js`/`.eslintrc.angularjs.js` already live in
      `client-legacy/` since Phase 0 — no move needed; they just start
      resolving `eslint`/`eslint-plugin-angular`/etc. from
      `client-legacy/`'s own dependency tree instead of a hoisted root one.

### 1.4 — `client/` stub workspace

- [ ] Create `client/package.json` as a placeholder: `name: "client"`,
      `private: true`, `version: "0.0.0"`, no real scripts yet — just
      enough for npm to recognize it as a workspace member. Phase 2 (next)
      replaces this wholesale via `npm create vite@latest .`, which
      generates its own `package.json` anyway.

### 1.5 — Verify

- [ ] Delete root `node_modules/` and `package-lock.json`, then run a
      fresh `npm install` from repo root now that all three workspace
      `package.json` files exist. Confirm one hoisted root `node_modules`
      and one regenerated `package-lock.json` in workspace format (no
      per-workspace lockfiles). Root's unanchored `node_modules` line in
      `.gitignore` already covers any nested per-workspace `node_modules`
      npm creates for non-hoistable packages — no `.gitignore` change
      needed.
- [ ] Confirm the `@wazue:registry` scoped-registry config in root
      `.npmrc` still resolves `@wazue/*` packages during this install — a
      single root-level `.npmrc` applies to the whole workspace install
      regardless of which workspace declares the dependency, so no
      `.npmrc` change is needed.
- [ ] `npm run demon` from root: confirm it still starts the server
      exactly as before (config loads, Mongo connects, lint-on-start still
      fires via `nodemon.json`'s `events`).
- [ ] `npm run lint-server` from root: confirm it still lints `server/`
      and produces the same output as before the move.
- [ ] `npm run dev-server-legacy` + `npm run demon` together: confirm the
      legacy app still logs in and navigates, same as the Phase 0
      verification.
- [ ] `npm run build-client-legacy` from root: confirm a clean production
      build, same as the Phase 0 verification.
- [ ] `npm run depcruise` from root: confirm no new `no-non-package-json`
      violations. This is the actual check that the dependency split above
      landed correctly — dependency-cruiser resolves each file's *nearest*
      `package.json` (its `combinedDependencies` option defaults to
      `false`, i.e. not merged up to root), so a file in
      `client-legacy/src/` importing a package only declared in
      `server/package.json` (or vice versa) gets flagged here even though
      it would still resolve fine at runtime via the hoisted root
      `node_modules` — that gap between "resolves at runtime" and "actually
      declared in the right workspace" is exactly what this check closes.
      A violation here means a missed or misplaced entry in the dependency
      split above, not a bug in the tool.
- [ ] Update this repo's `README.md` "Development" section to explain the
      three-workspace layout and give maintainers a script cheatsheet:
      which root scripts exist, what each delegates to, and the `-w
      <workspace>` pattern for running a workspace-local script directly.
- [ ] Commit the whole restructuring as one commit — no code inside
      `server/` or `client-legacy/` changes, only `package.json` files,
      the moved config files, and the regenerated lockfile.

---

## Phase 2 — New client scaffold + vertical slice (`main.home`)

Goal: `npm run dev` (new script, see below) serves a React/TS/Tailwind app at
`client/` that authenticates against the real backend, renders a shell with
permission-aware nav (even if nav only has one real entry so far), shows the
home screen, and redirects to `/login` correctly on session expiry — proving
the pattern every later screen will reuse.

### 2.1 — Scaffold

- [ ] Replace the Phase 1 stub `client/package.json` by running `npm create
      vite@latest . -- --template react-ts` inside `client/` (or
      hand-roll — either way, end state is `client/src/`,
      `client/index.html`, `client/vite.config.ts`, `client/tsconfig.json`,
      and a Vite-generated `client/package.json` with `name: "client"`
      preserved so the workspace reference still resolves).
  - [ ] Add root `package.json` scripts that delegate: `"dev": "npm run dev
        -w client"`, `"build-client": "npm run build -w client"`
        (deliberately reclaiming the un-suffixed name, since this is the
        client going forward — legacy keeps the `-legacy` suffix).
- [ ] Add Tailwind: `npm install -D tailwindcss postcss autoprefixer` inside
      `client/`, `npx tailwindcss init -p`, configure `content` to scan
      `./index.html` and `./src/**/*.{ts,tsx}`, add the three `@tailwind`
      directives to a `client/src/index.css` imported once from `main.tsx`.
- [ ] Add Vitest: `npm install -D vitest @testing-library/react
      @testing-library/jest-dom jsdom` inside `client/`; configure
      `test.environment = 'jsdom'` in `vite.config.ts`; add a `"test": "vitest
      run"` script.
- [ ] Add TypeScript-ESLint flat config (`client/eslint.config.js`) using
      `typescript-eslint`'s recommended config + `eslint-plugin-react-hooks`;
      add a `"lint": "eslint ."` script. This becomes the client-side lint
      script the root `CLAUDE.md` currently says doesn't exist.
- [ ] Configure the Vite dev server proxy (`vite.config.ts`'s
      `server.proxy`) to forward `/api`, `/login`, `/logout` to the real
      backend (`http://localhost:8080` or whatever port `npm run demon`
      binds to per local config) with `changeOrigin: true` — this is the
      direct equivalent of `webpack.dev.js`'s `devServer.proxy` block, and is
      what lets the Vite-served page share cookies with the real session.

### 2.2 — Auth + shell

- [ ] `client/src/lib/auth.ts`: read the non-httpOnly `user` cookie (plain
      JSON, not signed) and expose `{ user, permissions, hasPermission(perm) }`
      — port the logic in `client-legacy/src/js/ng/services/logged-in-user-svc.js`
      (`hasPermission` just checks `permissions.includes(permission)`; the
      legacy `isPermitted` in `navbar-ctrl.js` also handles `{and:[...]}`/
      `{or:[...]}` compound permissions — port that too since later screens'
      nav entries use it, e.g. `main.lots.submit-listing`).
- [ ] `client/src/lib/sessionTimeout.ts`: port
      `client-legacy/src/js/ng/services/session-timeout-svc.js` — reads/writes the
      `lotCommander` cookie (`{timeout: <ISO date>}`), same daily-cutoff-hour
      logic, `isExpired()`/`init()`/`destroy()`. Call `init()` once on app
      mount (legacy equivalent: `RootCtrl`); redirect to `/logout` (full page
      nav, not client-side) if `isExpired()` is true on mount or on route
      change.
- [ ] `client/src/lib/api.ts`: a small `fetch` wrapper for `/api/*` —
      `credentials: 'include'`, and critically: check
      `response.headers.get('content-type')?.includes('application/json')`
      before parsing. `auth.isLoggedIn` (`server/auth.js`) redirects an
      unauthenticated request to `/login` (HTML), so a naive `.json()` call
      on an expired session will throw a confusing parse error instead of a
      clean "logged out" state — treat a non-JSON response as logged-out and
      redirect to `/login`.
- [ ] `client/src/components/AppShell.tsx`: layout with nav bar (brand link →
      home) + a single "Logout" link that does a hard navigation to
      `/logout` (matches legacy: no client-side logout state, just hits the
      server route) + a content area. Port only what Phase 2 needs from
      `client-legacy/src/js/ng/directives/navbar.js` +
      `client-legacy/src/partials/_navbar.html` — don't try to port the full
      `navbarData`/`stateData` nav tree yet, that grows incrementally as
      screens are ported in Phase 3. For now the nav can be just the brand
      link; add real entries as each screen lands.
- [ ] `client/src/features/home/HomePage.tsx`: port
      `client-legacy/src/partials/_home.html` — it's just a centered heading, no
      controller logic to port.
- [ ] `client/src/main.tsx` / router: single route `/` → `AppShell` +
      `HomePage`. (No client-side router library needed yet with one route —
      defer picking one, e.g. `react-router`, until Phase 3 needs multiple
      routes; note the decision here when made.)

### 2.3 — Verify

- [ ] `npm run demon` (backend) + `npm run dev` (new client) running
      together; visit the new client's dev URL, confirm it redirects to the
      real `/login` page when logged out.
- [ ] Log in via the real `/login` form; confirm redirect back lands on the
      new client's home screen with the shell rendering and the `user` cookie
      readable.
- [ ] Manually expire the session (delete cookies or use the console trick
      documented in `CLAUDE.md`'s Client section for the `lotCommander`
      cookie) and confirm the new client redirects to `/login` instead of
      showing a broken/blank screen.
- [ ] Click Logout, confirm it hits the real `/logout` route and lands back
      at `/login`.
- [ ] `npm run build -w client` (production build) completes with no
      errors.
- [ ] `npm run lint -w client` and `npm run test -w client` both pass (even
      with zero real tests yet beyond a smoke test for `HomePage`).

---

## Phase 3 — Screen-by-screen migration

### Per-screen checklist (copy this block per screen)

```
### <state name> — <nav label>
- [ ] Read legacy source: controller `client-legacy/src/js/ng/controllers/<x>-ctrl.js`,
      partial `client-legacy/src/partials/<x>.html`, any service(s) it injects.
- [ ] List the `/api/*` endpoints it calls (grep the service file(s) for axios/http calls).
- [ ] Design the React component + any hooks/types needed; add types for the
      API request/response shapes actually observed (don't guess — read the
      corresponding `server/routers/*.js` + model to confirm the real shape).
- [ ] Implement + add at least one Vitest test (render + one interaction, or
      one API-mocked data-flow test for read-heavy screens).
- [ ] Wire the route (add router entry once Phase 3 has picked a router lib).
- [ ] Add the nav entry to `AppShell`'s nav data (respecting `userPermission`
      via `hasPermission`/the and/or helper from Phase 2.2).
- [ ] Manually verify against the real backend (not just legacy comparison).
- [ ] Mark done below.
```

### Screens (grouped as in `client-legacy/src/js/ng/app.js`'s `stateData`)

Lots
- [ ] `main.lots.list` — List Lots — `list-lots-ctrl.js` / `_list_lots.html`
- [ ] `main.lots.new` — New Lot — `new-lot-ctrl.js` / `_new_lot.html`
- [ ] `main.lots.view` — View Lot — `view-lot-ctrl.js` / `_view_lot.html`
- [ ] `main.lots.scan` — Scan — `scan-ctrl.js` / `_scan.html`
- [ ] `main.lots.review-manifest` — `review-manifest-ctrl.js` / `_review_manifest.html`
- [ ] `main.lots.submit-listing` — `submit-listing-ctrl.js` / `_submit_listing.html`
- [ ] `main.lots.image-editor` — `image-editor-ctrl.js` / `_image_editor.html`
- [ ] `main.lots.gallery` — `gallery-ctrl.js` / `_gallery.html`
- [ ] `main.lots.upload-manifest` — `upload-lot-manifest-ctrl.js` / `_upload_lot_manifest.html`

Manifests
- [ ] `main.manifests.clean` — Clean — `clean-manifest-ctrl.js` / `_clean_manifest.html`
- [ ] `main.manifests.list` — List — `list-manifests-ctrl.js` / `_list_manifests.html`

Shipments
- [ ] `main.shipments.list` — All shipments — `shipment-list-ctrl.js` / `receiving/_shipment_list.html`
- [ ] `main.shipments.creation` — New Shipment — `shipment-creation-ctrl.js` / `receiving/_shipment_creation.html`
- [ ] `main.shipments.details` — `shipment-details-ctrl.js` / `receiving/_shipment_details.html`
- [ ] `main.shipments.process-manifest` — `shipment-process-manifest-ctrl.js` / `receiving/_shipment_process_manifest.html`
- [ ] `main.shipments.receiving` — (no dedicated ctrl found — check `shipment-details-ctrl.js` or a directive) / `receiving/_shipment_receiving.html`
- [ ] `main.shipments.clean-manifest` — reuses `clean-manifest-ctrl.js` / `_clean_manifest.html`

Inventory Pallets
- [ ] `main.inventory-pallets.view` — All pallets — `inventory-pallet-view-ctrl.js` / `receiving/_inventory_pallet_view.html`
- [ ] `main.inventory-pallets.creation` — `inventory-pallet-creation-ctrl.js` / `receiving/_inventory_pallet_creation.html`
- [ ] `main.inventory-pallets.to-be-listed` — `inventory-pallets-to-be-listed-ctrl.js` / `production/_inventory_pallets_to_be_listed.html`
- [ ] `main.inventory-pallets.to-be-processed` — `inventory-pallets-to-be-processed-ctrl.js` / `production/_inventory_pallets_to_be_processed.html`
- [ ] `main.inventory-pallets.allocated-for-unmanifested-lots` — `inventory-pallets-allocated-for-unmanifested-lots-ctrl.js` / `production/_inventory_pallets_allocated_for_unmanifested_lots.html`
- [ ] `main.inventory-pallets.split` — `inventory-pallet-split-ctrl.js` / `production/_inventory_pallet_split.html`
- [ ] `main.inventory-pallets.repack` — `inventory-pallet-repack-ctrl.js` / `production/_inventory_pallet_repack.html`

Packages
- [ ] `main.packages.manage` — Packages — `packages-ctrl.js` / `production/_packages.html`

Orders
- [ ] `main.orders.queue` — Queue — `order-queue-ctrl.js` / `orders/_order_queue.html`
- [ ] `main.orders.pick` — `pick-order-ctrl.js` / `orders/_pick_order.html`

Costs
- [ ] `main.costs.purchases` — Purchases — `purchase-aggregation-ctrl.js` / `_purchase_aggregation.html`
- [ ] `main.costs.transportation` — Transportation — `transportation-cost-aggregation-ctrl.js` / `_transportation_cost_aggregation.html`

Manual Inventory
- [ ] `main.manual-inventory` — Inventory — `manual-inventory-ctrl.js` / `_manual_inventory.html`

Store
- [ ] `main.store.shipping-rates` — Shipping Rates — `store-shipping-rates-ctrl.js` / `_store_shipping_rates.html`
- [ ] `main.store.shipping-configurations` — Shipping Configs — `shipping-configurations-ctrl.js` / `_shipping_configurations.html`
- [ ] `main.store.content` — Content — `store-content-ctrl.js` / `_store_content.html`
- [ ] `main.store.bundles` — Bundles — `product-bundles-ctrl.js` / `_product_bundles.html`

App Settings / Announcements
- [ ] `main.app-settings.list` — App — `app-settings-ctrl.js` / `_app_settings.html`
- [ ] `main.site-announcements.manage` — Announcements — `site-announcements-ctrl.js` / `_site_announcements.html`

Users
- [ ] `main.users.list` — List — `list-users-ctrl.js` / `users/_list_users.html`
- [ ] `main.users.change-password` — Change Password — `change-user-password-ctrl.js` / `users/_change_password.html`
- [ ] `main.users.create` — New User — `create-new-user-ctrl.js` / `users/_create_user.html`
- [ ] `main.users.logout` — already handled by Phase 2's hard-nav Logout link; no React component needed.

Other
- [ ] `main.history` — `history-ctrl.js` / `_history.html`

Not currently active in nav (commented out in `app.js`'s `stateData` — skip
unless reactivated): `main.auctions.*`, `main.reports`, `main.tools.counter`,
`main.packages.packing`.

Shared/reused across screens above — port once, first screen that needs it
wins: modals (`edit-lot-modal-ctrl.js`, `pallets-from-manifest-modal-ctrl.js`,
`past-image-gallery-modal-ctrl.js`, `product-data-merge-modal-ctrl.js`,
`product-data-search-modal-ctrl.js`, `shipping-items-modal-ctrl.js`), and
directives (`camera-dir.js`, `collage-dir.js`, `editor-listing-dir.js`,
`lot-media-grid-dir.js`, `media-grid-dir.js`, `upload-files-dir.js`,
`shipping-items-dir.js`).

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