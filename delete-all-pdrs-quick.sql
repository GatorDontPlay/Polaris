-- =====================================================
-- QUICK DELETE ALL PDRs
-- =====================================================
-- ⚠️ WARNING: This deletes ALL PDRs and related data!
-- Run this in Supabase SQL Editor only if you're sure!

-- Step 1: See what will be deleted
SELECT 
  'PDRs' as table_name, 
  COUNT(*) as records_to_delete 
FROM pdrs
UNION ALL
SELECT 'Goals', COUNT(*) FROM goals
UNION ALL
SELECT 'Behaviors', COUNT(*) FROM behaviors
UNION ALL
SELECT 'Mid Year Reviews', COUNT(*) FROM mid_year_reviews
UNION ALL
SELECT 'End Year Reviews', COUNT(*) FROM end_year_reviews
UNION ALL
SELECT 'Behavior Entries', COUNT(*) FROM behavior_entries;

-- Step 2: Delete everything (uncomment to execute)
/*
DELETE FROM behavior_entries;
DELETE FROM behaviors;
DELETE FROM goals;
DELETE FROM mid_year_reviews;
DELETE FROM end_year_reviews;
DELETE FROM pdrs;

-- Delete related audit logs
DELETE FROM audit_logs 
WHERE table_name IN ('pdrs', 'goals', 'behaviors', 'mid_year_reviews', 'end_year_reviews', 'behavior_entries');
*/

-- Step 3: Verify all deleted
SELECT 
  'PDRs' as table_name, 
  COUNT(*) as remaining_records 
FROM pdrs
UNION ALL
SELECT 'Goals', COUNT(*) FROM goals
UNION ALL
SELECT 'Behaviors', COUNT(*) FROM behaviors
UNION ALL
SELECT 'Mid Year Reviews', COUNT(*) FROM mid_year_reviews
UNION ALL
SELECT 'End Year Reviews', COUNT(*) FROM end_year_reviews
UNION ALL
SELECT 'Behavior Entries', COUNT(*) FROM behavior_entries;

