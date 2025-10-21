-- =====================================================
-- FIX AUDIT LOGS TABLE FOR ACTIVITY FEED
-- =====================================================
-- This script creates/fixes the audit_logs table to enable
-- the Organization-wide Activity feed on the CEO dashboard.
--
-- Run this in Supabase SQL Editor
-- =====================================================

-- Check if table exists first
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
    RAISE NOTICE 'audit_logs table does not exist. Creating...';
  ELSE
    RAISE NOTICE 'audit_logs table exists. Verifying structure...';
  END IF;
END $$;

-- Create audit_logs table with correct structure
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record 
  ON audit_logs(table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at 
  ON audit_logs(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by 
  ON audit_logs(changed_by);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name 
  ON audit_logs(table_name);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "CEO can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_logs;

-- Create RLS policies

-- CEO can view all audit logs (for dashboard activity feed)
CREATE POLICY "CEO can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'CEO'
    )
  );

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (changed_by = auth.uid());

-- Allow authenticated users to insert audit logs (for API routes)
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Verify the setup
DO $$
DECLARE
  table_count INTEGER;
  index_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Check table
  SELECT COUNT(*) INTO table_count
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'audit_logs';
  
  -- Check indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = 'audit_logs';
  
  -- Check policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'audit_logs';
  
  RAISE NOTICE '✅ Setup Complete:';
  RAISE NOTICE '   - audit_logs table: %', CASE WHEN table_count > 0 THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '   - Indexes created: %', index_count;
  RAISE NOTICE '   - RLS policies: %', policy_count;
  
  -- Show sample of recent logs if any exist
  IF EXISTS (SELECT 1 FROM audit_logs LIMIT 1) THEN
    RAISE NOTICE '   - Sample logs found: %', (SELECT COUNT(*) FROM audit_logs);
  ELSE
    RAISE NOTICE '   - No audit logs yet (will be created when PDR actions occur)';
  END IF;
END $$;

-- Display table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;

