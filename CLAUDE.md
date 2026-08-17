# lot-commander

## Commands
- `npm run demon` — dev server via `nodemon` (loads `.env`, requires local Mongo/config)
- `npm run dev-server` — `webpack-dev-server` for client
- `npm run lint-server` — eslint against `server/` using `.eslintrc.server.js`
- `npm run build-client` — production webpack build
- `npm run debug` — `node inspect` entry point
- No test suite exists — verify JS with `node -c <file>` (see Server Modules below)

## Infrastructure
- Terraform lives in `terraform/` with two root modules: `bootstrap-ecr` and `bootstrap-pipeline-iam`, each with `environments/sandbox-autarch` and `environments/wazuezoom`
- The GitLab provider reads `GITLAB_TOKEN` from the environment — no TF variable needed
- ECR push IAM role uses GitLab OIDC (`sts:AssumeRoleWithWebIdentity`); trust policy conditions: `sub` (wildcard), `aud` (`sts.amazonaws.com`), `namespace_id`, `project_id`
- `server/load-config.js` loads config async at startup: if `server/config.local.json` exists it's used (SSM not contacted, gitignored, for local dev); otherwise config is pulled from SSM Parameter Store at `/lot-commander/<APP_ENV>/config` (`APP_ENV` required in that case)
- `server/config.js` is dead code — nothing `require`s it; treat `server/config.local.json` (gitignored) and the SSM parameter as the only real config sources
- `.gitignore`'s `config.*` pattern blanket-excludes any `config.*`-named file — new tracked config files (e.g. `server/config.example.json`) need an explicit `!` exception added
- `server/config.example.json` is the canonical documented config shape (sanitized, placeholder credentials) — template for both `server/config.local.json` (local dev) and the SSM parameter (deployed envs, via `set-ssm-env-config.js`); keep it in sync when adding new config keys
- Session secrets: SSM `SecureString` at `/lot-commander/<APP_ENV>/session-secrets` (comma-delimited list, first signs new cookies, all accepted — enables rotation); locally, `SESSION_SECRET` env var is used instead when `config.local.json` is present and `APP_ENV` is unset

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

## WIP / TODO
- Migrate the config pattern away from SSM Parameter Store to ECS task definition envars (see `server/load-config.js` and the SSM-backed session secrets in Infrastructure above)
