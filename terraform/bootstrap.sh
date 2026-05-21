#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-}"

if [[ -z "$ENVIRONMENT" ]]; then
  echo "Usage: $0 <environment>"
  echo "Environments: sandbox-autarch, wazuezoom"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ECR_DIR="$SCRIPT_DIR/bootstrap-ecr/environments/$ENVIRONMENT"
IAM_DIR="$SCRIPT_DIR/bootstrap-pipeline-iam/environments/$ENVIRONMENT"

if [[ ! -d "$ECR_DIR" || ! -d "$IAM_DIR" ]]; then
  echo "Error: Unknown environment '$ENVIRONMENT'"
  echo "Environments: sandbox-autarch, wazuezoom"
  exit 1
fi

if [[ -z "${GITLAB_TOKEN:-}" ]]; then
  echo "Error: GITLAB_TOKEN must be set"
  exit 1
fi

export TF_VAR_gitlab_token="$GITLAB_TOKEN"

run_terraform() {
  local dir="$1"
  local label="$2"
  echo ""
  echo "==> $label"
  terraform -chdir="$dir" init
  terraform -chdir="$dir" apply -auto-approve
}

run_terraform "$ECR_DIR" "bootstrap-ecr ($ENVIRONMENT)"
run_terraform "$IAM_DIR" "bootstrap-pipeline-iam ($ENVIRONMENT)"

echo ""
echo "==> Bootstrap complete for environment: $ENVIRONMENT"
