variable "aws_region" {
  description = "AWS region for CDSS deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (development, staging, production)"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "db_password" {
  description = "Master password for RDS PostgreSQL"
  type        = string
  sensitive   = true
  default     = "CdssSecurePostgresPass123!"
}

variable "groq_api_key" {
  description = "Groq LLM Service API Key"
  type        = string
  sensitive   = true
  default     = "gsk_placeholder_production_key"
}
