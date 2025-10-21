-- =====================================================
-- DELETE TEST/DEMO PDRs - QUICK & SAFE
-- =====================================================
-- This script deletes PDRs for users with test/demo emails
-- Safe to run - preserves production user data
-- =====================================================

BEGIN;

-- Show what will be deleted
SELECT '🔍 PREVIEW: PDRs that will be deleted' as info;

SELECT 
  p.id as pdr_id,
  prof.email,
  prof.first_name || ' ' || prof.last_name as name,
  p.status,
  p.fy_label,
  (SELECT COUNT(*) FROM goals WHERE pdr_id = p.id) as goals,
  (SELECT COUNT(*) FROM behaviors WHERE pdr_id = p.id) as behaviors
FROM pdrs p
JOIN profiles prof ON prof.id = p.user_id
WHERE prof.email LIKE '%test%' 
   OR prof.email LIKE '%demo%'
   OR prof.email LIKE '%@example.com%';

-- Show counts before deletion
SELECT '📊 BEFORE DELETION' as info;
SELECT 'PDRs' as item, COUNT(*) as count FROM pdrs
UNION ALL SELECT 'Goals', COUNT(*) FROM goals
UNION ALL SELECT 'Behaviors', COUNT(*) FROM behaviors
UNION ALL SELECT 'Mid-Year Reviews', COUNT(*) FROM mid_year_reviews
UNION ALL SELECT 'End-Year Reviews', COUNT(*) FROM end_year_reviews
UNION ALL SELECT 'Behavior Entries', COUNT(*) FROM behavior_entries;

-- Delete behavior entries for test users
DELETE FROM behavior_entries 
WHERE behavior_id IN (
  SELECT b.id FROM behaviors b 
  JOIN pdrs p ON p.id = b.pdr_id 
  JOIN profiles prof ON prof.id = p.user_id
  WHERE prof.email LIKE '%test%' 
     OR prof.email LIKE '%demo%'
     OR prof.email LIKE '%@example.com%'
);

-- Delete behaviors for test users
DELETE FROM behaviors 
WHERE pdr_id IN (
  SELECT p.id FROM pdrs p 
  JOIN profiles prof ON prof.id = p.user_id
  WHERE prof.email LIKE '%test%' 
     OR prof.email LIKE '%demo%'
     OR prof.email LIKE '%@example.com%'
);

-- Delete goals for test users
DELETE FROM goals 
WHERE pdr_id IN (
  SELECT p.id FROM pdrs p 
  JOIN profiles prof ON prof.id = p.user_id
  WHERE prof.email LIKE '%test%' 
     OR prof.email LIKE '%demo%'
     OR prof.email LIKE '%@example.com%'
);

-- Delete mid-year reviews for test users
DELETE FROM mid_year_reviews 
WHERE pdr_id IN (
  SELECT p.id FROM pdrs p 
  JOIN profiles prof ON prof.id = p.user_id
  WHERE prof.email LIKE '%test%' 
     OR prof.email LIKE '%demo%'
     OR prof.email LIKE '%@example.com%'
);

-- Delete end-year reviews for test users
DELETE FROM end_year_reviews 
WHERE pdr_id IN (
  SELECT p.id FROM pdrs p 
  JOIN profiles prof ON prof.id = p.user_id
  WHERE prof.email LIKE '%test%' 
     OR prof.email LIKE '%demo%'
     OR prof.email LIKE '%@example.com%'
);

-- Delete PDRs for test users
DELETE FROM pdrs 
WHERE user_id IN (
  SELECT id FROM profiles 
  WHERE email LIKE '%test%' 
     OR email LIKE '%demo%'
     OR email LIKE '%@example.com%'
);

-- Show counts after deletion
SELECT '📊 AFTER DELETION' as info;
SELECT 'PDRs' as item, COUNT(*) as count FROM pdrs
UNION ALL SELECT 'Goals', COUNT(*) FROM goals
UNION ALL SELECT 'Behaviors', COUNT(*) FROM behaviors
UNION ALL SELECT 'Mid-Year Reviews', COUNT(*) FROM mid_year_reviews
UNION ALL SELECT 'End-Year Reviews', COUNT(*) FROM end_year_reviews
UNION ALL SELECT 'Behavior Entries', COUNT(*) FROM behavior_entries;

-- Verify production data still exists
SELECT '✅ PRODUCTION DATA CHECK' as info;
SELECT 
  COUNT(*) as remaining_pdrs,
  COUNT(DISTINCT p.user_id) as remaining_users
FROM pdrs p
JOIN profiles prof ON prof.id = p.user_id
WHERE prof.email NOT LIKE '%test%' 
  AND prof.email NOT LIKE '%demo%'
  AND prof.email NOT LIKE '%@example.com%';

COMMIT;

SELECT '✅ Test/Demo PDRs deleted successfully!' as final_status;

