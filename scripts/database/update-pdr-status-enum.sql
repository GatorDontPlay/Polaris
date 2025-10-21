-- =====================================================
-- UPDATE PDR STATUS ENUM FOR APPROVAL GATE WORKFLOW
-- =====================================================
-- This migration adds the new PDR statuses required for the approval gate workflow
-- Run this in your Supabase SQL Editor

-- Add new status values to the existing pdr_status enum
-- Note: PostgreSQL doesn't allow modifying enums directly, so we need to:
-- 1. Create a new enum with all values
-- 2. Update the column to use the new enum
-- 3. Drop the old enum

-- Step 1: Create new enum with all required statuses
DO $$ BEGIN
    CREATE TYPE pdr_status_new AS ENUM (
        'Created',                        -- Employee creating PDR
        'SUBMITTED',                      -- Employee submitted initial PDR → CEO can see in goal-setting filter
        'OPEN_FOR_REVIEW',               -- CEO reviewing initial PDR
        'PLAN_LOCKED',                   -- CEO approved initial PDR → Mid-Year becomes available
        'MID_YEAR_SUBMITTED',            -- Employee submitted mid-year → CEO can see in mid-year filter
        'MID_YEAR_CHECK',                -- CEO reviewing mid-year
        'MID_YEAR_APPROVED',             -- CEO approved mid-year → Final Year becomes available
        'END_YEAR_SUBMITTED',            -- Employee submitted final → CEO can see in year-end filter
        'END_YEAR_REVIEW',               -- CEO reviewing final
        'COMPLETED',                     -- CEO completed final → All locked
        'DRAFT',                         -- Legacy status
        'UNDER_REVIEW',                  -- Legacy status
        'PDR_BOOKED',                    -- Legacy status
        'LOCKED'                         -- Legacy status
    );
EXCEPTION
    WHEN duplicate_object THEN 
        -- If enum already exists, drop it and recreate
        DROP TYPE IF EXISTS pdr_status_new CASCADE;
        CREATE TYPE pdr_status_new AS ENUM (
            'Created',
            'SUBMITTED',
            'OPEN_FOR_REVIEW',
            'PLAN_LOCKED',
            'MID_YEAR_SUBMITTED',
            'MID_YEAR_CHECK',
            'MID_YEAR_APPROVED',
            'END_YEAR_SUBMITTED',
            'END_YEAR_REVIEW',
            'COMPLETED',
            'DRAFT',
            'UNDER_REVIEW',
            'PDR_BOOKED',
            'LOCKED'
        );
END $$;

-- Step 2: Drop RLS policies that depend on the status column
-- We'll recreate them after the enum update
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Get all policies on pdrs table that might reference the status column
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE tablename = 'pdrs' 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      policy_record.policyname, 
                      policy_record.schemaname, 
                      policy_record.tablename);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Step 3: Update the pdrs table to use the new enum
-- First, convert existing status values to text temporarily
ALTER TABLE pdrs ALTER COLUMN status TYPE TEXT;

-- Then convert to the new enum type
ALTER TABLE pdrs ALTER COLUMN status TYPE pdr_status_new USING status::pdr_status_new;

-- Step 4: Drop the old enum and rename the new one
DROP TYPE IF EXISTS pdr_status CASCADE;
ALTER TYPE pdr_status_new RENAME TO pdr_status;

-- Step 5: Recreate essential RLS policies
-- Enable RLS on pdrs table
ALTER TABLE pdrs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own PDRs
CREATE POLICY "Users can view own PDRs" ON pdrs
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: CEOs can view all PDRs
CREATE POLICY "CEOs can view all PDRs" ON pdrs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'CEO'
        )
    );

-- Policy: Users can insert their own PDRs
CREATE POLICY "Users can insert own PDRs" ON pdrs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own PDRs when not locked
CREATE POLICY "Users can update own PDRs when not locked" ON pdrs
    FOR UPDATE USING (
        auth.uid() = user_id 
        AND (is_locked = false OR is_locked IS NULL)
        AND status IN ('Created', 'DRAFT', 'SUBMITTED')
    );

-- Policy: CEOs can update any PDR
CREATE POLICY "CEOs can update any PDR" ON pdrs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'CEO'
        )
    );

-- Policy: Users can delete their own DRAFT PDRs
CREATE POLICY "Users can delete own DRAFT PDRs" ON pdrs
    FOR DELETE USING (
        auth.uid() = user_id 
        AND status IN ('Created', 'DRAFT')
    );

-- Step 6: Update any existing PDRs to use appropriate statuses for the new workflow
-- Convert legacy statuses to new workflow statuses
UPDATE pdrs SET status = 'SUBMITTED' WHERE status = 'UNDER_REVIEW';
UPDATE pdrs SET status = 'PLAN_LOCKED' WHERE status = 'PDR_BOOKED';
UPDATE pdrs SET status = 'COMPLETED' WHERE status = 'LOCKED';

-- Step 7: Verify the update
SELECT 
    status, 
    COUNT(*) as count,
    ARRAY_AGG(DISTINCT CONCAT(user_id, ' (', id, ')')) as examples
FROM pdrs 
GROUP BY status 
ORDER BY status;

-- Display the new enum values
SELECT unnest(enum_range(NULL::pdr_status)) as available_statuses;
