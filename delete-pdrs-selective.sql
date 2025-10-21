-- ============================================
-- Selective PDR Deletion Options
-- ============================================
-- Choose one of the options below based on your testing needs
-- ============================================

-- ============================================
-- OPTION 1: Delete ONLY End-Year Review Data
-- (Keeps PDRs, goals, behaviors - just removes end-year submissions)
-- ============================================
/*
BEGIN;

DELETE FROM end_year_reviews;
SELECT 'Deleted end-year reviews' as status;

-- Reset PDR status from END_YEAR_SUBMITTED back to END_YEAR_REVIEW
UPDATE pdrs 
SET status = 'END_YEAR_REVIEW',
    updated_at = NOW()
WHERE status IN ('END_YEAR_SUBMITTED', 'COMPLETED');

-- Clear employee ratings from goals and behaviors
UPDATE goals 
SET employee_rating = NULL,
    employee_progress = NULL,
    updated_at = NOW();

UPDATE behaviors 
SET employee_rating = NULL,
    employee_self_assessment = NULL,
    examples = NULL,
    updated_at = NOW();

SELECT 'Reset PDRs to END_YEAR_REVIEW status' as status;
SELECT 'Cleared employee ratings from goals and behaviors' as status;

COMMIT;
*/

-- ============================================
-- OPTION 2: Delete Only SUBMITTED/COMPLETED PDRs
-- (Keeps draft/in-progress PDRs)
-- ============================================
/*
BEGIN;

-- Delete related data first
DELETE FROM end_year_reviews 
WHERE pdr_id IN (
  SELECT id FROM pdrs WHERE status IN ('END_YEAR_SUBMITTED', 'COMPLETED')
);

DELETE FROM mid_year_reviews 
WHERE pdr_id IN (
  SELECT id FROM pdrs WHERE status IN ('END_YEAR_SUBMITTED', 'COMPLETED')
);

DELETE FROM goals 
WHERE pdr_id IN (
  SELECT id FROM pdrs WHERE status IN ('END_YEAR_SUBMITTED', 'COMPLETED')
);

DELETE FROM behaviors 
WHERE pdr_id IN (
  SELECT id FROM pdrs WHERE status IN ('END_YEAR_SUBMITTED', 'COMPLETED')
);

-- Delete the PDRs
DELETE FROM pdrs WHERE status IN ('END_YEAR_SUBMITTED', 'COMPLETED');

SELECT 'Deleted only submitted/completed PDRs' as status;

COMMIT;
*/

-- ============================================
-- OPTION 3: Delete PDRs for Specific User
-- (Replace 'USER_EMAIL_HERE' with actual email)
-- ============================================
/*
BEGIN;

-- Get user ID
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id 
  FROM profiles 
  WHERE email = 'USER_EMAIL_HERE';
  
  -- Delete related data
  DELETE FROM end_year_reviews WHERE pdr_id IN (
    SELECT id FROM pdrs WHERE user_id = target_user_id
  );
  
  DELETE FROM mid_year_reviews WHERE pdr_id IN (
    SELECT id FROM pdrs WHERE user_id = target_user_id
  );
  
  DELETE FROM goals WHERE pdr_id IN (
    SELECT id FROM pdrs WHERE user_id = target_user_id
  );
  
  DELETE FROM behaviors WHERE pdr_id IN (
    SELECT id FROM pdrs WHERE user_id = target_user_id
  );
  
  DELETE FROM pdrs WHERE user_id = target_user_id;
  
  RAISE NOTICE 'Deleted all PDRs for user: USER_EMAIL_HERE';
END $$;

COMMIT;
*/

-- ============================================
-- OPTION 4: Delete EVERYTHING (Full Reset)
-- Use the main delete-pdrs-for-testing.sql file instead
-- ============================================

-- ============================================
-- QUICK CHECK: See what exists before deleting
-- ============================================
-- Run this first to see what you have:

SELECT 
  p.id,
  p.status,
  p.fy_label,
  u.email as user_email,
  u.first_name || ' ' || u.last_name as user_name,
  (SELECT COUNT(*) FROM goals WHERE pdr_id = p.id) as goal_count,
  (SELECT COUNT(*) FROM behaviors WHERE pdr_id = p.id) as behavior_count,
  (SELECT COUNT(*) FROM end_year_reviews WHERE pdr_id = p.id) as has_end_year,
  p.created_at,
  p.updated_at
FROM pdrs p
JOIN profiles u ON p.user_id = u.id
ORDER BY p.created_at DESC;

-- Check employee ratings
SELECT 
  p.fy_label,
  u.email,
  g.title as goal_title,
  g.employee_rating,
  g.employee_progress IS NOT NULL as has_progress
FROM goals g
JOIN pdrs p ON g.pdr_id = p.id
JOIN profiles u ON p.user_id = u.id
WHERE g.employee_rating IS NOT NULL
ORDER BY p.fy_label, g.title;

SELECT 
  p.fy_label,
  u.email,
  cv.name as value_name,
  b.employee_rating,
  b.examples IS NOT NULL as has_examples
FROM behaviors b
JOIN pdrs p ON b.pdr_id = p.id
JOIN profiles u ON p.user_id = u.id
JOIN company_values cv ON b.value_id = cv.id
WHERE b.employee_rating IS NOT NULL
ORDER BY p.fy_label, cv.name;

