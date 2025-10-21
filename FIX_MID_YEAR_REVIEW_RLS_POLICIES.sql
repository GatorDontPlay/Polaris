-- =====================================================
-- FIX MID YEAR REVIEW RLS POLICIES
-- =====================================================
-- This fixes the RLS policy violation error when employees try to submit mid-year reviews
-- Run this in your Supabase SQL Editor

-- First, let's check what policies currently exist
-- (Just for debugging - you can run this separately to see current state)
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'mid_year_reviews';

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Users can view their mid year reviews" ON mid_year_reviews;
DROP POLICY IF EXISTS "Users can insert their own mid year review" ON mid_year_reviews;
DROP POLICY IF EXISTS "Users can update their own mid year review" ON mid_year_reviews;
DROP POLICY IF EXISTS "Users can manage their mid year reviews" ON mid_year_reviews;
DROP POLICY IF EXISTS "CEO can view all mid year reviews" ON mid_year_reviews;
DROP POLICY IF EXISTS "CEO can update any mid year review" ON mid_year_reviews;
DROP POLICY IF EXISTS "CEO can insert any mid year review" ON mid_year_reviews;
DROP POLICY IF EXISTS "CEO can manage all mid year reviews" ON mid_year_reviews;

-- Ensure RLS is enabled
ALTER TABLE mid_year_reviews ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- EMPLOYEE POLICIES
-- =====================================================

-- Employees can SELECT their own mid year reviews
CREATE POLICY "Users can view their mid year reviews" ON mid_year_reviews
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = mid_year_reviews.pdr_id 
    AND pdrs.user_id = auth.uid()
  )
);

-- Employees can INSERT their own mid year reviews
CREATE POLICY "Users can insert their own mid year review" ON mid_year_reviews
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = mid_year_reviews.pdr_id 
    AND pdrs.user_id = auth.uid()
  )
);

-- Employees can UPDATE their own mid year reviews
CREATE POLICY "Users can update their own mid year review" ON mid_year_reviews
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = mid_year_reviews.pdr_id 
    AND pdrs.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = mid_year_reviews.pdr_id 
    AND pdrs.user_id = auth.uid()
  )
);

-- =====================================================
-- CEO POLICIES
-- =====================================================

-- CEO can SELECT all mid year reviews
CREATE POLICY "CEO can view all mid year reviews" ON mid_year_reviews
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

-- CEO can INSERT mid year reviews for any PDR
CREATE POLICY "CEO can insert any mid year review" ON mid_year_reviews
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

-- CEO can UPDATE any mid year review
CREATE POLICY "CEO can update any mid year review" ON mid_year_reviews
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Ensure authenticated users have table-level permissions
GRANT SELECT, INSERT, UPDATE ON mid_year_reviews TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Run this to verify policies are created:
SELECT 
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
WHERE tablename = 'mid_year_reviews'
ORDER BY policyname;

-- Expected output should show 6 policies:
-- 1. CEO can insert any mid year review (INSERT)
-- 2. CEO can update any mid year review (UPDATE)
-- 3. CEO can view all mid year reviews (SELECT)
-- 4. Users can insert their own mid year review (INSERT)
-- 5. Users can update their own mid year review (UPDATE)
-- 6. Users can view their mid year reviews (SELECT)



