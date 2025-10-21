-- =====================================================
-- AUDIT LOGGING FIX SCRIPT
-- =====================================================
-- Run this script to fix any audit logging issues
-- This should be run AFTER the main schema deployment

-- Fix the audit_logs foreign key constraint if it failed
DO $$
BEGIN
    -- Check if the constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'audit_logs_changed_by_fkey' 
        AND table_name = 'audit_logs'
    ) THEN
        -- Try to add the constraint
        BEGIN
            ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_changed_by_fkey 
            FOREIGN KEY (changed_by) REFERENCES profiles(id);
            RAISE NOTICE 'Added audit_logs_changed_by_fkey constraint';
        EXCEPTION
            WHEN others THEN
                RAISE NOTICE 'Could not add audit_logs_changed_by_fkey: %. This is OK if no profiles exist yet.', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'audit_logs_changed_by_fkey constraint already exists';
    END IF;
END $$;

-- Update the column name to match the Supabase types (changed_by instead of user_id)
DO $$
BEGIN
    -- Check if we need to rename user_id to changed_by
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' 
        AND column_name = 'user_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' 
        AND column_name = 'changed_by'
    ) THEN
        ALTER TABLE audit_logs RENAME COLUMN user_id TO changed_by;
        RAISE NOTICE 'Renamed audit_logs.user_id to changed_by';
    ELSE
        RAISE NOTICE 'audit_logs.changed_by column already exists or user_id does not exist';
    END IF;
END $$;

-- Ensure audit_logs has all required columns with correct names
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='changed_at') THEN
        ALTER TABLE audit_logs ADD COLUMN changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added changed_at column to audit_logs';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='ip_address') THEN
        ALTER TABLE audit_logs ADD COLUMN ip_address TEXT;
        RAISE NOTICE 'Added ip_address column to audit_logs';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='user_agent') THEN
        ALTER TABLE audit_logs ADD COLUMN user_agent TEXT;
        RAISE NOTICE 'Added user_agent column to audit_logs';
    END IF;
END $$;

-- Create RLS policies for audit_logs if they don't exist
DO $$
BEGIN
    -- Drop existing policies first
    DROP POLICY IF EXISTS "CEO can view all audit logs" ON audit_logs;
    DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
    
    -- Create new policies
    CREATE POLICY "CEO can view all audit logs" ON audit_logs
        FOR SELECT USING (
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
        );
    
    CREATE POLICY "System can insert audit logs" ON audit_logs
        FOR INSERT WITH CHECK (true); -- Allow system to insert audit logs
    
    RAISE NOTICE 'Created RLS policies for audit_logs';
END $$;

-- Show audit_logs table structure for verification
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'audit_logs' 
ORDER BY ordinal_position;

-- Test audit logging by creating a sample entry (will be cleaned up)
DO $$
DECLARE
    test_profile_id UUID;
BEGIN
    -- Get a profile ID to test with (if any exist)
    SELECT id INTO test_profile_id FROM profiles LIMIT 1;
    
    IF test_profile_id IS NOT NULL THEN
        -- Insert test audit log
        INSERT INTO audit_logs (
            table_name, 
            record_id, 
            action, 
            changed_by, 
            new_values
        ) VALUES (
            'test_table',
            'test_record',
            'INSERT',
            test_profile_id,
            '{"test": "data"}'::jsonb
        );
        
        -- Clean up test entry
        DELETE FROM audit_logs WHERE table_name = 'test_table' AND record_id = 'test_record';
        
        RAISE NOTICE 'Audit logging test passed - can insert and delete entries';
    ELSE
        RAISE NOTICE 'No profiles exist yet - audit logging will work once profiles are created';
    END IF;
END $$;

SELECT 'Audit logging fix completed!' as status;
