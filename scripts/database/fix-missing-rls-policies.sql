-- =====================================================
-- FIX MISSING RLS POLICIES FOR REVIEW TABLES
-- =====================================================
-- This fixes the RLS policy violation error for mid_year_reviews table
-- Run this in your Supabase SQL Editor

-- Ensure RLS is enabled on review tables
ALTER TABLE mid_year_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_year_reviews ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their mid year reviews" ON mid_year_reviews;
DROP POLICY IF EXISTS "Users can insert their own mid year review" ON mid_year_reviews;
DROP POLICY IF EXISTS "Users can update their own mid year review" ON mid_year_reviews;
DROP POLICY IF EXISTS "Users can manage their mid year reviews" ON mid_year_reviews;
DROP POLICY IF EXISTS "CEO can view all mid year reviews" ON mid_year_reviews;
DROP POLICY IF EXISTS "CEO can update any mid year review" ON mid_year_reviews;
DROP POLICY IF EXISTS "CEO can manage all mid year reviews" ON mid_year_reviews;

DROP POLICY IF EXISTS "Users can view their end year reviews" ON end_year_reviews;
DROP POLICY IF EXISTS "Users can insert their own end year review" ON end_year_reviews;
DROP POLICY IF EXISTS "Users can update their own end year review" ON end_year_reviews;
DROP POLICY IF EXISTS "Users can manage their end year reviews" ON end_year_reviews;
DROP POLICY IF EXISTS "CEO can view all end year reviews" ON end_year_reviews;
DROP POLICY IF EXISTS "CEO can update any end year review" ON end_year_reviews;
DROP POLICY IF EXISTS "CEO can manage all end year reviews" ON end_year_reviews;

-- =====================================================
-- MID YEAR REVIEWS RLS POLICIES
-- =====================================================

-- Users can view their own mid year reviews
CREATE POLICY "Users can view their mid year reviews" ON mid_year_reviews
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = mid_year_reviews.pdr_id AND pdrs.user_id = auth.uid()
  )
);

-- Users can insert their own mid year reviews
CREATE POLICY "Users can insert their own mid year review" ON mid_year_reviews
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = mid_year_reviews.pdr_id AND pdrs.user_id = auth.uid()
  )
);

-- Users can update their own mid year reviews
CREATE POLICY "Users can update their own mid year review" ON mid_year_reviews
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = mid_year_reviews.pdr_id AND pdrs.user_id = auth.uid()
  )
);

-- CEO can view all mid year reviews
CREATE POLICY "CEO can view all mid year reviews" ON mid_year_reviews
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

-- CEO can update any mid year review
CREATE POLICY "CEO can update any mid year review" ON mid_year_reviews
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

-- CEO can insert mid year reviews for any PDR
CREATE POLICY "CEO can insert any mid year review" ON mid_year_reviews
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

-- =====================================================
-- END YEAR REVIEWS RLS POLICIES
-- =====================================================

-- Users can view their own end year reviews
CREATE POLICY "Users can view their end year reviews" ON end_year_reviews
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = end_year_reviews.pdr_id AND pdrs.user_id = auth.uid()
  )
);

-- Users can insert their own end year reviews
CREATE POLICY "Users can insert their own end year review" ON end_year_reviews
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = end_year_reviews.pdr_id AND pdrs.user_id = auth.uid()
  )
);

-- Users can update their own end year reviews
CREATE POLICY "Users can update their own end year review" ON end_year_reviews
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = end_year_reviews.pdr_id AND pdrs.user_id = auth.uid()
  )
);

-- CEO can view all end year reviews
CREATE POLICY "CEO can view all end year reviews" ON end_year_reviews
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

-- CEO can update any end year review
CREATE POLICY "CEO can update any end year review" ON end_year_reviews
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

-- CEO can insert end year reviews for any PDR
CREATE POLICY "CEO can insert any end year review" ON end_year_reviews
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant table permissions to authenticated users
GRANT ALL ON mid_year_reviews TO authenticated;
GRANT ALL ON end_year_reviews TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify policies were created
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('mid_year_reviews', 'end_year_reviews')
ORDER BY tablename, policyname;




