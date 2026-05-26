# Lot Commander

Internal app for managing inventory and creating manifested lots.

## Node version

Currently using Node 24.x.

## Bootswatch

For styling, this project uses the Bootswatch project which is a riff on Bootstrap. Note the non-standard version in `package.json`: 3.4.1+1. This is required to pull a tagged commit for a hotfix without which the LESS source won't compile. This commit was never merged in properly into the release branch for version 3 as the Bootswatch team moved onto version 4. 

## Development

### `npm` scripts

Use `nodemon` and `webpack-dev-server` for development:

```
npm run demon
```

and

```
npm run dev-server
```

These utilize linting for both the server code and client code. There are separate `.eslintrc` files for the server and client.

## Configuration

Config is loaded asynchronously at startup by `server/load-config.js` using the following precedence:

1. **`server/config.local.json`** — if present, this file is used and SSM is not contacted. Intended for local development. It is gitignored via the `config.*` pattern.
2. **AWS SSM Parameter Store** — used in all other environments. The parameter path is `/lot-commander/<APP_ENV>/config`, where `APP_ENV` is a required environment variable (e.g. `production`, `staging`).

The SSM parameter is a SecureString containing the full config as a JSON blob.

### IAM requirements

The identity running the app needs:

- `ssm:GetParameter` on the parameter resource
- `kms:Decrypt` on the KMS key used to encrypt it (the AWS-managed `aws/ssm` key by default)

Find the key ID for the policy statement with:

```bash
aws kms describe-key --key-id alias/aws/ssm --query 'KeyMetadata.KeyId' --output text
```

### Setting the SSM parameter

Use `set-ssm-env-config.js` to upload a local JSON file to SSM:

```bash
node set-ssm-env-config.js <app-env> <config-file>
```

For example:

```bash
node set-ssm-env-config.js production config.production.json
```

The script validates the JSON before writing and uses `Overwrite: true`, so re-running it safely updates an existing parameter.


## Session Secrets

Session cookie signing uses one or more secrets stored in AWS SSM Parameter Store at:

```
/lot-commander/<APP_ENV>/session-secrets
```

The parameter is a `SecureString` containing a comma-delimited list of secrets. At runtime, `server/modules/app-session.js` fetches the parameter and passes the array to `express-session`. Express will sign new cookies with the first secret and accept cookies signed by any secret in the list, enabling zero-downtime secret rotation.

In local development (when `server/config.local.json` is present and `APP_ENV` is not set), the `SESSION_SECRET` environment variable is used instead.

### Rotating secrets

Use `scripts/rotate-session-secret.js` to prepend a new secret and push the updated list to SSM:

```bash
node scripts/rotate-session-secret.js <app-env> <new-secret>
```

For example:

```bash
node scripts/rotate-session-secret.js production my-new-secret-value
```

The script:
1. Fetches the existing secret list from SSM (creates the parameter if it doesn't exist yet)
2. Prepends the new secret
3. Trims the list to a maximum of **3 secrets**, dropping the oldest
4. Writes the result back to SSM as a `SecureString`

After deploying the app with the updated parameter, existing sessions signed with the old secret remain valid. Once all instances have restarted and a reasonable session lifetime has elapsed, you can rotate again to drop the old secret entirely.

## CI/CD — Docker image pipeline

The GitLab CI/CD pipeline builds a Docker image and pushes it to AWS ECR using OIDC-based authentication (no long-lived AWS credentials).

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
