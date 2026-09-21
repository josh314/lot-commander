# Phase 2 — New client scaffold + vertical slice (`main.home`)

*(not started)* — back to [Frontend Modernization Plan](./PLAN.md)

## Why this order

The new client can't be validated screen-by-screen until one full vertical
slice exists: build tooling, the authenticated shell (nav + permissions +
session timeout), and one real screen talking to the real API. `main.home`
was chosen as that first screen specifically because it has almost no
business logic (`client-legacy/src/partials/_home.html` is a static
jumbotron) — so this phase is entirely about the *shell*, not the screen.
Every screen after that reuses the shell and just swaps in new feature
code.

Goal: `npm run dev` (new script, see below) serves a React/TS/Tailwind app at
`client/` that authenticates against the real backend, renders a shell with
permission-aware nav (even if nav only has one real entry so far), shows the
home screen, and redirects to `/login` correctly on session expiry — proving
the pattern every later screen will reuse.

## 2.1 — Scaffold

- [x] Replace the Phase 1 stub `client/package.json` by running `npm create
      vite@latest . -- --template react-ts` inside `client/` (or
      hand-roll — either way, end state is `client/src/`,
      `client/index.html`, `client/vite.config.ts`, `client/tsconfig.json`,
      and a Vite-generated `client/package.json` with `name: "client"`
      preserved so the workspace reference still resolves).
  - [x] Add root `package.json` scripts that delegate: `"dev": "npm run dev
        -w client"`, `"build-client": "npm run build -w client"`
        (deliberately reclaiming the un-suffixed name, since this is the
        client going forward — legacy keeps the `-legacy` suffix).
- [x] Add Tailwind (v4): `npm install tailwindcss @tailwindcss/vite` inside
      `client/`; add the `tailwindcss()` plugin to `vite.config.ts`'s
      `plugins` array; replace `client/src/index.css`'s contents with a
      single `@import "tailwindcss";` imported once from `main.tsx`. No
      `tailwind.config.js`/`postcss.config.js`/`autoprefixer`/`init -p` step
      — v4's Vite plugin auto-detects content and handles vendor prefixing,
      unlike the v3 PostCSS-plugin flow this step used to describe.
- [x] Add Vitest: `npm install -D vitest @testing-library/react
      @testing-library/jest-dom jsdom` inside `client/`; configure
      `test.environment = 'jsdom'` in `vite.config.ts`'s `test` property —
      add `/// <reference types="vitest/config" />` at the top of the file
      (or import `defineConfig` from `vitest/config` instead of `vite`) so
      TypeScript recognizes the `test` key; add a `"test": "vitest run"`
      script.
  - [x] `@testing-library/jest-dom` (v6+) ships a dedicated Vitest entry
        point — create a setup file `vitest.setup.ts` that does
        `import '@testing-library/jest-dom/vitest'`, wire it via
        `test.setupFiles` in `vite.config.ts`, and add
        `"types": ["vitest/globals", "@testing-library/jest-dom"]` to
        `tsconfig.app.json`'s `compilerOptions` so the custom matchers
        typecheck. Don't use the bare `import '@testing-library/jest-dom'`
        from older jest-only guides.
- [x] Add TypeScript-ESLint flat config (`client/eslint.config.js`) using
      `typescript-eslint`'s recommended config + `eslint-plugin-react-hooks`;
      add a `"lint": "eslint ."` script. This becomes the client-side lint
      script the root `CLAUDE.md` currently says doesn't exist.
    - [x] Add `@stylistic/eslint-plugin` to the ESLint config and configure basic stylistic rules like indentation. See [here](https://eslint.style/rules) for config.
- [x] Configure the Vite dev server proxy (`vite.config.ts`'s
      `server.proxy`) to forward `/api`, `/login`, `/logout` to the real
      backend (`http://localhost:8080` or whatever port `npm run demon`
      binds to per local config) with `changeOrigin: true` — this is the
      direct equivalent of `webpack.dev.js`'s `devServer.proxy` block, and is
      what lets the Vite-served page share cookies with the real session.

## 2.2 — Auth + shell

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
      server route) + a content area. Port only what this phase needs from
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

## 2.3 — Verify

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
