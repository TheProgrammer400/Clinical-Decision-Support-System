resource "aws_s3_bucket" "frontend" {
  bucket        = "cdss-frontend-assets-${var.environment}"
  force_destroy = true
}

# CloudFront is disabled for new AWS accounts until account verification by AWS Support.
# Static frontend assets are hosted via S3 and serve behind Application Load Balancer / ECS Fargate.
