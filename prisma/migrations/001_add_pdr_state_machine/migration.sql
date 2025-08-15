-- Migration: Add PDR state machine with Australian FY support and notifications
-- 
-- This migration adds:
-- 1. New PDR status values for state machine
-- 2. Australian Financial Year tracking fields
-- 3. CEO fields for mirrored review data
-- 4. Meeting booking functionality
-- 5. Notification system for PDR updates

-- Add new PDR status values
ALTER TYPE "PDRStatus" ADD VALUE 'Created';
ALTER TYPE "PDRStatus" ADD VALUE 'OPEN_FOR_REVIEW';
ALTER TYPE "PDRStatus" ADD VALUE 'PLAN_LOCKED';
ALTER TYPE "PDRStatus" ADD VALUE 'PDR_BOOKED';

-- Create notification type enum
CREATE TYPE "NotificationType" AS ENUM ('PDR_LOCKED', 'PDR_SUBMITTED', 'PDR_REMINDER');

-- Add new columns to PDR table
ALTER TABLE "pdrs" 
  ADD COLUMN "fy_label" VARCHAR(20),
  ADD COLUMN "fy_start_date" DATE,
  ADD COLUMN "fy_end_date" DATE,
  ADD COLUMN "employee_fields" JSONB,
  ADD COLUMN "ceo_fields" JSONB,
  ADD COLUMN "meeting_booked" BOOLEAN DEFAULT false,
  ADD COLUMN "meeting_booked_at" TIMESTAMP,
  ADD COLUMN "locked_at" TIMESTAMP,
  ADD COLUMN "locked_by" UUID;

-- Make period_id nullable (since we're using FY tracking instead)
ALTER TABLE "pdrs" ALTER COLUMN "period_id" DROP NOT NULL;

-- Update default status to 'Created'
ALTER TABLE "pdrs" ALTER COLUMN "status" SET DEFAULT 'Created';

-- Create notifications table
CREATE TABLE "notifications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "pdr_id" UUID,
  "type" "NotificationType" NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT NOT NULL,
  "read_at" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT now() NOT NULL,
  
  CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "notifications_pdr_id_fkey" FOREIGN KEY ("pdr_id") REFERENCES "pdrs"("id") ON DELETE CASCADE
);

-- Add foreign key for locked_by
ALTER TABLE "pdrs" ADD CONSTRAINT "pdrs_locked_by_fkey" FOREIGN KEY ("locked_by") REFERENCES "users"("id");

-- Drop the old unique constraint and add new one
ALTER TABLE "pdrs" DROP CONSTRAINT "pdrs_user_id_period_id_key";
ALTER TABLE "pdrs" ADD CONSTRAINT "pdrs_user_id_fy_label_key" UNIQUE ("user_id", "fy_label");

-- Add new indexes
CREATE INDEX "pdrs_fy_label_idx" ON "pdrs"("fy_label");
CREATE INDEX "pdrs_meeting_booked_idx" ON "pdrs"("meeting_booked");
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- Populate FY fields for existing PDRs (if any)
-- This assumes Australian timezone and computes FY based on created_at
UPDATE "pdrs" 
SET 
  "fy_label" = CASE 
    WHEN EXTRACT(MONTH FROM "created_at") >= 7 THEN 
      EXTRACT(YEAR FROM "created_at")::text || '-' || (EXTRACT(YEAR FROM "created_at") + 1)::text
    ELSE 
      (EXTRACT(YEAR FROM "created_at") - 1)::text || '-' || EXTRACT(YEAR FROM "created_at")::text
  END,
  "fy_start_date" = CASE 
    WHEN EXTRACT(MONTH FROM "created_at") >= 7 THEN 
      DATE(EXTRACT(YEAR FROM "created_at") || '-07-01')
    ELSE 
      DATE((EXTRACT(YEAR FROM "created_at") - 1) || '-07-01')
  END,
  "fy_end_date" = CASE 
    WHEN EXTRACT(MONTH FROM "created_at") >= 7 THEN 
      DATE((EXTRACT(YEAR FROM "created_at") + 1) || '-06-30')
    ELSE 
      DATE(EXTRACT(YEAR FROM "created_at") || '-06-30')
  END
WHERE "fy_label" IS NULL;

-- Make FY fields NOT NULL after populating
ALTER TABLE "pdrs" ALTER COLUMN "fy_label" SET NOT NULL;
ALTER TABLE "pdrs" ALTER COLUMN "fy_start_date" SET NOT NULL;
ALTER TABLE "pdrs" ALTER COLUMN "fy_end_date" SET NOT NULL;
