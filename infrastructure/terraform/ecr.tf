resource "aws_ecr_repository" "backend" {
  name                 = "cdss-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
    Project     = "CDSS"
    ManagedBy   = "Terraform"
  }
}

resource "aws_ecr_repository" "frontend" {
  name                 = "cdss-frontend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
    Project     = "CDSS"
    ManagedBy   = "Terraform"
  }
}

# Lifecycle policy: keep only last 10 images
resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

resource "aws_ecr_lifecycle_policy" "frontend" {
  repository = aws_ecr_repository.frontend.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

output "ecr_backend_uri" {
  value = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_uri" {
  value = aws_ecr_repository.frontend.repository_url
}
