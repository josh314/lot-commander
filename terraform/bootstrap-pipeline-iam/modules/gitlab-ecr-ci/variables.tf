variable "gitlab_project_path" {
  description = "Full GitLab project path (namespace/project-name)"
  type        = string
}

variable "aws_region" {
  description = "AWS region where ECR lives"
  type        = string
}

variable "ecr_repository_name" {
  description = "Name of the ECR repository"
  type        = string
  default     = "lot-commander"
}
