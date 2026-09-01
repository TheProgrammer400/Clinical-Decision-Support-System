# Security Group for MRI Inference Service GPU EC2 Instance
resource "aws_security_group" "mri_gpu" {
  name        = "cdss-mri-gpu-sg"
  description = "Security group for GPU EC2 MRI inference instance (ingress from ECS backend only)"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "cdss-mri-gpu-sg"
  }
}

# IAM Role for EC2 ECR Access
resource "aws_iam_role" "gpu_ec2_role" {
  name = "cdss-gpu-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "gpu_ec2_ecr" {
  role       = aws_iam_role.gpu_ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_instance_profile" "gpu_ec2_profile" {
  name = "cdss-gpu-ec2-profile"
  role = aws_iam_role.gpu_ec2_role.name
}

# Query latest Ubuntu 22.04 LTS AMI dynamically for the configured AWS region
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Inference EC2 Instance for PyTorch (t3.micro Free Tier eligible)
resource "aws_instance" "mri_gpu" {
  ami                  = data.aws_ami.ubuntu.id
  instance_type        = "t3.micro"
  subnet_id            = aws_subnet.private_1.id
  vpc_security_group_ids = [aws_security_group.mri_gpu.id]
  iam_instance_profile = aws_iam_instance_profile.gpu_ec2_profile.name

  user_data = <<-EOF
              #!/bin/bash
              echo "Initializing CDSS MRI Inference Instance..."
              docker run -d -e ALLOW_CPU_FALLBACK="true" --restart always -p 8000:8000 cdss-mri-inference:latest
              EOF

  tags = {
    Name = "cdss-mri-gpu-instance-${var.environment}"
  }
}


