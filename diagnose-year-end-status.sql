-- =====================================================
-- DIAGNOSE YEAR END REVIEW STATUS ISSUE
-- =====================================================
-- Run this in your Supabase SQL Editor to check the current state

-- Step 1: Check PDRs with MID_YEAR_APPROVED status and their end_year_reviews
SELECT 
  p.id,
  p.status,
  p.user_id,
  p.updated_at,
  p.created_at,
  prof.first_name,
  prof.last_name,
  prof.email,
  eyr.id as end_year_review_id,
  eyr.achievements_summary,
  eyr.employee_overall_rating,
  eyr.created_at as review_created_at,
  CASE 
    WHEN eyr.id IS NOT NULL THEN 'HAS END YEAR REVIEW - STATUS UPDATE FAILED'
    ELSE 'NO END YEAR REVIEW - NOT YET SUBMITTED'
  END as diagnosis
FROM pdrs p
LEFT JOIN profiles prof ON prof.id = p.user_id
LEFT JOIN end_year_reviews eyr ON eyr.pdr_id = p.id
WHERE p.status = 'MID_YEAR_APPROVED'
ORDER BY p.updated_at DESC;

-- Step 2: Check RLS policies on pdrs table for UPDATE
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies 
WHERE tablename = 'pdrs' AND cmd = 'UPDATE'
ORDER BY policyname;

-- Step 3: Check if there are any PDRs that need status fixing
-- (Have end_year_review but wrong status)
SELECT 
  COUNT(*) as pdrs_needing_fix,
  'These PDRs have end_year_reviews but status is not END_YEAR_SUBMITTED' as issue
FROM pdrs p
WHERE p.status = 'MID_YEAR_APPROVED'
  AND EXISTS (
    SELECT 1 FROM end_year_reviews eyr
    WHERE eyr.pdr_id = p.id 
    AND eyr.achievements_summary IS NOT NULL
  );


