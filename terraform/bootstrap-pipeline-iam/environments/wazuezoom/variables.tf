variable "gitlab_project_path" {
  description = "Full GitLab project path (namespace/project-name)"
  type        = string
  default     = "wazue/lot-commander"
}


variable "aws_region" {
  description = "AWS region where ECR lives"
  type        = string
  default     = "us-east-1"
}
