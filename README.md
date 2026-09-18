<style>
r { color: Red }
o { color: Orange }
g { color: Green }
</style>

# Lot Commander

<o>**NOTE: This project is currently undergoing a long-term modernization effort to transition from the legacy AngularJS client to a new React/TypeScript/Vite client. Additionally, Typescript is to be introduced on the server side.**</o>

Internal app for managing inventory and creating manifested lots.

## Node version

Currently using Node 24.x.

## Development

### Workspace layout

This repo is an npm workspaces monorepo with a purely coordinating root `package.json` (no runtime dependencies of its own) and four workspaces:

| Workspace | Path | What it is |
|---|---|---|
| `server` | `server/` (source in `server/src/`) | The Express/MongoDB backend. |
| `client-legacy` | `client-legacy/` | The original AngularJS client + webpack build, being phased out screen-by-screen. |
| `client` | `client/` | The new React/TypeScript/Vite client — currently a stub; real scaffolding lands in a later phase (see `docs/modernization/PLAN.md`). |
| `scripts` | `scripts/` | One-off operational scripts (SSM config upload, session-secret rotation). |

A single `npm install` at the repo root installs all four workspaces' dependencies into one hoisted `node_modules`. Root scripts delegate into a workspace via `-w <workspace>`; you can also run a workspace's own scripts directly with `npm run <script> -w <workspace>`, or `cd` into the workspace and run `npm run <script>` there.

### `npm` scripts

| Root script | Delegates to | What it does |
|---|---|---|
| `npm run demon` | `server` | `nodemon`-driven dev server (watches `server/src`), lints on start/restart |
| `npm start` | `server` | Runs the server once, no watching |
| `npm run debug` | `server` | `node inspect` entry point |
| `npm run lint-server` | `server` | ESLint against `server/src` |
| `npm run dev-server-legacy` | `client-legacy` | `webpack-dev-server` for the legacy AngularJS client |
| `npm run build-client-legacy` | `client-legacy` | Production webpack build of the legacy client |
| `npm run build-client-dev-legacy` | `client-legacy` | Dev-mode webpack build of the legacy client |
| `npm run depcruise` | — (root only) | Runs `dependency-cruiser` across the repo — also the check that a dependency landed in the right workspace's `package.json`, since a flat hoisted `node_modules` would otherwise let any workspace `require()` any other workspace's dependency without it being declared |
| `npm run ngrok` | — (root only) | Tunnels port 9000, reserved for the new client's future dev server |

`client` and `scripts` have no root-level script aliases yet: `client` is still a stub (no real `dev`/`build` scripts until the new client is actually scaffolded), and `scripts/*.js` are one-off CLI utilities invoked directly (e.g. `node scripts/rotate-session-secret.js ...`), not wired as package scripts.

One quirk worth knowing: pressing Ctrl-C during `npm run demon` prints an `npm error Lifecycle script "demon" failed ... code 130` block. This is expected and harmless, not a real failure — `nodemon` deliberately exits with the signal-convention code (128+SIGINT) on interrupt (upstream `nodemon` behavior, unrelated to this repo), and npm's workspace run-script path reports any nonzero exit as a lifecycle failure, unlike a plain non-workspace `npm run`. The server has already shut down correctly by the time this prints.

## Configuration

Config is loaded asynchronously at startup by `server/src/load-config.js` using the following precedence:

1. **`server/config.local.json`** — if present, this file is used and SSM is not contacted. Intended for local development. It is gitignored via the `config.*` pattern.
2. **AWS SSM Parameter Store** — used in all other environments. The parameter path is `/lot-commander/<APP_ENV>/config`, where `APP_ENV` is a required environment variable (e.g. `production`, `staging`).

`server/config.example.json` documents the full config shape with placeholder values and is checked into git (explicitly excepted from the `config.*` gitignore pattern). It's the template for both destinations above: copy it to `server/config.local.json` for local development, or fill it in and upload it as the SSM parameter for a deployed environment (see "Setting the SSM parameter" below). Keep it in sync whenever config keys are added or removed.

The SSM parameter is a SecureString containing the full config as a JSON blob.

### IAM requirements

The identity running the app needs:

- `ssm:GetParameter` on the parameter resource
- `kms:Decrypt` on the KMS key used to encrypt it (the AWS-managed `aws/ssm` key by default)

Find the key ID for the policy statement with:

```bash
aws kms describe-key --key-id alias/aws/ssm --query 'KeyMetadata.KeyId' --output text
```

### S3 buckets

Bucket names and CloudFront domains are part of the config blob, under the `s3` key:

```json
"s3": {
  "media": {
    "buckets": { "images": "...", "videos": "..." },
    "cloudfrontDomains": { "images": "...", "videos": "..." }
  },
  "manifests": { "bucket": "...", "cloudfrontDomain": "..." },
  "documents": { "bucket": "..." },
  "productDataJobs": { "bucket": "..." }
}
```

