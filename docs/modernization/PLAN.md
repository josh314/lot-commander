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
jumbotron) — so Phase 1 is entirely about the *shell*, not the screen. Every
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

## Phase 1 — New client scaffold + vertical slice (`main.home`)

Goal: `npm run dev` (new script, see below) serves a React/TS/Tailwind app at
`client/` that authenticates against the real backend, renders a shell with
permission-aware nav (even if nav only has one real entry so far), shows the
home screen, and redirects to `/login` correctly on session expiry — proving
the pattern every later screen will reuse.

### 1.1 — Scaffold

- [ ] Create `client/` fresh (it's currently empty/absent after the Phase 0
      move) with its own `client/package.json` — keep frontend deps
      (`react`, `vite`, `tailwindcss`, etc.) separate from the root
      `package.json`'s backend deps (`express`, `mongoose`, AWS SDK). This
      mirrors the fact that the two apps have no shared runtime dependencies.
  - [ ] `npm create vite@latest . -- --template react-ts` inside `client/`
        (or hand-roll — either way, end state is `client/src/`,
        `client/index.html`, `client/vite.config.ts`, `client/tsconfig.json`).
  - [ ] Add root `package.json` scripts that delegate: `"dev": "npm --prefix
        client run dev"`, `"build-client": "npm --prefix client run build"`
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

### 1.2 — Auth + shell

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
      server route) + a content area. Port only what Phase 1 needs from
      `client-legacy/src/js/ng/directives/navbar.js` +
      `client-legacy/src/partials/_navbar.html` — don't try to port the full
      `navbarData`/`stateData` nav tree yet, that grows incrementally as
      screens are ported in Phase 2. For now the nav can be just the brand
      link; add real entries as each screen lands.
- [ ] `client/src/features/home/HomePage.tsx`: port
      `client-legacy/src/partials/_home.html` — it's just a centered heading, no
      controller logic to port.
- [ ] `client/src/main.tsx` / router: single route `/` → `AppShell` +
      `HomePage`. (No client-side router library needed yet with one route —
      defer picking one, e.g. `react-router`, until Phase 2 needs multiple
      routes; note the decision here when made.)

### 1.3 — Verify

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
- [ ] `npm run build --prefix client` (production build) completes with no
      errors.
- [ ] `npm run lint --prefix client` and `npm run test --prefix client` both
      pass (even with zero real tests yet beyond a smoke test for
      `HomePage`).

---

## Phase 2 — Screen-by-screen migration

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
- [ ] Wire the route (add router entry once Phase 2 has picked a router lib).
- [ ] Add the nav entry to `AppShell`'s nav data (respecting `userPermission`
      via `hasPermission`/the and/or helper from Phase 1.2).
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
- [ ] `main.users.logout` — already handled by Phase 1's hard-nav Logout link; no React component needed.

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

## Phase 3 — Backend TypeScript (not started, forward-looking only)

Not begun. Don't start until Phase 1/2 are far enough along that the pattern
for "one file at a time" is well understood from the frontend side. When it
starts:

- [ ] Add `typescript` + `@types/node` as root devDependencies (this is the
      backend, so it stays in root `package.json`, not `client/package.json`).
- [ ] Add a root `tsconfig.json` with `allowJs: true`, `checkJs: false`
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

## Phase 4 — Deployment (not started, forward-looking only)

Deployment was broken by this exercise. If the product of this exercise is ever to be deployed, we must make some adjustments to the `Dockerfile` and `.gitlab-ci.yml` to account for the new folder structure and build system(s).