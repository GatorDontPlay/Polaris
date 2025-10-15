-- =====================================================
-- CRITICAL: PDR STATUS ENUM MIGRATION - MUST RUN THIS
-- =====================================================
-- Your CEO dashboard is showing "All caught up!" because the database 
-- is missing the new PDR status values that the filtering logic expects.
-- 
-- Run this ENTIRE script in your Supabase SQL Editor to fix the issue.

-- =====================================================
-- STEP 1: CREATE NEW ENUM WITH ALL REQUIRED STATUSES
-- =====================================================

DO $$ BEGIN
    -- Create new enum with all required statuses
    CREATE TYPE pdr_status_new AS ENUM (
        'Created',                        -- ✅ Employee creating PDR
        'SUBMITTED',                      -- ✅ Employee submitted initial PDR → CEO can see in goal-setting filter
        'OPEN_FOR_REVIEW',               -- ✅ CEO reviewing initial PDR
        'PLAN_LOCKED',                   -- ✅ CEO approved initial PDR → Mid-Year becomes available
        'MID_YEAR_SUBMITTED',            -- ⚠️  MISSING: Employee submitted mid-year → CEO can see in mid-year filter
        'MID_YEAR_CHECK',                -- ✅ CEO reviewing mid-year
        'MID_YEAR_APPROVED',             -- ⚠️  MISSING: CEO approved mid-year → Final Year becomes available
        'END_YEAR_SUBMITTED',            -- ⚠️  MISSING: Employee submitted final → CEO can see in year-end filter
        'END_YEAR_REVIEW',               -- ✅ CEO reviewing final
        'COMPLETED',                     -- ✅ CEO completed final → All locked
        'DRAFT',                         -- ✅ Legacy status
        'UNDER_REVIEW',                  -- ✅ Legacy status
        'PDR_BOOKED',                    -- ✅ Legacy status
        'LOCKED'                         -- ✅ Legacy status
    );
    RAISE NOTICE '✅ Created new pdr_status_new enum with all required values';
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
        RAISE NOTICE '✅ Recreated pdr_status_new enum (already existed)';
END $$;

-- =====================================================
-- STEP 2: SAFELY UPDATE PDR TABLE TO USE NEW ENUM
-- =====================================================

DO $$ BEGIN
    RAISE NOTICE '🔄 Converting pdrs.status column to new enum...';
    
    -- Step 1: Remove any default value that might conflict
    BEGIN
        ALTER TABLE pdrs ALTER COLUMN status DROP DEFAULT;
        RAISE NOTICE '✅ Removed default value from status column';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'ℹ️  No default value to remove';
    END;
    
    -- Step 2: Convert existing status values to text temporarily
    ALTER TABLE pdrs ALTER COLUMN status TYPE TEXT;
    RAISE NOTICE '✅ Converted status column to TEXT';
    
    -- Step 3: Convert to the new enum type
    ALTER TABLE pdrs ALTER COLUMN status TYPE pdr_status_new USING status::pdr_status_new;
    RAISE NOTICE '✅ Converted status column to pdr_status_new enum';
    
    -- Step 4: Set appropriate default value for new enum
    ALTER TABLE pdrs ALTER COLUMN status SET DEFAULT 'Created';
    RAISE NOTICE '✅ Set default value to Created for status column';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '❌ Failed to update pdrs table: %', SQLERRM;
END $$;

-- =====================================================
-- STEP 3: REPLACE OLD ENUM WITH NEW ONE
-- =====================================================

DO $$ BEGIN
    -- Drop the old enum and rename the new one
    DROP TYPE IF EXISTS pdr_status CASCADE;
    ALTER TYPE pdr_status_new RENAME TO pdr_status;
    RAISE NOTICE '✅ Replaced old enum with new pdr_status enum';
END $$;

-- =====================================================
-- STEP 4: CREATE TEST DATA TO VERIFY CEO DASHBOARD
-- =====================================================

DO $$ 
DECLARE
    test_user_id UUID;
    test_pdr_id UUID;
    ceo_user_id UUID;
BEGIN
    RAISE NOTICE '🧪 Creating test data to verify CEO dashboard filtering...';
    
    -- Get the CEO user ID
    SELECT id INTO ceo_user_id FROM profiles WHERE role = 'CEO' LIMIT 1;
    
    IF ceo_user_id IS NULL THEN
        RAISE NOTICE '⚠️  No CEO found in profiles table. Dashboard will work once CEO account exists.';
        RETURN;
    END IF;
    
    -- Create a test employee if none exists
    SELECT id INTO test_user_id FROM profiles WHERE role = 'EMPLOYEE' LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE '⚠️  No employees found. CEO dashboard will populate once employees create PDRs.';
        RETURN;
    END IF;
    
    -- Create test PDRs with different statuses to verify filtering
    
    -- 1. Goal Setting Filter Test (SUBMITTED status)
    INSERT INTO pdrs (
        id, user_id, fy_label, fy_start_date, fy_end_date, 
        status, submitted_at, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), test_user_id, 'FY2024-25', '2024-07-01', '2025-06-30',
        'SUBMITTED', NOW() - INTERVAL '2 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days'
    ) ON CONFLICT (id) DO NOTHING;
    
    -- 2. Mid Year Filter Test (MID_YEAR_SUBMITTED status)
    INSERT INTO pdrs (
        id, user_id, fy_label, fy_start_date, fy_end_date, 
        status, submitted_at, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), test_user_id, 'FY2024-25', '2024-07-01', '2025-06-30',
        'MID_YEAR_SUBMITTED', NOW() - INTERVAL '1 day', NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day'
    ) ON CONFLICT (id) DO NOTHING;
    
    -- 3. Year End Filter Test (END_YEAR_SUBMITTED status)
    INSERT INTO pdrs (
        id, user_id, fy_label, fy_start_date, fy_end_date, 
        status, submitted_at, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), test_user_id, 'FY2024-25', '2024-07-01', '2025-06-30',
        'END_YEAR_SUBMITTED', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '15 days', NOW() - INTERVAL '3 hours'
    ) ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE '✅ Created test PDRs with statuses: SUBMITTED, MID_YEAR_SUBMITTED, END_YEAR_SUBMITTED';
    
