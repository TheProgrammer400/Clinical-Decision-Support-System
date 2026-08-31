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

# GPU EC2 Instance for U-Net PyTorch Inference
resource "aws_instance" "mri_gpu" {
  ami                  = "ami-0c7217cdde317cfec" # Deep Learning AMI (Ubuntu 22.04)
  instance_type        = "g4dn.xlarge" # 1x NVIDIA T4 GPU (16GB VRAM)
  subnet_id            = aws_subnet.private_1.id
  vpc_security_group_ids = [aws_security_group.mri_gpu.id]
  iam_instance_profile = aws_iam_instance_profile.gpu_ec2_profile.name

  user_data = <<-EOF
              #!/bin/bash
              echo "Initializing CDSS GPU MRI Inference Instance..."
              docker run -d --gpus all --restart always -p 8000:8000 cdss-mri-inference:latest
              EOF

  tags = {
    Name = "cdss-mri-gpu-instance-${var.environment}"
  }
}
