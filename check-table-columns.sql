-- =====================================================
-- CHECK TABLE COLUMNS - Identify Correct Column Names
-- =====================================================
-- Run this to see what columns exist in your tables
-- This will help us fix the RLS policies

-- Check PDRs table columns
SELECT 
  'pdrs' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'pdrs'
ORDER BY ordinal_position;

-- Check Goals table columns
SELECT 
  'goals' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'goals'
ORDER BY ordinal_position;

-- Check Behaviors table columns
SELECT 
  'behaviors' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'behaviors'
ORDER BY ordinal_position;

-- Check Behavior Entries table columns
SELECT 
  'behavior_entries' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'behavior_entries'
ORDER BY ordinal_position;

-- Check Mid Year Reviews table columns
SELECT 
  'mid_year_reviews' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'mid_year_reviews'
ORDER BY ordinal_position;

-- Check End Year Reviews table columns
SELECT 
  'end_year_reviews' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'end_year_reviews'
ORDER BY ordinal_position;

-- Check Audit Logs table columns
SELECT 
  'audit_logs' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'audit_logs'
ORDER BY ordinal_position;

-- Summary: Look for user/owner related columns
SELECT 
  table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('pdrs', 'goals', 'behaviors', 'behavior_entries', 'mid_year_reviews', 'end_year_reviews', 'audit_logs')
  AND (column_name LIKE '%user%' OR column_name LIKE '%owner%' OR column_name LIKE '%employee%')
ORDER BY table_name, column_name;

