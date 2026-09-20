# Phase 1 — Workspace setup

*(done, committed)* — back to [Frontend Modernization Plan](./PLAN.md)

Goal: convert the single-`package.json` repo into three npm workspaces —
`server`, `client-legacy`, `client` — with a purely coordinating root
`package.json` that holds no runtime dependencies of its own. This is pure
restructuring: no application behavior changes, and by the end every
existing `npm run <script>` command at the root still works exactly as
before, just delegating into a workspace via `-w`.

(A fourth workspace, `scripts`, for the one-off operational scripts under
`scripts/`, was added during hand-execution of this phase — not part of the
original three-workspace goal above, but the same delegation pattern
applies to it.)

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

## 1.1 — Root `package.json`

- [x] Add `"workspaces": ["server", "client-legacy", "client"]`.
- [x] Remove `main` (root no longer runs code directly).
- [x] Remove the `dependencies` block entirely; trim `devDependencies` to
      just `dependency-cruiser` (see `playwright` note above).
- [x] Rewrite every script to delegate via `-w`, keeping the **same script
      names** so nothing calling them (muscle memory, this doc, CI if it
      ever exists) needs to change: `"demon": "npm run demon -w server"`,
      `"start": "npm run start -w server"`, `"debug": "npm run debug -w
      server"`, `"lint-server": "npm run lint -w server"`,
      `"build-client-legacy": "npm run build -w client-legacy"`,
      `"build-client-dev-legacy": "npm run build-dev -w client-legacy"`,
      `"dev-server-legacy": "npm run dev -w client-legacy"`. Leave `ngrok`
      untouched.
- [x] Add a new root script, `"depcruise": "depcruise --config
      .dependency-cruiser.js ."` — not wired to anything today (it's a
      devDependency with no script pointing at it yet); this phase is the
      first real reason to run it, since it's what actually catches a
      dependency landing in the wrong workspace (see 1.6).

## 1.2 — `server/` workspace

- [x] Create `server/package.json`: `name: "server"`, `private: true`,
      `main: "index.js"`, the dependency list above, and scripts renamed
      now that they run with `server/` as cwd: `"start": ". ../.env &&
      DEBUG=lot-commander node index.js"`, `"demon": ". ../.env && nodemon
      index.js"`, `"debug": "DEBUG=lot-commander node inspect index.js"`,
      `"lint": "eslint --config .eslintrc.server.js ."`.
- [x] **`.env` gotcha**: the current root scripts do `. .env && ...`,
      sourcing the root-level `.env` relative to cwd. Once these scripts
      live in `server/package.json` and run with cwd `server/`, that
      becomes `. ../.env` (already reflected above) — leave `.env` itself
      at repo root (a cross-workspace concern, same reasoning as keeping
      `dependency-cruiser` at root), don't move or duplicate it.
- [x] Move `.eslintrc.server.js` from repo root into `server/`. Its
      content has no relative-path references, so it moves as-is — only
      the target argument in the `lint` script changes, from `server/` to
      `.` (already reflected above). Renamed from `.eslintrc.server.js` to `.eslintrc.js` within the `server/` workspace.
- [x] Move `nodemon.json` from repo root into `server/nodemon.json` and
      fix its `watch` list, which currently reads `[".env", "server/*"]`
      relative to the old root-cwd assumption: with cwd now `server/`,
      change to `["../.env", "."]`. Also change its `events.start`/
      `events.restart`, which call `npm run lint-server`, to `npm run
      lint` (the workspace-local script name, not root's delegating name).
- [x] `.dependency-cruiser.js` stays at root unchanged — its `^server/`
      path patterns still match, since `server/` doesn't move, it just
      gains a `package.json` alongside the files already there.

## 1.3 — `server/` workspace: separate source from config (`server/src/`)

1.2 left `server/`'s actual application code (`index.js`, `server.js`,
`routers/`, etc.) sitting directly alongside its workspace-tooling config
(`package.json`, `.eslintrc.js`, `nodemon.json`) — package-manager/process
config mixed in with source. This section splits them: tooling config
stays at `server/` root, application source moves to `server/src/`.

This isn't just tidiness. `npm run demon`'s cwd is now `server/` (since
1.2's `-w server` delegation), not repo root like before — and
`server/server.js` has a hardcoded path that assumed cwd was always repo
root. That's the exact `.../server/server/views` doubling hit after 1.2:
`path.resolve('server/views')` resolves against **cwd**, so cwd shifting
from repo root to `server/` made the same literal string resolve one
level too deep. Moving source into `src/` doesn't fix that by itself —
but it's the right moment to fix it properly (`__dirname`-relative
instead of cwd-relative, immune to cwd entirely), since the move touches
the same file anyway, and it surfaces one more cwd/depth assumption that
would otherwise break silently.

