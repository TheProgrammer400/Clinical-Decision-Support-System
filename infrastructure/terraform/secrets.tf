resource "aws_secretsmanager_secret" "groq_key" {
  name                    = "cdss/${var.environment}/groq_api_key"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "groq_key" {
  secret_id     = aws_secretsmanager_secret.groq_key.id
  secret_string = var.groq_api_key
}

resource "aws_secretsmanager_secret" "db_url" {
  name                    = "cdss/${var.environment}/database_url"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "db_url" {
  secret_id     = aws_secretsmanager_secret.db_url.id
  secret_string = "postgresql://${aws_db_instance.postgres.username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/${aws_db_instance.postgres.db_name}?schema=public"
}
