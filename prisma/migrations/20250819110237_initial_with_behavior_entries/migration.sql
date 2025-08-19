-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('EMPLOYEE', 'CEO');

-- CreateEnum
CREATE TYPE "PDRStatus" AS ENUM ('Created', 'OPEN_FOR_REVIEW', 'PLAN_LOCKED', 'PDR_BOOKED', 'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'MID_YEAR_CHECK', 'END_YEAR_REVIEW', 'COMPLETED', 'LOCKED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PDR_LOCKED', 'PDR_SUBMITTED', 'PDR_REMINDER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "password_hash" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdr_periods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pdr_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdrs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "period_id" UUID,
    "fy_label" VARCHAR(20) NOT NULL,
    "fy_start_date" DATE NOT NULL,
    "fy_end_date" DATE NOT NULL,
    "status" "PDRStatus" NOT NULL DEFAULT 'Created',
    "employee_fields" JSONB,
    "ceo_fields" JSONB,
    "meeting_booked" BOOLEAN NOT NULL DEFAULT false,
    "meeting_booked_at" TIMESTAMP(3),
    "locked_at" TIMESTAMP(3),
    "locked_by" UUID,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pdrs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pdr_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "target_outcome" TEXT,
    "success_criteria" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "employee_progress" TEXT,
    "employee_rating" INTEGER,
    "ceo_comments" TEXT,
    "ceo_rating" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_values" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "behaviors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pdr_id" UUID NOT NULL,
    "value_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "examples" TEXT,
    "employee_self_assessment" TEXT,
    "employee_rating" INTEGER,
    "ceo_comments" TEXT,
    "ceo_rating" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "behaviors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "behavior_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pdr_id" UUID NOT NULL,
    "value_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "author_type" VARCHAR(20) NOT NULL,
    "description" TEXT NOT NULL,
    "examples" TEXT,
    "self_assessment" TEXT,
    "rating" INTEGER,
    "comments" TEXT,
    "employee_entry_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "behavior_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mid_year_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pdr_id" UUID NOT NULL,
    "progress_summary" TEXT NOT NULL,
    "blockers_challenges" TEXT,
    "support_needed" TEXT,
    "employee_comments" TEXT,
    "ceo_feedback" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mid_year_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "end_year_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pdr_id" UUID NOT NULL,
    "achievements_summary" TEXT NOT NULL,
    "learnings_growth" TEXT,
    "challenges_faced" TEXT,
    "next_year_goals" TEXT,
    "employee_overall_rating" INTEGER,
    "ceo_overall_rating" INTEGER,
    "ceo_final_comments" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "end_year_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "table_name" VARCHAR(50) NOT NULL,
    "record_id" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "changed_by" UUID,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "pdr_id" UUID,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "pdr_periods_name_key" ON "pdr_periods"("name");

-- CreateIndex
CREATE INDEX "pdrs_user_id_fy_label_idx" ON "pdrs"("user_id", "fy_label");

-- CreateIndex
CREATE INDEX "pdrs_status_idx" ON "pdrs"("status");

-- CreateIndex
CREATE INDEX "pdrs_fy_label_idx" ON "pdrs"("fy_label");

-- CreateIndex
CREATE INDEX "pdrs_meeting_booked_idx" ON "pdrs"("meeting_booked");

-- CreateIndex
CREATE UNIQUE INDEX "pdrs_user_id_fy_label_key" ON "pdrs"("user_id", "fy_label");

-- CreateIndex
CREATE INDEX "goals_pdr_id_idx" ON "goals"("pdr_id");

-- CreateIndex
CREATE INDEX "goals_priority_idx" ON "goals"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "company_values_name_key" ON "company_values"("name");

-- CreateIndex
CREATE INDEX "behaviors_pdr_id_idx" ON "behaviors"("pdr_id");

-- CreateIndex
CREATE INDEX "behaviors_value_id_idx" ON "behaviors"("value_id");

-- CreateIndex
CREATE INDEX "behavior_entries_pdr_id_idx" ON "behavior_entries"("pdr_id");

-- CreateIndex
CREATE INDEX "behavior_entries_value_id_idx" ON "behavior_entries"("value_id");

-- CreateIndex
CREATE INDEX "behavior_entries_author_id_idx" ON "behavior_entries"("author_id");

-- CreateIndex
CREATE INDEX "behavior_entries_employee_entry_id_idx" ON "behavior_entries"("employee_entry_id");

-- CreateIndex
CREATE INDEX "behavior_entries_author_type_idx" ON "behavior_entries"("author_type");

-- CreateIndex
CREATE UNIQUE INDEX "mid_year_reviews_pdr_id_key" ON "mid_year_reviews"("pdr_id");

-- CreateIndex
CREATE UNIQUE INDEX "end_year_reviews_pdr_id_key" ON "end_year_reviews"("pdr_id");

-- CreateIndex
CREATE INDEX "audit_logs_table_name_record_id_idx" ON "audit_logs"("table_name", "record_id");

-- CreateIndex
CREATE INDEX "audit_logs_changed_by_idx" ON "audit_logs"("changed_by");

-- CreateIndex
CREATE INDEX "audit_logs_changed_at_idx" ON "audit_logs"("changed_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- AddForeignKey
ALTER TABLE "pdrs" ADD CONSTRAINT "pdrs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdrs" ADD CONSTRAINT "pdrs_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "pdr_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdrs" ADD CONSTRAINT "pdrs_locked_by_fkey" FOREIGN KEY ("locked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_pdr_id_fkey" FOREIGN KEY ("pdr_id") REFERENCES "pdrs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behaviors" ADD CONSTRAINT "behaviors_pdr_id_fkey" FOREIGN KEY ("pdr_id") REFERENCES "pdrs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behaviors" ADD CONSTRAINT "behaviors_value_id_fkey" FOREIGN KEY ("value_id") REFERENCES "company_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavior_entries" ADD CONSTRAINT "behavior_entries_pdr_id_fkey" FOREIGN KEY ("pdr_id") REFERENCES "pdrs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavior_entries" ADD CONSTRAINT "behavior_entries_value_id_fkey" FOREIGN KEY ("value_id") REFERENCES "company_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavior_entries" ADD CONSTRAINT "behavior_entries_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavior_entries" ADD CONSTRAINT "behavior_entries_employee_entry_id_fkey" FOREIGN KEY ("employee_entry_id") REFERENCES "behavior_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mid_year_reviews" ADD CONSTRAINT "mid_year_reviews_pdr_id_fkey" FOREIGN KEY ("pdr_id") REFERENCES "pdrs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "end_year_reviews" ADD CONSTRAINT "end_year_reviews_pdr_id_fkey" FOREIGN KEY ("pdr_id") REFERENCES "pdrs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_pdr_id_fkey" FOREIGN KEY ("pdr_id") REFERENCES "pdrs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
