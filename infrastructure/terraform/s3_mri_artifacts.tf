resource "aws_s3_bucket" "mri_artifacts" {
  bucket        = "cdss-mri-artifacts-${var.environment}"
  force_destroy = false

  tags = {
    Name = "cdss-mri-artifacts-${var.environment}"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "mri_artifacts" {
  bucket = aws_s3_bucket.mri_artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "mri_artifacts" {
  bucket = aws_s3_bucket.mri_artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
