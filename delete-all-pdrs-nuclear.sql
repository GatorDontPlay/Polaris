-- =====================================================
-- DELETE ALL PDRs - NUCLEAR OPTION
-- =====================================================
-- ⚠️ WARNING: This deletes ALL PDR data for ALL users
-- Only use this if you want a complete clean slate
-- User profiles and company values will be preserved
-- =====================================================

BEGIN;

-- Show what will be deleted
SELECT '🔍 PREVIEW: Current database state' as info;

SELECT 'PDRs' as item, COUNT(*) as count FROM pdrs
UNION ALL SELECT 'Goals', COUNT(*) FROM goals
UNION ALL SELECT 'Behaviors', COUNT(*) FROM behaviors
UNION ALL SELECT 'Mid-Year Reviews', COUNT(*) FROM mid_year_reviews
UNION ALL SELECT 'End-Year Reviews', COUNT(*) FROM end_year_reviews
UNION ALL SELECT 'Behavior Entries', COUNT(*) FROM behavior_entries;

SELECT '👥 Users who will lose PDR data' as info;
SELECT 
  prof.email,
  prof.first_name || ' ' || prof.last_name as name,
  COUNT(p.id) as pdr_count
FROM pdrs p
JOIN profiles prof ON prof.id = p.user_id
GROUP BY prof.email, prof.first_name, prof.last_name
ORDER BY pdr_count DESC;

-- Delete in correct order (child tables first to avoid foreign key violations)

-- 1. Delete behavior entries
DELETE FROM behavior_entries;
SELECT '✓ Deleted behavior_entries' as status, COUNT(*) as remaining FROM behavior_entries;

-- 2. Delete end-year reviews
DELETE FROM end_year_reviews;
SELECT '✓ Deleted end_year_reviews' as status, COUNT(*) as remaining FROM end_year_reviews;

-- 3. Delete mid-year reviews
DELETE FROM mid_year_reviews;
SELECT '✓ Deleted mid_year_reviews' as status, COUNT(*) as remaining FROM mid_year_reviews;

-- 4. Delete behaviors
DELETE FROM behaviors;
SELECT '✓ Deleted behaviors' as status, COUNT(*) as remaining FROM behaviors;

-- 5. Delete goals
DELETE FROM goals;
SELECT '✓ Deleted goals' as status, COUNT(*) as remaining FROM goals;

-- 6. Delete PDRs (parent table - delete last)
DELETE FROM pdrs;
SELECT '✓ Deleted pdrs' as status, COUNT(*) as remaining FROM pdrs;

-- Verify deletion
SELECT '📊 FINAL COUNTS (should all be 0)' as info;
SELECT 'PDRs' as item, COUNT(*) as count FROM pdrs
UNION ALL SELECT 'Goals', COUNT(*) FROM goals
UNION ALL SELECT 'Behaviors', COUNT(*) FROM behaviors
UNION ALL SELECT 'Mid-Year Reviews', COUNT(*) FROM mid_year_reviews
UNION ALL SELECT 'End-Year Reviews', COUNT(*) FROM end_year_reviews
UNION ALL SELECT 'Behavior Entries', COUNT(*) FROM behavior_entries;

-- Verify preserved data
SELECT '✅ PRESERVED DATA' as info;
SELECT 'Users' as item, COUNT(*) as count FROM profiles
UNION ALL SELECT 'Company Values', COUNT(*) FROM company_values;

COMMIT;

SELECT '✅ ALL PDRs deleted successfully! Database is now clean.' as final_status;

