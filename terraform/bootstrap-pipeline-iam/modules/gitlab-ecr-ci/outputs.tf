output "iam_role_arn" {
  description = "ARN of the IAM role assumed by GitLab CI"
  value       = aws_iam_role.gitlab_ci.arn
}

output "ecr_registry" {
  description = "ECR registry hostname"
  value       = local.ecr_registry
}
