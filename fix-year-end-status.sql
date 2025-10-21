-- =====================================================
-- FIX YEAR END REVIEW STATUS
-- =====================================================
-- This script fixes PDRs that have end_year_review data 
-- but incorrect status (should be END_YEAR_SUBMITTED)
-- Run this in your Supabase SQL Editor

-- Step 1: First, let's see what needs to be fixed
SELECT 
  p.id,
  p.status as current_status,
  'END_YEAR_SUBMITTED' as should_be_status,
  p.user_id,
  prof.first_name,
  prof.last_name,
  eyr.id as end_year_review_id,
  eyr.created_at as review_created_at,
  eyr.achievements_summary
FROM pdrs p
INNER JOIN end_year_reviews eyr ON eyr.pdr_id = p.id
LEFT JOIN profiles prof ON prof.id = p.user_id
WHERE p.status = 'MID_YEAR_APPROVED'
  AND eyr.achievements_summary IS NOT NULL
ORDER BY eyr.created_at DESC;

-- Step 2: Fix the status for PDRs with end_year_reviews
-- IMPORTANT: Review the output from Step 1 before running this
UPDATE pdrs 
SET 
  status = 'END_YEAR_SUBMITTED',
  updated_at = NOW()
WHERE id IN (
  SELECT p.id
  FROM pdrs p
  INNER JOIN end_year_reviews eyr ON eyr.pdr_id = p.id
  WHERE p.status = 'MID_YEAR_APPROVED'
    AND eyr.achievements_summary IS NOT NULL
);

-- Step 3: Verify the fix
SELECT 
  p.id,
  p.status,
  p.updated_at,
  prof.first_name,
  prof.last_name,
  eyr.id as end_year_review_id,
  'FIXED - Now visible in CEO dashboard' as result
FROM pdrs p
INNER JOIN end_year_reviews eyr ON eyr.pdr_id = p.id
LEFT JOIN profiles prof ON prof.id = p.user_id
WHERE p.status = 'END_YEAR_SUBMITTED'
  AND eyr.achievements_summary IS NOT NULL
ORDER BY p.updated_at DESC;

-- Step 4: Create audit log entries for the fix (optional)
-- This records that we manually fixed the status
INSERT INTO audit_logs (
  table_name,
  record_id,
  action,
  changed_by,
  changed_at,
  new_values
)
SELECT 
  'pdrs',
  p.id,
  'UPDATE',
  (SELECT id FROM profiles WHERE role = 'CEO' LIMIT 1), -- Attributed to first CEO
  NOW(),
  jsonb_build_object(
    'status', 'END_YEAR_SUBMITTED',
    'note', 'Manual fix: Status updated to match completed end_year_review'
  )
FROM pdrs p
INNER JOIN end_year_reviews eyr ON eyr.pdr_id = p.id
WHERE p.status = 'END_YEAR_SUBMITTED'
  AND p.updated_at >= NOW() - INTERVAL '1 minute' -- Only for just-fixed records
  AND eyr.achievements_summary IS NOT NULL;