- [x] Move `index.js`, `server.js`, `auth.js`, `config.js` (dead code per
      CLAUDE.md, but still moves — it's still a source file), `constants.js`,
      `errors.js`, `helpers.js`, `load-config.js`, `package-json.js`,
      `models/`, `modules/`, `routers/`, and `views/` into `server/src/`.
      Leave `package.json`, `.eslintrc.js`, `nodemon.json`,
      `config.example.json`, and `config.local.json` at `server/` root —
      the JSON config files are runtime data the app reads, not tooling,
      but moving them buys nothing and would ripple into `.gitignore`'s
      `!server/config.example.json` exception and every doc that cites
      that path (`README.md`, `CLAUDE.md`) for no benefit, so leave them.
- [x] Update 1.2's `server/package.json`: `main` becomes `"src/index.js"`;
      `start`/`demon`/`debug` scripts' `index.js` becomes `src/index.js`;
      `lint` becomes `"eslint --config .eslintrc.js src"` (was `.` —
      narrowing to `src` now that it's not also the tooling-config
      directory).
- [x] Update 1.2's `server/nodemon.json`: `watch` becomes
      `["../.env", "src"]` (was `["../.env", "."]`), same narrowing
      reason. `events.start`/`events.restart` (`npm run lint`) are
      unaffected.
- [x] **Fix the actual bug**: `server/src/server.js`'s view-engine setup
      (~line 72) reads `const viewsPath = 'server/views';`, then
      `path.resolve(viewsPath)` — resolved against cwd, which is why it
      broke under `-w server`. Change to `const viewsPath =
      path.join(__dirname, 'views');`. `partialsPath`/`layoutsPath`
      (derived from `viewsPath` via `path.join`) and the two
      `path.resolve(...)` calls that use them need no separate fix — they
      inherit the corrected absolute base automatically.
- [x] **Fix a second, currently-latent instance of the same class of bug**:
      `server/src/routers/media.js` (~line 16) has `path.join(__basedir,
      '../assets', 'missing-image.jpg')`. This one isn't broken *yet* —
      `__basedir` is `__dirname`-based (`global.__basedir = __dirname` in
      `server.js`), not cwd-based, so it survived 1.2's cwd change fine.
      But moving `server.js` into `src/` pushes `__basedir` one level
      deeper, and the real `assets/` directory stays at repo root
      (unmoved — out of scope here, see below) — so the existing single
      `../assets` climb would start resolving to a nonexistent
      `server/assets/` the moment this move lands. Change to
      `'../../assets'`.
- [x] **Fix `server/src/load-config.js`** (~line 4): `const
      LOCAL_CONFIG_PATH = path.join(__dirname, 'config.local.json');`
      assumed `config.local.json` sits next to `load-config.js`. Since
      the config JSON files are staying at `server/` root (not moving
      into `src/`, per above), change to `path.join(__dirname, '..',
      'config.local.json')`. `app-session.js` needs no change — it only
      consumes `load-config.js`'s exported `isLocal()`, it doesn't build
      the path itself.
- [x] **Fix `.dependency-cruiser.js`'s `no-unreachable-from-entrypoint`
      rule** (root — unaffected by 1.1/1.2, but affected by this move):
      both the `from.path` and the matching `to.pathNot` entry are the
      literal `"^server/index[.]js$"`; change both to
      `"^server/src/index[.]js$"` (and update the rule's `comment`, which
      also spells out the old path). Left as `server/index.js`, the
      rule's `from` condition would never match anything post-move and
      the rule goes silently inert instead of erroring — the same failure
      shape as the Phase 0 `ESLintPlugin` context-path bug (no matches is
      treated as a no-op, not a failure).
- [x] **Not in scope, pre-existing, leave alone**: `server/src/server.js`'s
      favicon line (`path.resolve('../distimg/favicon.ico')`, ~line 59)
      is a bare cwd-relative path too, but `distimg/` doesn't exist
      anywhere in this repo and never did — this was already silently
      broken (caught by the surrounding `try/catch`, logs "No favicon
      found.") before any of Phase 1. Not caused by this restructuring,
      not worth fixing as part of it.
- [x] Re-verify with a real page load, not just a clean startup log:
      `npm run demon`, then actually hit a page that renders a view (not
      just confirm "listening" in the log) — Express doesn't validate the
      `views` path until it renders a template, so the demon-starts-clean
      check in 1.6 wouldn't have caught the original bug on its own.

## 1.4 — `client-legacy/` workspace

- [x] Create `client-legacy/package.json`: `name: "client-legacy"`,
      `private: true`, the dependency list above (`webpack-dev-server` as
      a devDependency, matching its current placement), and scripts
      renamed now that they run with `client-legacy/` as cwd: `"build":
      "webpack --mode production --config webpack.prod.js"`, `"build-dev":
      "webpack --config webpack.dev.js"`, `"dev": "webpack-dev-server
      --config webpack.dev.js"` (dropping the `client-legacy/` prefix from
      each config path, since it's implicit in cwd now).
- [x] No changes needed inside `webpack.common.js`/`webpack.dev.js`/
      `webpack.prod.js` — their `__dirname`-based paths (fixed in Phase 0)
      are already relative to `client-legacy/` itself, not repo root, so
      they're unaffected by the npm-script cwd change.
- [x] `.eslintrc.client.js`/`.eslintrc.angularjs.js` already live in
      `client-legacy/` since Phase 0 — no move needed; they just start
      resolving `eslint`/`eslint-plugin-angular`/etc. from
      `client-legacy/`'s own dependency tree instead of a hoisted root one.

## 1.5 — `client/` stub workspace

- [x] Create `client/package.json` as a placeholder: `name: "client"`,
      `private: true`, `version: "0.0.0"`, no real scripts yet — just
      enough for npm to recognize it as a workspace member. Phase 2 (next)
      replaces this wholesale via `npm create vite@latest .`, which
      generates its own `package.json` anyway.

## 1.6 — Verify

- [x] Delete root `node_modules/` and `package-lock.json`, then run a
      fresh `npm install` from repo root now that all three workspace
      `package.json` files exist. Confirm one hoisted root `node_modules`
      and one regenerated `package-lock.json` in workspace format (no
      per-workspace lockfiles). Root's unanchored `node_modules` line in
      `.gitignore` already covers any nested per-workspace `node_modules`
      npm creates for non-hoistable packages — no `.gitignore` change
      needed.
- [x] Confirm the `@wazue:registry` scoped-registry config in root
      `.npmrc` still resolves `@wazue/*` packages during this install — a
      single root-level `.npmrc` applies to the whole workspace install
      regardless of which workspace declares the dependency, so no
      `.npmrc` change is needed.
- [x] `npm run demon` from root: confirm it still starts the server
      exactly as before (config loads, Mongo connects, lint-on-start still
      fires via `nodemon.json`'s `events`).
- [x] `npm run lint-server` from root: confirm it still lints `server/`
      and produces the same output as before the move.
- [x] `npm run dev-server-legacy` + `npm run demon` together: confirm the
      legacy app still logs in and navigates, same as the Phase 0
      verification.
- [x] `npm run build-client-legacy` from root: confirm a clean production
      build, same as the Phase 0 verification.
- [x] `npm run depcruise` from root: confirm no new `no-non-package-json`
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
- [x] Update this repo's `README.md` "Development" section to explain the
      three-workspace layout and give maintainers a script cheatsheet:
      which root scripts exist, what each delegates to, and the `-w
      <workspace>` pattern for running a workspace-local script directly.
      Also note there: Ctrl-C during `npm run demon` now prints an `npm
      error Lifecycle script "demon" failed ... code 130` block — this is
      expected and harmless, not a real failure. `nodemon` deliberately
      exits with the signal-convention code (128+SIGINT) on interrupt
      (upstream nodemon behavior, unrelated to this repo), and npm's
      workspace run-script path (unlike the old flat `npm run demon`)
      reports any nonzero exit as a lifecycle failure. The server has
      already shut down correctly by the time this prints.
- [x] Commit the whole restructuring as one commit — no code inside
      `server/` or `client-legacy/` changes, only `package.json` files,
      the moved config files, and the regenerated lockfile.

## Known follow-up

`server/nodemon.json`'s `events.start` and `events.restart` are both bound
to `npm run lint`. Since a file-change-triggered restart fires *both*
events in sequence (`restart` for the old process tearing down, `start`
for the new one coming up), lint currently runs twice per edit — confirmed
by direct reproduction with real `nodemon`. Fix: drop the `restart`
binding and keep only `start`, which already fires on every launch
(initial and restart-triggered) on its own. Not yet applied.
