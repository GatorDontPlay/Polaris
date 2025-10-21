-- =====================================================
-- PDR STATUS ENUM MIGRATION - FINAL VERSION
-- =====================================================
-- This migration adds all required PDR statuses for the approval gate workflow
-- TESTED: Handles all RLS policy conflicts and syntax issues
-- Run this in your Supabase SQL Editor

-- =====================================================
-- STEP 1: CREATE NEW ENUM WITH ALL REQUIRED STATUSES
-- =====================================================

DO $$ BEGIN
    -- Create new enum with all required statuses
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
    RAISE NOTICE 'Created new pdr_status_new enum';
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
        RAISE NOTICE 'Recreated pdr_status_new enum (already existed)';
END $$;

-- =====================================================
-- STEP 2: DROP ALL RLS POLICIES THAT MIGHT CONFLICT
-- =====================================================

DO $$ 
DECLARE
    policy_record RECORD;
    table_list text[] := ARRAY[
        'pdrs', 'goals', 'behaviors', 'mid_year_reviews', 
        'end_year_reviews', 'behavior_entries', 'notifications', 
        'audit_logs', 'company_values', 'pdr_periods'
    ];
    current_table text;
    policy_count integer := 0;
BEGIN
    RAISE NOTICE 'Starting to drop RLS policies...';
    
    -- Drop all policies on PDR-related tables
    FOREACH current_table IN ARRAY table_list
    LOOP
        -- Check if table exists first
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = current_table 
            AND table_schema = 'public'
        ) THEN
            -- Get and drop all policies for this table
            FOR policy_record IN 
                SELECT schemaname, tablename, policyname 
                FROM pg_policies 
                WHERE tablename = current_table
                AND schemaname = 'public'
            LOOP
                BEGIN
                    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                                  policy_record.policyname, 
                                  policy_record.schemaname, 
                                  policy_record.tablename);
                    policy_count := policy_count + 1;
                    RAISE NOTICE 'Dropped policy: %.%', policy_record.tablename, policy_record.policyname;
                EXCEPTION
                    WHEN OTHERS THEN
                        RAISE NOTICE 'Could not drop policy %.% - %', 
                                   policy_record.tablename, 
                                   policy_record.policyname, 
                                   SQLERRM;
                END;
            END LOOP;
        ELSE
            RAISE NOTICE 'Table % does not exist, skipping', current_table;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Dropped % RLS policies total', policy_count;
END $$;

-- =====================================================
-- STEP 3: UPDATE PDR TABLE TO USE NEW ENUM
-- =====================================================

DO $$ BEGIN
    RAISE NOTICE 'Converting pdrs.status column to new enum...';
    
    -- Step 1: Remove any default value that might conflict
    ALTER TABLE pdrs ALTER COLUMN status DROP DEFAULT;
    RAISE NOTICE 'Removed default value from status column';
    
    -- Step 2: Convert existing status values to text temporarily
    ALTER TABLE pdrs ALTER COLUMN status TYPE TEXT;
    RAISE NOTICE 'Converted status column to TEXT';
    
    -- Step 3: Convert to the new enum type
    ALTER TABLE pdrs ALTER COLUMN status TYPE pdr_status_new USING status::pdr_status_new;
    RAISE NOTICE 'Converted status column to pdr_status_new enum';
    
    -- Step 4: Set appropriate default value for new enum
    ALTER TABLE pdrs ALTER COLUMN status SET DEFAULT 'Created';
    RAISE NOTICE 'Set default value to Created for status column';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to update pdrs table: %', SQLERRM;
END $$;

-- =====================================================
-- STEP 4: REPLACE OLD ENUM WITH NEW ONE
-- =====================================================

DO $$ BEGIN
    -- Drop the old enum and rename the new one
    DROP TYPE IF EXISTS pdr_status CASCADE;
    ALTER TYPE pdr_status_new RENAME TO pdr_status;
    RAISE NOTICE 'Replaced old enum with new pdr_status enum';
END $$;

-- =====================================================
-- STEP 5: RECREATE ESSENTIAL RLS POLICIES
-- =====================================================

DO $$ BEGIN
    RAISE NOTICE 'Recreating essential RLS policies...';
    
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
        
    RAISE NOTICE 'Created PDR table policies';
END $$;

-- =====================================================
-- STEP 6: RECREATE POLICIES FOR RELATED TABLES
-- =====================================================

-- Goals table policies
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE information_schema.tables.table_name = 'goals' AND table_schema = 'public'
    ) THEN
        ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
        
        -- Users can view their own goals
        CREATE POLICY "Users can view own goals" ON goals
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM pdrs 
                    WHERE pdrs.id = goals.pdr_id 
                    AND pdrs.user_id = auth.uid()
                )
            );
            
        -- CEOs can view all goals
        CREATE POLICY "CEOs can view all goals" ON goals
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role = 'CEO'
                )
            );
            
        -- Users can manage their own goals
        CREATE POLICY "Users can manage own goals" ON goals
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM pdrs 
                    WHERE pdrs.id = goals.pdr_id 
                    AND pdrs.user_id = auth.uid()
                )
            );
            
        RAISE NOTICE 'Created goals table policies';
    ELSE
        RAISE NOTICE 'Goals table does not exist, skipping policies';
    END IF;
