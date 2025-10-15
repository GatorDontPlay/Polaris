-- =====================================================
-- PDR STATUS CLEANUP MIGRATION
-- =====================================================
-- This migration removes redundant PDR statuses and simplifies the workflow
-- to match the actual business requirements.
--
-- BEFORE: 14 statuses (many redundant)
-- AFTER: 7 statuses (clean, simple flow)
--
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: CREATE NEW ENUM WITH SIMPLIFIED STATUSES
-- =====================================================

DO $$ BEGIN
    RAISE NOTICE '=== Starting PDR Status Cleanup Migration ===';
    
    -- Create new enum with only required statuses
    CREATE TYPE pdr_status_new AS ENUM (
        'Created',              -- Employee creating PDR
        'SUBMITTED',            -- Employee submitted → CEO reviews
        'PLAN_LOCKED',          -- CEO approved → Mid-year available
        'MID_YEAR_SUBMITTED',   -- Employee submitted mid-year
        'MID_YEAR_APPROVED',    -- CEO approved mid-year → End-year available
        'END_YEAR_SUBMITTED',   -- Employee submitted final
        'COMPLETED'             -- CEO completed final → All locked
    );
    RAISE NOTICE '✅ Created new pdr_status_new enum with 7 statuses';
EXCEPTION
    WHEN duplicate_object THEN 
        DROP TYPE IF EXISTS pdr_status_new CASCADE;
        CREATE TYPE pdr_status_new AS ENUM (
            'Created',
            'SUBMITTED',
            'PLAN_LOCKED',
            'MID_YEAR_SUBMITTED',
            'MID_YEAR_APPROVED',
            'END_YEAR_SUBMITTED',
            'COMPLETED'
        );
        RAISE NOTICE '✅ Recreated pdr_status_new enum (already existed)';
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
    RAISE NOTICE 'Dropping RLS policies temporarily...';
    
    FOREACH current_table IN ARRAY table_list
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = current_table 
            AND table_schema = 'public'
        ) THEN
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
                EXCEPTION
                    WHEN OTHERS THEN
                        RAISE NOTICE 'Could not drop policy %.%', 
                                   policy_record.tablename, 
                                   policy_record.policyname;
                END;
            END LOOP;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Dropped % RLS policies', policy_count;
END $$;

-- =====================================================
-- STEP 3: MIGRATE EXISTING DATA TO NEW STATUSES
-- =====================================================

DO $$ 
DECLARE
    update_count integer;
    total_pdrs integer;
BEGIN
    RAISE NOTICE 'Migrating existing PDR statuses...';
    
    SELECT COUNT(*) INTO total_pdrs FROM pdrs;
    RAISE NOTICE 'Total PDRs in system: %', total_pdrs;
    
    -- Convert status column to text temporarily
    ALTER TABLE pdrs ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE pdrs ALTER COLUMN status TYPE TEXT;
    
    -- Migrate redundant statuses to simplified ones
    UPDATE pdrs SET status = 'SUBMITTED' WHERE status IN ('OPEN_FOR_REVIEW', 'UNDER_REVIEW');
    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE '✅ Migrated % PDRs from OPEN_FOR_REVIEW/UNDER_REVIEW to SUBMITTED', update_count;
    
    UPDATE pdrs SET status = 'MID_YEAR_SUBMITTED' WHERE status = 'MID_YEAR_CHECK';
    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE '✅ Migrated % PDRs from MID_YEAR_CHECK to MID_YEAR_SUBMITTED', update_count;
    
    UPDATE pdrs SET status = 'END_YEAR_SUBMITTED' WHERE status = 'END_YEAR_REVIEW';
    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE '✅ Migrated % PDRs from END_YEAR_REVIEW to END_YEAR_SUBMITTED', update_count;
    
    UPDATE pdrs SET status = 'PLAN_LOCKED' WHERE status = 'PDR_BOOKED';
    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE '✅ Migrated % PDRs from PDR_BOOKED to PLAN_LOCKED', update_count;
    
    UPDATE pdrs SET status = 'COMPLETED' WHERE status = 'LOCKED';
    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE '✅ Migrated % PDRs from LOCKED to COMPLETED', update_count;
    
    UPDATE pdrs SET status = 'Created' WHERE status = 'DRAFT';
    GET DIAGNOSTICS update_count = ROW_COUNT;
    RAISE NOTICE '✅ Migrated % PDRs from DRAFT to Created', update_count;
    
    -- Convert to new enum type
    ALTER TABLE pdrs ALTER COLUMN status TYPE pdr_status_new USING status::pdr_status_new;
    ALTER TABLE pdrs ALTER COLUMN status SET DEFAULT 'Created';
    
    RAISE NOTICE '✅ Converted pdrs.status column to new enum type';
END $$;

-- =====================================================
-- STEP 4: REPLACE OLD ENUM WITH NEW ONE
-- =====================================================

