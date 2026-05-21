output "iam_role_arn" {
  description = "ARN of the IAM role assumed by GitLab CI"
  value       = module.gitlab_ecr_ci.iam_role_arn
}

output "ecr_registry" {
  description = "ECR registry hostname"
  value       = module.gitlab_ecr_ci.ecr_registry
}
