-- =====================================================
-- VIEW CURRENT PDRs IN DATABASE
-- =====================================================
-- Run this first to see what you have before deleting
-- Copy/paste into Supabase SQL Editor

-- 1. Summary counts
SELECT 
  '📊 SUMMARY COUNTS' as section,
  '-' as divider;

SELECT 
  'PDRs' as item,
  COUNT(*) as count 
FROM pdrs
UNION ALL
SELECT 'Goals', COUNT(*) FROM goals
UNION ALL
SELECT 'Behaviors', COUNT(*) FROM behaviors
UNION ALL
SELECT 'Mid-Year Reviews', COUNT(*) FROM mid_year_reviews
UNION ALL
SELECT 'End-Year Reviews', COUNT(*) FROM end_year_reviews
UNION ALL
SELECT 'Behavior Entries', COUNT(*) FROM behavior_entries;

-- 2. PDRs by status
SELECT 
  '📋 PDRs BY STATUS' as section,
  '-' as divider;

SELECT 
  status,
  COUNT(*) as count
FROM pdrs
GROUP BY status
ORDER BY count DESC;

-- 3. Detailed PDR list with user info
SELECT 
  '👥 DETAILED PDR LIST' as section,
  '-' as divider;

SELECT 
  p.id,
  p.status,
  p.fy_label,
  prof.email as user_email,
  prof.first_name || ' ' || prof.last_name as user_name,
  prof.role,
  COUNT(DISTINCT g.id) as goals,
  COUNT(DISTINCT b.id) as behaviors,
  CASE WHEN myr.id IS NOT NULL THEN '✓' ELSE '✗' END as has_midyear,
  CASE WHEN eyr.id IS NOT NULL THEN '✓' ELSE '✗' END as has_endyear,
  p.created_at,
  p.updated_at
FROM pdrs p
LEFT JOIN profiles prof ON prof.id = p.user_id
LEFT JOIN goals g ON g.pdr_id = p.id
LEFT JOIN behaviors b ON b.pdr_id = p.id
LEFT JOIN mid_year_reviews myr ON myr.pdr_id = p.id
LEFT JOIN end_year_reviews eyr ON eyr.pdr_id = p.id
GROUP BY p.id, p.status, p.fy_label, prof.email, prof.first_name, prof.last_name, prof.role, myr.id, eyr.id, p.created_at, p.updated_at
ORDER BY p.created_at DESC;

-- 4. Check for test/demo users
SELECT 
  '🧪 TEST/DEMO USERS' as section,
  '-' as divider;

SELECT 
  prof.email,
  prof.first_name || ' ' || prof.last_name as name,
  COUNT(p.id) as pdr_count
FROM profiles prof
LEFT JOIN pdrs p ON p.user_id = prof.id
WHERE prof.email LIKE '%test%' 
   OR prof.email LIKE '%demo%'
   OR prof.email LIKE '%@example.com%'
GROUP BY prof.id, prof.email, prof.first_name, prof.last_name
ORDER BY pdr_count DESC;


