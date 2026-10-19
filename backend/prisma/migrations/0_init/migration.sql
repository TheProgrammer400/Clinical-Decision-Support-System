-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DOCTOR', 'ORG_ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('SUCCESS', 'VALIDATION_FAILED', 'GROQ_ERROR');

-- CreateEnum
CREATE TYPE "FeedbackRating" AS ENUM ('HELPFUL', 'PARTIALLY_HELPFUL', 'NOT_HELPFUL');

-- CreateEnum
CREATE TYPE "MriStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'DOCTOR',
    "account_status" "AccountStatus" NOT NULL DEFAULT 'APPROVED',
    "full_name" TEXT NOT NULL,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "refresh_token_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_cases" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "idempotency_key" TEXT,
    "case_text" TEXT NOT NULL,
    "patient_context" JSONB,
    "status" "CaseStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mri_analyses" (
    "id" TEXT NOT NULL,
    "clinical_case_id" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "original_image_key" TEXT NOT NULL,
    "mask_image_key" TEXT,
    "overlay_image_key" TEXT,
    "findings" JSONB,
    "model_version" TEXT NOT NULL DEFAULT 'unet_v1.2.0',
    "status" "MriStatus" NOT NULL DEFAULT 'PROCESSING',
    "error_message" TEXT,
    "processing_time_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mri_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_analyses" (
    "id" TEXT NOT NULL,
    "clinical_case_id" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "response_json" JSONB,
    "raw_token_usage" JSONB,
    "latency_ms" INTEGER,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'SUCCESS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_feedbacks" (
    "id" TEXT NOT NULL,
    "clinical_analysis_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "rating" "FeedbackRating" NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "metadata" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_cases_idempotency_key_key" ON "clinical_cases"("idempotency_key");

-- CreateIndex
CREATE INDEX "clinical_cases_doctor_id_created_at_idx" ON "clinical_cases"("doctor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "clinical_cases_organization_id_idx" ON "clinical_cases"("organization_id");

-- CreateIndex
CREATE INDEX "mri_analyses_clinical_case_id_idx" ON "mri_analyses"("clinical_case_id");

-- CreateIndex
CREATE INDEX "mri_analyses_status_idx" ON "mri_analyses"("status");

-- CreateIndex
CREATE INDEX "clinical_analyses_clinical_case_id_idx" ON "clinical_analyses"("clinical_case_id");

-- CreateIndex
CREATE INDEX "doctor_feedbacks_clinical_analysis_id_idx" ON "doctor_feedbacks"("clinical_analysis_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_cases" ADD CONSTRAINT "clinical_cases_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_cases" ADD CONSTRAINT "clinical_cases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mri_analyses" ADD CONSTRAINT "mri_analyses_clinical_case_id_fkey" FOREIGN KEY ("clinical_case_id") REFERENCES "clinical_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_analyses" ADD CONSTRAINT "clinical_analyses_clinical_case_id_fkey" FOREIGN KEY ("clinical_case_id") REFERENCES "clinical_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_feedbacks" ADD CONSTRAINT "doctor_feedbacks_clinical_analysis_id_fkey" FOREIGN KEY ("clinical_analysis_id") REFERENCES "clinical_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_feedbacks" ADD CONSTRAINT "doctor_feedbacks_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