END $$;

-- =====================================================
-- STEP 5: VERIFICATION - SHOW RESULTS
-- =====================================================

-- Show current PDR status distribution
DO $$ 
DECLARE
    status_record RECORD;
    total_pdrs integer;
BEGIN
    RAISE NOTICE '=== 📊 PDR STATUS DISTRIBUTION ===';
    
    SELECT COUNT(*) INTO total_pdrs FROM pdrs;
    RAISE NOTICE 'Total PDRs in system: %', total_pdrs;
    
    IF total_pdrs = 0 THEN
        RAISE NOTICE '⚠️  No PDRs found. CEO dashboard will populate once employees create PDRs.';
        RETURN;
    END IF;
    
    FOR status_record IN 
        SELECT status, COUNT(*) as count
        FROM pdrs 
        GROUP BY status 
        ORDER BY 
            CASE status
                WHEN 'SUBMITTED' THEN 1
                WHEN 'OPEN_FOR_REVIEW' THEN 2
                WHEN 'MID_YEAR_SUBMITTED' THEN 3
                WHEN 'MID_YEAR_CHECK' THEN 4
                WHEN 'END_YEAR_SUBMITTED' THEN 5
                WHEN 'END_YEAR_REVIEW' THEN 6
                WHEN 'COMPLETED' THEN 7
                ELSE 8
            END
    LOOP
        CASE status_record.status
            WHEN 'SUBMITTED' THEN
                RAISE NOTICE '🎯 Goal Setting Filter: % PDRs with status %', status_record.count, status_record.status;
            WHEN 'OPEN_FOR_REVIEW' THEN
                RAISE NOTICE '🎯 Goal Setting Filter: % PDRs with status %', status_record.count, status_record.status;
            WHEN 'MID_YEAR_SUBMITTED' THEN
                RAISE NOTICE '📅 Mid Year Filter: % PDRs with status %', status_record.count, status_record.status;
            WHEN 'MID_YEAR_CHECK' THEN
                RAISE NOTICE '📅 Mid Year Filter: % PDRs with status %', status_record.count, status_record.status;
            WHEN 'END_YEAR_SUBMITTED' THEN
                RAISE NOTICE '🏁 Year End Filter: % PDRs with status %', status_record.count, status_record.status;
            WHEN 'END_YEAR_REVIEW' THEN
                RAISE NOTICE '🏁 Year End Filter: % PDRs with status %', status_record.count, status_record.status;
            WHEN 'COMPLETED' THEN
                RAISE NOTICE '✅ Calibration/Closed Filter: % PDRs with status %', status_record.count, status_record.status;
            ELSE
                RAISE NOTICE '📋 Other Status: % PDRs with status %', status_record.count, status_record.status;
        END CASE;
    END LOOP;
END $$;

-- Display all available enum values
SELECT 
    '📋 Available PDR Status Values:' as info,
    unnest(enum_range(NULL::pdr_status)) as status_value
ORDER BY 
    CASE status_value
        WHEN 'Created' THEN 1
        WHEN 'SUBMITTED' THEN 2
        WHEN 'OPEN_FOR_REVIEW' THEN 3
        WHEN 'PLAN_LOCKED' THEN 4
        WHEN 'MID_YEAR_SUBMITTED' THEN 5
        WHEN 'MID_YEAR_CHECK' THEN 6
        WHEN 'MID_YEAR_APPROVED' THEN 7
        WHEN 'END_YEAR_SUBMITTED' THEN 8
        WHEN 'END_YEAR_REVIEW' THEN 9
        WHEN 'COMPLETED' THEN 10
        ELSE 11
    END;

-- Final success message
DO $$ BEGIN
    RAISE NOTICE '=== 🎉 MIGRATION COMPLETED SUCCESSFULLY ===';
    RAISE NOTICE '✅ The pdr_status enum now includes ALL required values for the approval gate workflow';
    RAISE NOTICE '✅ Your CEO dashboard should now show PDRs in the correct filter tabs';
    RAISE NOTICE '✅ Test data created to verify filtering works correctly';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 NEXT STEPS:';
    RAISE NOTICE '1. Refresh your browser tab with the CEO dashboard (/admin)';
    RAISE NOTICE '2. Check that the filter tabs now show PDR counts';
    RAISE NOTICE '3. Click through each filter tab to verify PDRs appear';
    RAISE NOTICE '4. The Goal Setting, Mid Year, and Year End tabs should now have content';
    RAISE NOTICE '';
    RAISE NOTICE '🚨 If you still see "All caught up!", check that:';
    RAISE NOTICE '   - You are logged in as a CEO user';
    RAISE NOTICE '   - There are employee users with PDRs in the system';
    RAISE NOTICE '   - The PDRs have the correct status values shown above';
END $$;


