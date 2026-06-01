terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
    gitlab = {
      source = "gitlabhq/gitlab"
    }
  }
}

data "aws_caller_identity" "current" {}

data "aws_iam_openid_connect_provider" "gitlab" {
  url = "https://gitlab.com"
}

data "aws_ecr_repository" "app" {
  name = var.ecr_repository_name
}

data "gitlab_project" "app" {
  path_with_namespace = var.gitlab_project_path
}

locals {
  ecr_registry = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}

# ── IAM role ────────────────────────────────────────────────────────────────────

resource "aws_iam_role" "gitlab_ci" {
  name = "${var.ecr_repository_name}-ci"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = data.aws_iam_openid_connect_provider.gitlab.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringLike = {
            "gitlab.com:sub" = "project_path:${var.gitlab_project_path}:*"
          }
          StringEquals = {
            "gitlab.com:aud"          = "sts.amazonaws.com"
            "gitlab.com:namespace_id" = tostring(data.gitlab_project.app.namespace_id)
            "gitlab.com:project_id"   = tostring(data.gitlab_project.app.id)
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "ecr_push" {
  name = "ecr-push"
  role = aws_iam_role.gitlab_ci.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # GetAuthorizationToken is account-wide; no resource restriction possible
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
        ]
        Resource = data.aws_ecr_repository.app.arn
      }
    ]
  })
}

# ── GitLab CI/CD variables ───────────────────────────────────────────────────────

resource "gitlab_project_variable" "aws_role_arn" {
  project = data.gitlab_project.app.id
  key     = "AWS_ROLE_ARN"
  value   = aws_iam_role.gitlab_ci.arn
  masked            = false
  environment_scope = var.environment_scope
}

resource "gitlab_project_variable" "aws_default_region" {
  project = data.gitlab_project.app.id
  key     = "AWS_DEFAULT_REGION"
  value   = var.aws_region
  masked            = false
  environment_scope = var.environment_scope
}

resource "gitlab_project_variable" "ecr_registry" {
  project = data.gitlab_project.app.id
  key     = "ECR_REGISTRY"
  value   = local.ecr_registry
  masked            = false
  environment_scope = var.environment_scope
}

resource "gitlab_project_variable" "ecr_repository" {
  project = data.gitlab_project.app.id
  key     = "ECR_REPOSITORY"
  value   = data.aws_ecr_repository.app.name
  masked            = false
  environment_scope = var.environment_scope
}
