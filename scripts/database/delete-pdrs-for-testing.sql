-- ============================================
-- Delete All PDRs and Related Data for Testing
-- ============================================
-- This script safely deletes all PDR data while preserving:
-- - User profiles
-- - Company values
-- - System configuration
--
-- Run this in Supabase SQL Editor to reset for testing
-- ============================================

BEGIN;

-- Show what will be deleted (run this first to preview)
SELECT 'PDRs to delete:' as info, COUNT(*) as count FROM pdrs;
SELECT 'Goals to delete:' as info, COUNT(*) as count FROM goals;
SELECT 'Behaviors to delete:' as info, COUNT(*) as count FROM behaviors;
SELECT 'Mid-year reviews to delete:' as info, COUNT(*) as count FROM mid_year_reviews;
SELECT 'End-year reviews to delete:' as info, COUNT(*) as count FROM end_year_reviews;

-- ============================================
-- DELETE IN CORRECT ORDER (child → parent)
-- ============================================

-- 1. Delete mid-year reviews (child of pdrs)
DELETE FROM mid_year_reviews;
SELECT 'Deleted mid-year reviews' as status;

-- 2. Delete end-year reviews (child of pdrs)
DELETE FROM end_year_reviews;
SELECT 'Deleted end-year reviews' as status;

-- 3. Delete goals (child of pdrs)
DELETE FROM goals;
SELECT 'Deleted goals' as status;

-- 4. Delete behaviors (child of pdrs)
DELETE FROM behaviors;
SELECT 'Deleted behaviors' as status;

-- 5. Delete PDRs (parent table)
DELETE FROM pdrs;
SELECT 'Deleted PDRs' as status;

-- Show final counts
SELECT 'Final PDR count:' as info, COUNT(*) as count FROM pdrs;
SELECT 'Final goals count:' as info, COUNT(*) as count FROM goals;
SELECT 'Final behaviors count:' as info, COUNT(*) as count FROM behaviors;

-- ============================================
-- COMMIT THE CHANGES
-- ============================================
COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after to confirm deletion:

-- Should all return 0
SELECT COUNT(*) as remaining_pdrs FROM pdrs;
SELECT COUNT(*) as remaining_goals FROM goals;
SELECT COUNT(*) as remaining_behaviors FROM behaviors;
SELECT COUNT(*) as remaining_mid_year FROM mid_year_reviews;
SELECT COUNT(*) as remaining_end_year FROM end_year_reviews;

-- User profiles should still exist
SELECT COUNT(*) as user_count FROM profiles;

-- Company values should still exist
SELECT COUNT(*) as company_values_count FROM company_values;

