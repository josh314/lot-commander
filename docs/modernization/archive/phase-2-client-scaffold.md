# Phase 2 — New client scaffold + vertical slice (`main.home`)

*(done, committed — one noted gap, see 2.3)* — back to [Frontend Modernization Plan](../PLAN.md)

## Why this order

The new client can't be validated screen-by-screen until one full vertical
slice exists: build tooling, the authenticated shell (nav + permissions),
and one real screen talking to the real API. `main.home`
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

- [x] `client/src/lib/auth.ts`: read the non-httpOnly `user` cookie (plain
      JSON, not signed) and expose `hasPermission(perm)`/`isPermitted(perm)`
      on a `User` class — ports both
      `client-legacy/src/js/ng/services/logged-in-user-svc.js`'s
      `hasPermission` (flat `permissions.includes(permission)` check) and
      `navbar-ctrl.js`'s `isPermitted` (recursive `{and:[...]}`/`{or:[...]}`
      compound permission evaluation, needed for nav entries like
      `main.lots.submit-listing`). Cookie parsing is validated against a Zod
      schema (`client/src/schemas/user.ts`) rather than trusted as `any`.
- [x] `client/src/lib/sessionTimeout.ts` — **skipped, not ported.** The
      legacy `lotCommander` client-only daily-cutoff cookie added a second,
      independently-drifting timer with no real security benefit (see
      CLAUDE.md's note on the two auth layers desyncing). The real server
      session (`server/src/modules/app-session.js`) already has a 24h TTL
      that rolls forward on every request (`resave: true`), so active users
      are unaffected either way and idle/abandoned sessions still expire on
      their own — the client timer only ever bought an *earlier-than-24h*
      forced logout, at the cost of the desync bug. Revisit only if that
      sooner-than-24h cutoff becomes an actual product requirement.
- [x] `client/src/lib/api.ts`: a small `axios` wrapper for `/api/*` —
      `withCredentials: true`, and critically: check the response's
      `content-type` header for `application/json` in both the fulfilled and
      rejected response-interceptor branches (axios rejects any non-2xx
      response by default, so both need the check). `auth.isLoggedIn`
      (`server/auth.js`) redirects an unauthenticated request to `/login`
      (HTML), so treating that as a normal JSON response would silently
      misbehave instead of giving a clean "logged out" state — treat a
      non-JSON response as logged-out and redirect to `/login`.
- [x] `client/src/components/AppShell.tsx`: layout with nav bar (brand link →
      home) + a single "Logout" link that does a hard navigation to
      `/logout` (matches legacy: no client-side logout state, just hits the
      server route) + a content area. Port only what this phase needs from
      `client-legacy/src/js/ng/directives/navbar.js` +
      `client-legacy/src/partials/_navbar.html` — don't try to port the full
      `navbarData`/`stateData` nav tree yet, that grows incrementally as
      screens are ported in Phase 3. For now the nav can be just the brand
      link; add real entries as each screen lands.
- [x] `client/src/features/home/HomePage.tsx`: port
      `client-legacy/src/partials/_home.html` — it's just a centered heading, no
      controller logic to port.
- [x] `client/src/main.tsx` / router: single route `/` → `AppShell` +
      `HomePage`. (No client-side router library needed yet with one route —
      defer picking one, e.g. `react-router`, until Phase 3 needs multiple
      routes; note the decision here when made.)

## 2.3 — Verify

- [x] `npm run demon` (backend) + `npm run dev` (new client) running
      together; visit the new client's dev URL, confirm it redirects to the
      real `/login` page when logged out.
- [x] Log in via the real `/login` form; confirm redirect back lands on the
      new client's home screen with the shell rendering and the `user` cookie
      readable.
- [x] Click Logout (nav link) and separately navigate the browser bar
      directly to `/logout` — both hit the real `/logout` route, clear the
      `user` cookie (confirmed via devtools), and land back at `/login`.
- [ ] Confirm the app also recovers if the session goes stale *without* a
      full page reload (e.g. the `user` cookie deleted via devtools, or the
      server session simply expiring, while the SPA tab stays open and
      idle) — **not yet true as of this session.** `AuthContext`'s value is
      read once at module load (`createContext(getLoggedInUser())`);
      nothing re-checks the cookie without a hard navigation, so a stale
      session is invisible until something forces a reload. `lib/api.ts`'s
      interceptor is the intended fix for this but isn't wired to any real
      endpoint yet — revisit once Phase 3 adds real `/api/*` calls through
      it.
- [x] `npm run build -w client` (production build) completes with no
      errors.
- [x] `npm run lint -w client` and `npm run test -w client` both pass (even
      with zero real tests yet beyond a smoke test for `HomePage`).