`server/src/modules/media-server.js`, `manifest-svc.js`, `document-svc.js`, and `product-data.js` read these off `global.__config.s3.*` at module-load time rather than through constructor injection (they're plain modules required directly by routers, not `Commander`s wired in `server.js`'s `init()`). This relies on `global.__config` being set in the `Server` constructor before `init()` requires the routers — the same pattern `bstock-db.js` uses for `global.__mongooseConnection`. Any environment's SSM config (or `config.local.json`) must include this `s3` block or these modules will throw on startup.

### Setting the SSM parameter

Use `scripts/set-ssm-env-config.js` to upload a local JSON file to SSM. Start from `server/config.example.json` and fill in the environment's real values:

```bash
node scripts/set-ssm-env-config.js <app-env> <config-file>
```

For example:

```bash
node scripts/set-ssm-env-config.js production config.production.json
```

The script validates the JSON before writing and uses `Overwrite: true`, so re-running it safely updates an existing parameter.


## Session Secrets

Session cookie signing uses one or more secrets stored in AWS SSM Parameter Store at:

```
/lot-commander/<APP_ENV>/session-secrets
```

The parameter is a `SecureString` containing a comma-delimited list of secrets. At runtime, `server/src/modules/app-session.js` fetches the parameter and passes the array to `express-session`. Express will sign new cookies with the first secret and accept cookies signed by any secret in the list, enabling zero-downtime secret rotation.

In local development (when `server/config.local.json` is present), the `SESSION_SECRET` environment variable is used instead, regardless of whether `APP_ENV` is also set.

### Rotating secrets

Use `scripts/rotate-session-secret.js` to prepend a new secret and push the updated list to SSM:

```bash
node scripts/rotate-session-secret.js <app-env> <new-secret>
```

For example:

```bash
node scripts/rotate-session-secret.js prod my-new-secret-value
```

The script:
1. Fetches the existing secret list from SSM (creates the parameter if it doesn't exist yet)
2. Prepends the new secret
3. Trims the list to a maximum of **3 secrets**, dropping the oldest
4. Writes the result back to SSM as a `SecureString`

After deploying the app with the updated parameter, existing sessions signed with the old secret remain valid. Once all instances have restarted and a reasonable session lifetime has elapsed, you can rotate again to drop the old secret entirely.

A good random secret can be generated with:

```bash
openssl rand -base64 32
```


## CI/CD — Docker image pipeline

<o>**NOTE: CI/CD pipeline will be broken until updated for the new modernization effort.**</o>

The GitLab CI/CD pipeline builds a Docker image and pushes it to AWS ECR using OIDC-based authentication (no long-lived AWS credentials). The actual deployment to ECS Fargate is handled downstream by code in [another repository](https://gitlab.com/wazue/lot-commander-ecs-deploy).

### Terraform bootstrap

Two Terraform root modules handle the one-time infrastructure setup. Each has an environment directory per AWS account (`sandbox-autarch`, `wazuezoom`).

| Module | Path | What it creates |
|---|---|---|
| `bootstrap-ecr` | `terraform/bootstrap-ecr/environments/<env>/` | ECR repository |
| `bootstrap-pipeline-iam` | `terraform/bootstrap-pipeline-iam/environments/<env>/` | IAM role (OIDC trust for GitLab CI), ECR push policy, GitLab CI/CD project variables |

The IAM role logic is shared via a reusable module at `terraform/bootstrap-pipeline-iam/modules/gitlab-ecr-ci/`.

### Running the bootstrap

Set the GitLab API token and run the bootstrap script with the target environment:

```bash
GITLAB_TOKEN=<token> ./terraform/bootstrap.sh <environment>
```

The script runs `terraform init` and `terraform apply` for both modules in the correct order (ECR first, then IAM). Valid environments are `sandbox-autarch` and `wazuezoom`.

### How it works

GitLab CI jobs assume the IAM role via `sts:AssumeRoleWithWebIdentity` using a JWT issued by GitLab's OIDC provider. The role is scoped to the specific GitLab project and grants only the permissions needed to push images to ECR. The pipeline variables (`AWS_ROLE_ARN`, `ECR_REGISTRY`, `ECR_REPOSITORY`, `AWS_DEFAULT_REGION`) are written directly to the GitLab project by Terraform.


## Bootswatch


<o>**NOTE: Used only in the legacy AngularJS client for styling.**</o>

For styling, this project uses the Bootswatch project which is a riff on Bootstrap. Note the non-standard version in `package.json`: 3.4.1+1. This is required to pull a tagged commit for a hotfix without which the LESS source won't compile. This commit was never merged in properly into the release branch for version 3 as the Bootswatch team moved onto version 4. 
