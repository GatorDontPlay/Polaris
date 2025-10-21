-- ============================================
-- Delete All Test PDRs - Quick Clean Slate
-- ============================================
-- This will delete all 5 PDRs shown in your query
-- Safe to run - preserves users and company values
-- ============================================

BEGIN;

-- Show counts before deletion
SELECT 'BEFORE DELETION:' as status;
SELECT COUNT(*) as pdr_count FROM pdrs;
SELECT COUNT(*) as goal_count FROM goals;
SELECT COUNT(*) as behavior_count FROM behaviors;
SELECT COUNT(*) as mid_year_count FROM mid_year_reviews;
SELECT COUNT(*) as end_year_count FROM end_year_reviews;

-- Delete in correct order (child tables first)
DELETE FROM mid_year_reviews;
DELETE FROM end_year_reviews;
DELETE FROM goals;
DELETE FROM behaviors;
DELETE FROM pdrs;

-- Show counts after deletion
SELECT 'AFTER DELETION:' as status;
SELECT COUNT(*) as pdr_count FROM pdrs;
SELECT COUNT(*) as goal_count FROM goals;
SELECT COUNT(*) as behavior_count FROM behaviors;
SELECT COUNT(*) as mid_year_count FROM mid_year_reviews;
SELECT COUNT(*) as end_year_count FROM end_year_reviews;

-- Verify user and company values still exist
SELECT 'PRESERVED DATA:' as status;
SELECT COUNT(*) as user_count FROM profiles;
SELECT COUNT(*) as company_values_count FROM company_values;

COMMIT;

SELECT '✅ All PDRs deleted successfully! Ready for fresh testing.' as final_status;

