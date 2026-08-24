# lot-commander

## Commands
- `npm run demon` — dev server via `nodemon` (loads `.env`, requires local Mongo/config)
- `npm run dev-server` — `webpack-dev-server` for client
- `npm run lint-server` — eslint against `server/` using `.eslintrc.server.js`
- `npm run build-client` — production webpack build
- `npm run debug` — `node inspect` entry point
- No test suite exists — verify JS with `node -c <file>` (see Server Modules below)
- No client-side lint script exists either — `node -c` doesn't apply to `client/js/ng` (Angular DI + ES modules); verify client changes with `npm run build-client` (full webpack build catches syntax/wiring errors)

## Infrastructure
- Terraform lives in `terraform/` with two root modules: `bootstrap-ecr` and `bootstrap-pipeline-iam`, each with `environments/sandbox-autarch` and `environments/wazuezoom`
- This repo's `terraform/` only bootstraps ECR push IAM — the actual ECS Fargate deployment and the task role's runtime AWS permissions (S3, Step Functions, SSM scoping) live in the sibling repo `~/dev/ops/lot-commander-ecs-deploy`; check its `terraform/modules/ecs-fargate-service/main.tf` for AccessDenied-shaped issues
- The GitLab provider reads `GITLAB_TOKEN` from the environment — no TF variable needed
- ECR push IAM role uses GitLab OIDC (`sts:AssumeRoleWithWebIdentity`); trust policy conditions: `sub` (wildcard), `aud` (`sts.amazonaws.com`), `namespace_id`, `project_id`
- `server/load-config.js` loads config async at startup: if `server/config.local.json` exists it's used (SSM not contacted, gitignored, for local dev); otherwise config is pulled from SSM Parameter Store at `/lot-commander/<APP_ENV>/config` (`APP_ENV` required in that case)
- AI-backfill runtime config (`aiBackfill.jobsBucket`, `aiBackfill.aggregateStateMachineArn`) lives in the same SSM config blob — `jobsBucket` must be a bucket **name**, not an ARN
- `server/config.js` is dead code — nothing `require`s it; treat `server/config.local.json` (gitignored) and the SSM parameter as the only real config sources
- `.gitignore`'s `config.*` pattern blanket-excludes any `config.*`-named file — new tracked config files (e.g. `server/config.example.json`) need an explicit `!` exception added
- `server/config.example.json` is the canonical documented config shape (sanitized, placeholder credentials) — template for both `server/config.local.json` (local dev) and the SSM parameter (deployed envs, via `set-ssm-env-config.js`); keep it in sync when adding new config keys
- Session secrets: SSM `SecureString` at `/lot-commander/<APP_ENV>/session-secrets` (comma-delimited list, first signs new cookies, all accepted — enables rotation); locally, `SESSION_SECRET` env var is used instead whenever `config.local.json` is present (`server/load-config.js`'s `isLocal()`), regardless of `APP_ENV` — both `load-config.js` and `app-session.js` must agree on this check, since they previously used different heuristics and could disagree

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

## Server Modules (`server/modules/`)
- No automated test suite exists in this repo (no `*.test.js`/`*.spec.js` anywhere) — verify JS changes with `node -c <file>` and manual/code review, not a test run
- Existing caching pattern for external API lookups: `fnsku-to-asin.js` and `traject.js` each implement a Mongo-backed `Cache` class (separate collection, TTL checked against `updatedAt`) — persists across restarts. For caching data already backed by a local Mongo model (e.g. `app-settings.js`), prefer a simpler in-memory cache instead
- Modules are wired in `server.js`'s `init()` (lines 115-440, `Commander` instantiations at ~147-367) as `new XCommander(model, options)`, then bundled into a single dependency object passed to `routers/index.js`
- `product-data.js`'s `getProductDataByBarcode` only attempts a fetch-job-marker write (`createFetchJobIfLotNotLocked`, S3 key `fetch/<lotId>/<barcode>`) on the no-`source` lookup path — an explicit `source` is an intentional probe-only call with no fallback. The write silently no-ops (no log either way) if the Lot is already `Pending Data`
- Product-data source integrations (`upc-item-db.js`, `traject.js`) must return `null`/falsy on a miss, not a truthy placeholder — `getProductDataByBarcode`'s `if(product)` check decides whether fetch-job creation fires. `traject.js` intentionally swallows upstream API errors as a fallback-to-UpcItemDb design (logged via `console.warn`, not fully silent) so a transient upstream failure doesn't block scanning
- For an intentionally-empty S3 `PutObjectCommand` body (e.g. `product-data.js`'s fetch-job marker), use `Buffer.alloc(0)`, not `''` — `@smithy/middleware-content-length` only computes/sets `content-length` when `body` is truthy, and `''` is falsy in JS, so an empty string skips the header entirely and re-triggers the SDK's "stream of unknown length" warning it was meant to silence
- To reproduce/verify AWS SDK request-middleware behavior (e.g. that warning) without real credentials or network access: point `S3Client` at `endpoint: 'http://127.0.0.1:1'` with dummy credentials and `maxAttempts: 1`, then `.send()` and `.catch()` the resulting network error — middleware (incl. `console.warn`s) runs before the failed connection, so console output up to that point reflects real client behavior

## Client (`client/js/ng/`)
- AngularJS 1.x + ui-router in `html5Mode` (pushState, no `#`); states and nav structure are centralized in `app.js`'s `stateData` array, not scattered per-feature
- `RootCtrl` (`root-ctrl.js`) is bound to `<html>` in `server/views/layouts/index.hbs` — it runs once per full page load, NOT per client-side state transition. Logic that must run on every navigation belongs in `app.js`'s `.run()` block (`$transitions.onBefore`/`.onSuccess`), not in `RootCtrl` or scattered across controllers
- Legacy ui-router events (`$stateChangeStart`/`$stateChangeSuccess` via `$rootScope.$on`) never fire in this app — they're a polyfill requiring an explicit dependency on the `ui.router.state.events` module, which `app.js`'s module list doesn't include. Use `$transitions.onBefore()`/`.onSuccess()` instead (core to `ui.router`, no extra module needed); redirect by `return`ing `$state.target(...)` from `onBefore`, not by calling `$state.go()` synchronously (gets silently swallowed mid-transition)
- Auth has two independent layers: the server session (Mongo-backed, 24h TTL, `app-session.js`) and a client-only daily-cutoff enforced by the `sessionTimeout` service (`session-timeout-svc.js`) via a `lotCommander` cookie, checked centrally in `app.js`'s `$transitions.onBefore` hook — they can desync (e.g. a stale un-cleared cookie forces a client logout right after a fresh server login)
- `auth.isLoggedIn` (`server.js`) wraps all routes under `/`, including `/api/*`, and does a bare `res.redirect('/login')` on failure — not XHR-aware, so a failed API call gets a redirect response rather than a 401 JSON body
- To test client-side cookie/timer logic without waiting (no client test suite exists): in the browser console, set the cookie directly (e.g. `document.cookie = 'lotCommander=' + encodeURIComponent(JSON.stringify({timeout: new Date(Date.now()-1000).toISOString()})) + '; path=/'`) and grab any Angular service via `angular.element(document.body).injector().get('serviceName')` to call its methods directly

## WIP / TODO
- Migrate the config pattern away from SSM Parameter Store to ECS task definition envars (see `server/load-config.js` and the SSM-backed session secrets in Infrastructure above)
- Global error handler in `server.js` `console.error`s but doesn't set an HTTP status before `res.json()` — every error currently returns 200, indistinguishable client-side from a legitimate empty result (e.g. `product-data-svc.js` unwraps `resp.product` either way, and some callers like `scan-ctrl.js` have no `.catch()`). A fix (`res.status()` keyed off error class) exists in a local git stash, not yet applied
