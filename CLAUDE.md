# lot-commander

## Commands
- `npm run demon` — dev server via `nodemon`, delegated via `-w server` to `server/nodemon.json`; its `events` hook re-runs `npm run lint` on every start/restart
- `npm run dev-server-legacy` — `webpack-dev-server` for the legacy AngularJS client (renamed from `dev-server` when the client + build tooling moved to `client-legacy/`; see Modernize)
- `npm run lint-server` — delegates to `npm run lint -w server`; eslint against `server/src` using `server/.eslintrc.js`
- `npm run build-client-legacy` — production webpack build of the legacy client (renamed from `build-client`; also `build-client-dev-legacy` for the dev-mode build)
- `npm run depcruise` — runs `dependency-cruiser` repo-wide; also the workspace-boundary check (flags a dependency used in one workspace but declared in another's `package.json`)
- `npm run debug` — `node inspect` entry point
- No test suite exists — verify JS with `node -c <file>` (see Server Modules below)
- No client-side lint script exists either — `node -c` doesn't apply to `client-legacy/src/js/ng` (Angular DI + ES modules); verify legacy client changes with `npm run build-client-legacy` (full webpack build catches syntax/wiring errors)
- `sed` on this dev machine is GNU sed, not BSD, despite Darwin — use `sed -i 'script' file`, not the BSD/macOS `sed -i '' 'script' file` (the latter fails with a misleading "can't read \<script\>" error)

## Infrastructure
- Terraform lives in `terraform/` with two root modules: `bootstrap-ecr` and `bootstrap-pipeline-iam`, each with `environments/sandbox-autarch` and `environments/wazuezoom`
- This repo's `terraform/` only bootstraps ECR push IAM — the actual ECS Fargate deployment and the task role's runtime AWS permissions (S3, Step Functions, SSM scoping) live in the sibling repo `~/dev/ops/lot-commander-ecs-deploy`; check its `terraform/modules/ecs-fargate-service/main.tf` for AccessDenied-shaped issues
- The GitLab provider reads `GITLAB_TOKEN` from the environment — no TF variable needed
- ECR push IAM role uses GitLab OIDC (`sts:AssumeRoleWithWebIdentity`); trust policy conditions: `sub` (wildcard), `aud` (`sts.amazonaws.com`), `namespace_id`, `project_id`
- `server/src/load-config.js` loads config async at startup: if `server/config.local.json` exists it's used (SSM not contacted, gitignored, for local dev); otherwise config is pulled from SSM Parameter Store at `/lot-commander/<APP_ENV>/config` (`APP_ENV` required in that case)
- AI-backfill runtime config (`aiBackfill.jobsBucket`, `aiBackfill.aggregateStateMachineArn`) lives in the same SSM config blob — `jobsBucket` must be a bucket **name**, not an ARN
- `server/src/config.js` is dead code — nothing `require`s it; treat `server/config.local.json` (gitignored) and the SSM parameter as the only real config sources
- `.gitignore`'s `config.*` pattern blanket-excludes any `config.*`-named file — new tracked config files (e.g. `server/config.example.json`) need an explicit `!` exception added
- Root `.npmrc` hardcodes a GitLab auth token for the `@wazue` scoped registry — required to install `@wazue/barcodes`, `@wazue/excel`, `@wazue/upc-item-db`; don't delete/replace this file casually
- `server/config.example.json` is the canonical documented config shape (sanitized, placeholder credentials) — template for both `server/config.local.json` (local dev) and the SSM parameter (deployed envs, via `set-ssm-env-config.js`); keep it in sync when adding new config keys
- Session secrets: SSM `SecureString` at `/lot-commander/<APP_ENV>/session-secrets` (comma-delimited list, first signs new cookies, all accepted — enables rotation); locally, `SESSION_SECRET` env var is used instead whenever `config.local.json` is present (`server/src/load-config.js`'s `isLocal()`), regardless of `APP_ENV` — both `load-config.js` and `app-session.js` must agree on this check, since they previously used different heuristics and could disagree

## CI/CD (`.gitlab-ci.yml`)
- `build` job is env-agnostic: tags image `app:$CI_COMMIT_SHORT_SHA`, saves as `image.tar.gz` artifact (3hr expiry)
- Push jobs retag from `app:$CI_COMMIT_SHORT_SHA` to ECR destination; they hold environment-specific vars
- `push-wazuezoom` auto-triggers on semver tags (`\d+\.\d+\.\d+$`); all other push jobs are manual with `allow_failure: true`
- Push jobs always tag/push `$CI_COMMIT_SHORT_SHA` and `latest`; `IMAGE_TAG` and `CI_COMMIT_TAG` are tagged/pushed independently if each is set (not a fallback of one to the other)
- `docker:29` image has no bash (Alpine, no `bash` package) — CI script lines must use POSIX `sh` syntax: `[ ]` not `[[ ]]`, no `-v` test operator
- apk `aws-cli` is broken on Alpine 3.20+ — install via `pip3` with `--break-system-packages`

## Environments
- `sandbox-autarch` — non-production, push is always manual
- `wazuezoom` — production, auto-push on semver tags only

## Runtime & Networking
- Production sits behind an AWS ALB; `server.js:listen()` does NOT set `keepAliveTimeout`/`headersTimeout` on the Node.js HTTP server — known gap (Node default 5s < ALB idle timeout 60s → intermittent 502s)
- `shopify-gql.js` uses bare `axios()` with no keep-alive HTTP agent; each Shopify API call opens a new TCP/TLS connection
- Two MongoDB connections at startup: main via `mongoose.createConnection()` in `server.js`, second via `connect-mongodb-session` in `app-session.js`
- Four separate `S3Client` instances, each with independent connection pools: `media-server.js`, `document-svc.js`, `manifest-svc.js`, `product-data.js`
- `bstock-db.js` creates its client at module load time using the `__mongooseConnection` global — must be required after `server.init()` completes
- `global.__config` (set in `Server` constructor, before `init()` runs) is read at module-load time by `media-server.js`, `manifest-svc.js`, `document-svc.js`, `product-data.js` for S3 bucket/CloudFront config — same load-order hazard as `bstock-db.js`'s `__mongooseConnection` use

## Server Modules (`server/src/modules/`)
- No automated test suite exists in this repo (no `*.test.js`/`*.spec.js` anywhere) — verify JS changes with `node -c <file>` and manual/code review, not a test run
- Existing caching pattern for external API lookups: `fnsku-to-asin.js` and `traject.js` each implement a Mongo-backed `Cache` class (separate collection, TTL checked against `updatedAt`) — persists across restarts. For caching data already backed by a local Mongo model (e.g. `app-settings.js`), prefer a simpler in-memory cache instead
- Modules are wired in `server.js`'s `init()` (lines 115-440, `Commander` instantiations at ~147-367) as `new XCommander(model, options)`, then bundled into a single dependency object passed to `routers/index.js`
- `product-data.js`'s `getProductDataByBarcode` only attempts a fetch-job-marker write (`createFetchJobIfLotNotLocked`, S3 key `fetch/<lotId>/<barcode>`) on the no-`source` lookup path — an explicit `source` is an intentional probe-only call with no fallback. The write silently no-ops (no log either way) if the Lot is already `Pending Data`
- Product-data source integrations (`upc-item-db.js`, `traject.js`) must return `null`/falsy on a miss, not a truthy placeholder — `getProductDataByBarcode`'s `if(product)` check decides whether fetch-job creation fires. `traject.js` intentionally swallows upstream API errors as a fallback-to-UpcItemDb design (logged via `console.warn`, not fully silent) so a transient upstream failure doesn't block scanning
- For an intentionally-empty S3 `PutObjectCommand` body (e.g. `product-data.js`'s fetch-job marker), use `Buffer.alloc(0)`, not `''` — `@smithy/middleware-content-length` only computes/sets `content-length` when `body` is truthy, and `''` is falsy in JS, so an empty string skips the header entirely and re-triggers the SDK's "stream of unknown length" warning it was meant to silence
- To reproduce/verify AWS SDK request-middleware behavior (e.g. that warning) without real credentials or network access: point `S3Client` at `endpoint: 'http://127.0.0.1:1'` with dummy credentials and `maxAttempts: 1`, then `.send()` and `.catch()` the resulting network error — middleware (incl. `console.warn`s) runs before the failed connection, so console output up to that point reflects real client behavior

## Modernize

As an upskilling exercise, I wish to modernize this codebase. Since this is an exercise, we are not overly concerned with immediate production-readiness and deployment considerations can be put on the back-burner indefinitely. Also, since this is an exercise, Claude should only provide guidance unless explicitly requested otherwise, so no commits or code generation. Details of the migration:

- Primary focus is the frontend client. A complete rewrite of the frontend client and build system will be initiated. New client source goes in `client/`. The existing client + its build tooling were moved into `client-legacy/` and committed: old `client/` is now `client-legacy/src/`, and the webpack configs + both `.eslintrc.{client,angularjs}.js` moved from root into `client-legacy/` alongside it.
- Phase 0 of `docs/modernization/PLAN.md` is done and committed, including a fix to `client-legacy/webpack.common.js`'s `ESLintPlugin` `context` paths (both the active and commented-out blocks now correctly say `src/js/`). `client-legacy/webpack.dev.js`'s dev-server port was deliberately changed from `9000` to `9090` — `9000` (already used by `package.json`'s `ngrok` script) is reserved for the new client's dev server, so legacy and new can run simultaneously for side-by-side comparison. `Dockerfile` still runs `npm run build-client`, which no longer exists (renamed `build-client-legacy`, see Commands) — not yet fixed, deployment concerns are back-burnered per this section's intro.
- New client stack: TypeScript, React, Tailwind, Vite, Vitest, TypeScript-ESLint.
- Phase 1 of `docs/modernization/PLAN.md` is done and committed: root `package.json` is a purely-coordinating npm workspaces root over `server`, `client-legacy`, `client`, and `scripts` (the last added during execution, not in the original plan); `server/`'s application code now lives in `server/src/`, with tooling config (`package.json`, `.eslintrc.js`, `nodemon.json`) staying at `server/` root.
- The new client is created from scratch and uses the existing backend API (all routes mounted under `/api/*` in `server/routers/index.js`). Built one screen/feature at a time.
- Auth/permission model the new client must replicate, since none of it is visible from the new API surface alone: the real session is an httpOnly cookie (`app-session.js`); a parallel **non-httpOnly** `user` cookie (JSON — `server.js`'s `res.cookie('user', JSON.stringify(req.user.getPublicInfo()))`) mirrors the user + permissions array for client-side checks (legacy equivalent: `LoggedInUser` service, `client-legacy/src/js/ng/services/logged-in-user-svc.js`); a separate `lotCommander` cookie enforces a client-only daily-cutoff independent of the server session (legacy equivalent: `session-timeout-svc.js`). `/login` (GET+POST) and `/logout` (GET) stay server-rendered outside the SPA in both clients.
- `auth.isLoggedIn` (`server/src/auth.js`) gates all of `/`, including `/api/*`, with a bare non-XHR-aware `res.redirect('/login')` on an expired/missing session (same root gap noted in WIP/TODO for the error handler) — the new client's fetch layer must treat a non-JSON/redirected response as "logged out," not assume every response is JSON.
- We will also do some backend migration to TypeScript but it will be targeted and in-place, only a file at a time.
- Backend will also use Vite and Vitest when the time comes but we'll not start with that migration right away, just be forward looking for it.
- `docs/modernization/PLAN.md` is now just a condensed index (status + one-paragraph-per-phase); full checklists live in `docs/modernization/phase-<N>-*.md`, linked from the index — open the specific phase file rather than expecting detail in `PLAN.md` itself.

## Client (`client-legacy/src/js/ng/`)
- AngularJS 1.x + ui-router in `html5Mode` (pushState, no `#`); states and nav structure are centralized in `app.js`'s `stateData` array, not scattered per-feature
- `RootCtrl` (`root-ctrl.js`) is bound to `<html>` in `server/views/layouts/index.hbs` — it runs once per full page load, NOT per client-side state transition. Logic that must run on every navigation belongs in `app.js`'s `.run()` block (`$transitions.onBefore`/`.onSuccess`), not in `RootCtrl` or scattered across controllers
- Legacy ui-router events (`$stateChangeStart`/`$stateChangeSuccess` via `$rootScope.$on`) never fire in this app — they're a polyfill requiring an explicit dependency on the `ui.router.state.events` module, which `app.js`'s module list doesn't include. Use `$transitions.onBefore()`/`.onSuccess()` instead (core to `ui.router`, no extra module needed); redirect by `return`ing `$state.target(...)` from `onBefore`, not by calling `$state.go()` synchronously (gets silently swallowed mid-transition)
- Auth has two independent layers: the server session (Mongo-backed, 24h TTL, `app-session.js`) and a client-only daily-cutoff enforced by the `sessionTimeout` service (`session-timeout-svc.js`) via a `lotCommander` cookie, checked centrally in `app.js`'s `$transitions.onBefore` hook — they can desync (e.g. a stale un-cleared cookie forces a client logout right after a fresh server login)
- `auth.isLoggedIn` (`server.js`) wraps all routes under `/`, including `/api/*`, and does a bare `res.redirect('/login')` on failure — not XHR-aware, so a failed API call gets a redirect response rather than a 401 JSON body
- To test client-side cookie/timer logic without waiting (no client test suite exists): in the browser console, set the cookie directly (e.g. `document.cookie = 'lotCommander=' + encodeURIComponent(JSON.stringify({timeout: new Date(Date.now()-1000).toISOString()})) + '; path=/'`) and grab any Angular service via `angular.element(document.body).injector().get('serviceName')` to call its methods directly

## WIP / TODO
- Migrate the config pattern away from SSM Parameter Store to ECS task definition envars (see `server/src/load-config.js` and the SSM-backed session secrets in Infrastructure above)
- Global error handler in `server.js` `console.error`s but doesn't set an HTTP status before `res.json()` — every error currently returns 200, indistinguishable client-side from a legitimate empty result (e.g. `product-data-svc.js` unwraps `resp.product` either way, and some callers like `scan-ctrl.js` have no `.catch()`). A fix (`res.status()` keyed off error class) exists in a local git stash, not yet applied
