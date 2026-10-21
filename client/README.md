# client

The new React/TypeScript/Vite client for Lot Commander, replacing `client-legacy` screen by screen. See the root [`README.md`](../README.md) for the workspace layout and how to run this alongside the backend, and `docs/modernization/PLAN.md` for the migration plan.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server, port `9000`, proxying `/api`, `/login`, `/logout` to the backend |
| `npm run build` | `tsc -b && vite build` — typecheck then production build |
| `npm run lint` | ESLint (`eslint.config.js`) — type-aware (`recommendedTypeChecked`) plus `@stylistic` for style rules |
| `npm run typecheck` | `tsc -b` — type-level check only, no build output |
| `npm run test` | `vitest run` — does **not** run `tsc`; passing tests give zero signal about type-level correctness, use `typecheck`/`check` for that |
| `npm run check` | `lint && typecheck && test` — the full gate, run this before calling something done |
| `npm run preview` | Serves the production build locally |

All of the above can also be run from the repo root with `-w client`, e.g. `npm run test -w client`.

## Stack notes

- **Tailwind v4** via the `@tailwindcss/vite` plugin — no `tailwind.config.js`/`postcss.config.js`; styles come from a single `@import "tailwindcss";` in `src/index.css`.
- **ESLint** is type-aware, so `tsconfig.app.json`/`tsconfig.node.json` must stay valid for lint to run at all; a missing/wrong type declaration can surface as an `@typescript-eslint/no-unsafe-call`-shaped lint error rather than a `tsc` error (see `CLAUDE.md`'s `Client (`client/`)` section for why).
- **Vitest** setup file is `vitest.setup.js`, wired via `test.setupFiles` in `vite.config.ts`; `@testing-library/jest-dom`'s matchers are imported from its `/vitest` subpath, not the default (Jest-flavored) entry point.

## Style guide

`npm run dev` and visit `/style-guide` to see every design-system component (`Button`, `Input`/`Select`/`TextArea`, `Table`, headers, `Surface`) and their variants rendered together — useful for checking a token/styling change against the whole set at a glance. It's dev-only: the route is gated behind `import.meta.env.DEV` and gets tree-shaken out of `npm run build`'s output entirely, and it's deliberately left off the sidebar nav (visit the URL directly).
