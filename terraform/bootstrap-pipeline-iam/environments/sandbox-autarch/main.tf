terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    gitlab = {
      source  = "gitlabhq/gitlab"
      version = "~> 17.0"
    }
  }
  required_version = ">= 1.0"

  backend "s3" {
    region       = "us-east-1"
    bucket       = "tf-state-476114126879-us-east-1"
    key          = "lot-commander-bootstrap-pipeline-iam.tfstate"
    use_lockfile = true
    encrypt      = true
  }
}

provider "aws" {
  region = var.aws_region
}

provider "gitlab" {
  token = var.gitlab_token
}

module "gitlab_ecr_ci" {
  source = "../../modules/gitlab-ecr-ci"

  gitlab_project_path = var.gitlab_project_path
  aws_region          = var.aws_region
}