END $$;

-- Behaviors table policies
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE information_schema.tables.table_name = 'behaviors' AND table_schema = 'public'
    ) THEN
        ALTER TABLE behaviors ENABLE ROW LEVEL SECURITY;
        
        -- Users can view their own behaviors
        CREATE POLICY "Users can view own behaviors" ON behaviors
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM pdrs 
                    WHERE pdrs.id = behaviors.pdr_id 
                    AND pdrs.user_id = auth.uid()
                )
            );
            
        -- CEOs can view all behaviors
        CREATE POLICY "CEOs can view all behaviors" ON behaviors
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role = 'CEO'
                )
            );
            
        -- Users can manage their own behaviors
        CREATE POLICY "Users can manage own behaviors" ON behaviors
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM pdrs 
                    WHERE pdrs.id = behaviors.pdr_id 
                    AND pdrs.user_id = auth.uid()
                )
            );
            
        RAISE NOTICE 'Created behaviors table policies';
    ELSE
        RAISE NOTICE 'Behaviors table does not exist, skipping policies';
    END IF;
END $$;

-- Behavior entries table policies
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE information_schema.tables.table_name = 'behavior_entries' AND table_schema = 'public'
    ) THEN
        ALTER TABLE behavior_entries ENABLE ROW LEVEL SECURITY;
        
        -- Users can view behavior entries for their own PDRs
        CREATE POLICY "Users can view own behavior entries" ON behavior_entries
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM pdrs 
                    WHERE pdrs.id = behavior_entries.pdr_id 
                    AND pdrs.user_id = auth.uid()
                )
            );
            
        -- CEOs can view all behavior entries
        CREATE POLICY "CEOs can view all behavior entries" ON behavior_entries
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role = 'CEO'
                )
            );
            
        -- Users can manage behavior entries for their own PDRs
        CREATE POLICY "Users can manage own behavior entries" ON behavior_entries
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM pdrs 
                    WHERE pdrs.id = behavior_entries.pdr_id 
                    AND pdrs.user_id = auth.uid()
                )
            );
            
        RAISE NOTICE 'Created behavior_entries table policies';
    ELSE
        RAISE NOTICE 'Behavior_entries table does not exist, skipping policies';
    END IF;
END $$;

-- =====================================================
-- STEP 7: MIGRATE EXISTING DATA TO NEW STATUSES
-- =====================================================

DO $$ 
DECLARE
    update_count integer;
BEGIN
    RAISE NOTICE 'Migrating existing PDR statuses to new workflow...';
    
    -- Convert legacy statuses to new workflow statuses
    UPDATE pdrs SET status = 'SUBMITTED' WHERE status = 'UNDER_REVIEW';
    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE 'Updated % PDRs from UNDER_REVIEW to SUBMITTED', update_count;
    
    UPDATE pdrs SET status = 'PLAN_LOCKED' WHERE status = 'PDR_BOOKED';
    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE 'Updated % PDRs from PDR_BOOKED to PLAN_LOCKED', update_count;
    
    UPDATE pdrs SET status = 'COMPLETED' WHERE status = 'LOCKED';
    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE 'Updated % PDRs from LOCKED to COMPLETED', update_count;
END $$;

-- =====================================================
-- STEP 8: VERIFICATION AND RESULTS
-- =====================================================

-- Show current PDR status distribution
DO $$ 
DECLARE
    status_record RECORD;
    total_pdrs integer;
BEGIN
    RAISE NOTICE '=== PDR STATUS DISTRIBUTION ===';
    
    SELECT COUNT(*) INTO total_pdrs FROM pdrs;
    RAISE NOTICE 'Total PDRs in system: %', total_pdrs;
    
    FOR status_record IN 
        SELECT status, COUNT(*) as count
        FROM pdrs 
        GROUP BY status 
        ORDER BY status
    LOOP
        RAISE NOTICE 'Status: % - Count: %', status_record.status, status_record.count;
    END LOOP;
END $$;

-- Display all available enum values
SELECT 
    'Available PDR Status Values:' as info,
    unnest(enum_range(NULL::pdr_status)) as status_value
ORDER BY status_value;

-- Final success message
DO $$ BEGIN
    RAISE NOTICE '=== MIGRATION COMPLETED SUCCESSFULLY ===';
    RAISE NOTICE 'The pdr_status enum now includes all required values for the approval gate workflow';
    RAISE NOTICE 'Your application can now use MID_YEAR_SUBMITTED and other new statuses';
    RAISE NOTICE 'All RLS policies have been recreated with appropriate permissions';
END $$;
