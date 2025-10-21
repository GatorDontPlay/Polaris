-- =====================================================
-- FIX END YEAR REVIEW RLS POLICIES
-- =====================================================
-- This fixes the RLS policy for end year reviews (preventive fix)
-- Run this in your Supabase SQL Editor

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "Users can view their end year reviews" ON end_year_reviews;
DROP POLICY IF EXISTS "Users can insert their own end year review" ON end_year_reviews;
DROP POLICY IF EXISTS "Users can update their own end year review" ON end_year_reviews;
DROP POLICY IF EXISTS "Users can manage their end year reviews" ON end_year_reviews;
DROP POLICY IF EXISTS "CEO can view all end year reviews" ON end_year_reviews;
DROP POLICY IF EXISTS "CEO can update any end year review" ON end_year_reviews;
DROP POLICY IF EXISTS "CEO can insert any end year review" ON end_year_reviews;
DROP POLICY IF EXISTS "CEO can manage all end year reviews" ON end_year_reviews;

-- Ensure RLS is enabled
ALTER TABLE end_year_reviews ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- EMPLOYEE POLICIES
-- =====================================================

-- Employees can SELECT their own end year reviews
CREATE POLICY "Users can view their end year reviews" ON end_year_reviews
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = end_year_reviews.pdr_id 
    AND pdrs.user_id = auth.uid()
  )
);

-- Employees can INSERT their own end year reviews
CREATE POLICY "Users can insert their own end year review" ON end_year_reviews
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = end_year_reviews.pdr_id 
    AND pdrs.user_id = auth.uid()
  )
);

-- Employees can UPDATE their own end year reviews
CREATE POLICY "Users can update their own end year review" ON end_year_reviews
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = end_year_reviews.pdr_id 
    AND pdrs.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = end_year_reviews.pdr_id 
    AND pdrs.user_id = auth.uid()
  )
);

-- =====================================================
-- CEO POLICIES
-- =====================================================

-- CEO can SELECT all end year reviews
CREATE POLICY "CEO can view all end year reviews" ON end_year_reviews
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

-- CEO can INSERT end year reviews for any PDR
CREATE POLICY "CEO can insert any end year review" ON end_year_reviews
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

-- CEO can UPDATE any end year review
CREATE POLICY "CEO can update any end year review" ON end_year_reviews
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
GRANT SELECT, INSERT, UPDATE ON end_year_reviews TO authenticated;

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
WHERE tablename = 'end_year_reviews'
ORDER BY policyname;