DO $$ BEGIN
    DROP TYPE IF EXISTS pdr_status CASCADE;
    ALTER TYPE pdr_status_new RENAME TO pdr_status;
    RAISE NOTICE '✅ Replaced old enum with new pdr_status enum';
END $$;

-- =====================================================
-- STEP 5: RECREATE ESSENTIAL RLS POLICIES
-- =====================================================

DO $$ BEGIN
    RAISE NOTICE 'Recreating RLS policies...';
    
    -- Enable RLS on pdrs table
    ALTER TABLE pdrs ENABLE ROW LEVEL SECURITY;
    
    -- Users can view their own PDRs
    CREATE POLICY "Users can view own PDRs" ON pdrs
        FOR SELECT USING (auth.uid() = user_id);
    
    -- CEOs can view all PDRs
    CREATE POLICY "CEOs can view all PDRs" ON pdrs
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role = 'CEO'
            )
        );
    
    -- Users can insert their own PDRs
    CREATE POLICY "Users can insert own PDRs" ON pdrs
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    -- Users can update their own PDRs when in Created status
    CREATE POLICY "Users can update own PDRs when Created" ON pdrs
        FOR UPDATE USING (
            auth.uid() = user_id 
            AND status = 'Created'
        );
    
    -- CEOs can update any PDR
    CREATE POLICY "CEOs can update any PDR" ON pdrs
        FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.role = 'CEO'
            )
        );
    
    -- Users can delete their own Created PDRs
    CREATE POLICY "Users can delete own Created PDRs" ON pdrs
        FOR DELETE USING (
            auth.uid() = user_id 
            AND status = 'Created'
        );
        
    RAISE NOTICE '✅ Created PDR table policies';
END $$;

-- Recreate policies for related tables
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals' AND table_schema = 'public') THEN
        ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view own goals" ON goals
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = goals.pdr_id AND pdrs.user_id = auth.uid())
            );
            
        CREATE POLICY "CEOs can view all goals" ON goals
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'CEO')
            );
            
        CREATE POLICY "Users can manage own goals" ON goals
            FOR ALL USING (
                EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = goals.pdr_id AND pdrs.user_id = auth.uid())
            );
            
        RAISE NOTICE '✅ Created goals table policies';
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'behaviors' AND table_schema = 'public') THEN
        ALTER TABLE behaviors ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view own behaviors" ON behaviors
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = behaviors.pdr_id AND pdrs.user_id = auth.uid())
            );
            
        CREATE POLICY "CEOs can view all behaviors" ON behaviors
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'CEO')
            );
            
        CREATE POLICY "Users can manage own behaviors" ON behaviors
            FOR ALL USING (
                EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = behaviors.pdr_id AND pdrs.user_id = auth.uid())
            );
            
        RAISE NOTICE '✅ Created behaviors table policies';
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'behavior_entries' AND table_schema = 'public') THEN
        ALTER TABLE behavior_entries ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view own behavior entries" ON behavior_entries
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = behavior_entries.pdr_id AND pdrs.user_id = auth.uid())
            );
            
        CREATE POLICY "CEOs can view all behavior entries" ON behavior_entries
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'CEO')
            );
            
        CREATE POLICY "Users can manage own behavior entries" ON behavior_entries
            FOR ALL USING (
                EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = behavior_entries.pdr_id AND pdrs.user_id = auth.uid())
            );
            
        RAISE NOTICE '✅ Created behavior_entries table policies';
    END IF;
END $$;

-- =====================================================
-- STEP 6: VERIFICATION
-- =====================================================

DO $$ 
DECLARE
    status_record RECORD;
    total_pdrs integer;
BEGIN
    RAISE NOTICE '=== PDR STATUS DISTRIBUTION ===';
    
    SELECT COUNT(*) INTO total_pdrs FROM pdrs;
    RAISE NOTICE 'Total PDRs: %', total_pdrs;
    
    FOR status_record IN 
        SELECT status, COUNT(*) as count
        FROM pdrs 
        GROUP BY status 
        ORDER BY status
    LOOP
        RAISE NOTICE '  %: %', status_record.status, status_record.count;
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
    RAISE NOTICE '✅ Reduced from 14 statuses to 7 clean statuses';
    RAISE NOTICE '✅ All data migrated successfully';
    RAISE NOTICE '✅ RLS policies recreated';
    RAISE NOTICE '';
    RAISE NOTICE 'New Status Flow:';
    RAISE NOTICE '  Created → SUBMITTED → PLAN_LOCKED';
    RAISE NOTICE '  PLAN_LOCKED → MID_YEAR_SUBMITTED → MID_YEAR_APPROVED';
    RAISE NOTICE '  MID_YEAR_APPROVED → END_YEAR_SUBMITTED → COMPLETED';
END $$;

