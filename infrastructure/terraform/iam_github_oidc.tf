# AWS IAM OIDC Provider and Role for GitHub Actions Deployment

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [
    "227203b5317f3818cab5b5ce596132bf36748c0e",
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a2a8515a675928b314324151f8b763f36f46"
  ]
}

resource "aws_iam_role" "github_cd_deploy" {
  name = "CDSSGitHubDeployRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = [
              # New GitHub OIDC format with numeric IDs
              "repo:TheProgrammer400@85757750/Clinical-Decision-Support-System@1348308893:*",
              # Old format fallback
              "repo:TheProgrammer400/Clinical-Decision-Support-System:*",
              "repo:theprogrammer400/clinical-decision-support-system:*",
            ]
          }
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = "CDSS"
    ManagedBy   = "Terraform"
  }
}

# Managed Policy Attachments for Deployment
resource "aws_iam_role_policy_attachment" "github_cd_ecr" {
  role       = aws_iam_role.github_cd_deploy.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
}

resource "aws_iam_role_policy_attachment" "github_cd_ecs" {
  role       = aws_iam_role.github_cd_deploy.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonECS_FullAccess"
}

# Additional Policy for S3 & Secrets Manager Access
resource "aws_iam_role_policy" "github_cd_deploy_additional" {
  name = "CDSSGitHubDeployAdditionalPolicy"
  role = aws_iam_role.github_cd_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:*",
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "*"
      }
    ]
  })
}

output "github_deploy_role_arn" {
  description = "ARN of the IAM Role for GitHub Actions CD deployment"
  value       = aws_iam_role.github_cd_deploy.arn
}
