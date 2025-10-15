-- =====================================================
-- OPTIMIZE RLS POLICIES - MINIMAL VERSION
-- =====================================================
-- This version only fixes the core PDR-related tables
-- Skips audit_logs and profiles to avoid column issues
-- =====================================================

-- =====================================================
-- STEP 1: Create Helper Function for Role Checks
-- =====================================================

DROP FUNCTION IF EXISTS public.current_user_role();

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated, anon;

-- =====================================================
-- STEP 2: Optimize PDRs Table Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view own PDRs" ON pdrs;
DROP POLICY IF EXISTS "CEOs can view all PDRs" ON pdrs;
DROP POLICY IF EXISTS "Users can view their own PDRs" ON pdrs;
DROP POLICY IF EXISTS "CEO can view all PDRs" ON pdrs;
DROP POLICY IF EXISTS "Users can insert own PDRs" ON pdrs;
DROP POLICY IF EXISTS "Users can create their own PDRs" ON pdrs;
DROP POLICY IF EXISTS "Users can update own PDRs when not locked" ON pdrs;
DROP POLICY IF EXISTS "CEOs can update any PDR" ON pdrs;
DROP POLICY IF EXISTS "Users can update their own PDRs" ON pdrs;
DROP POLICY IF EXISTS "CEO can update any PDR" ON pdrs;
DROP POLICY IF EXISTS "Users can delete own DRAFT PDRs" ON pdrs;

CREATE POLICY "pdrs_select_policy" ON pdrs
FOR SELECT USING (
  user_id = (select auth.uid())
  OR
  (select public.current_user_role()) = 'CEO'
);

CREATE POLICY "pdrs_insert_policy" ON pdrs
FOR INSERT WITH CHECK (
  user_id = (select auth.uid())
);

CREATE POLICY "pdrs_update_policy" ON pdrs
FOR UPDATE USING (
  (user_id = (select auth.uid()) AND (is_locked = false OR is_locked IS NULL))
  OR
  (select public.current_user_role()) = 'CEO'
);

CREATE POLICY "pdrs_delete_policy" ON pdrs
FOR DELETE USING (
  (user_id = (select auth.uid()) AND status = 'DRAFT')
  OR
  ((select public.current_user_role()) = 'CEO' AND status = 'DRAFT')
);

-- =====================================================
-- STEP 3: Optimize Goals Table Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view own goals" ON goals;
DROP POLICY IF EXISTS "CEOs can view all goals" ON goals;
DROP POLICY IF EXISTS "Users can manage own goals" ON goals;
DROP POLICY IF EXISTS "Users can view their PDR goals" ON goals;
DROP POLICY IF EXISTS "CEO can view all goals" ON goals;
DROP POLICY IF EXISTS "Users can manage their PDR goals" ON goals;
DROP POLICY IF EXISTS "CEO can manage all goals" ON goals;

CREATE POLICY "goals_select_policy" ON goals
FOR SELECT USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = (select auth.uid()))
  OR
  (select public.current_user_role()) = 'CEO'
);

CREATE POLICY "goals_modify_policy" ON goals
FOR ALL USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = (select auth.uid()))
  OR
  (select public.current_user_role()) = 'CEO'
);

-- =====================================================
-- STEP 4: Optimize Behaviors Table Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view own behaviors" ON behaviors;
DROP POLICY IF EXISTS "CEOs can view all behaviors" ON behaviors;
DROP POLICY IF EXISTS "Users can manage own behaviors" ON behaviors;
DROP POLICY IF EXISTS "Users can view their PDR behaviors" ON behaviors;
DROP POLICY IF EXISTS "CEO can view all behaviors" ON behaviors;
DROP POLICY IF EXISTS "Users can manage their PDR behaviors" ON behaviors;
DROP POLICY IF EXISTS "CEO can manage all behaviors" ON behaviors;

CREATE POLICY "behaviors_select_policy" ON behaviors
FOR SELECT USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = (select auth.uid()))
  OR
  (select public.current_user_role()) = 'CEO'
);

CREATE POLICY "behaviors_modify_policy" ON behaviors
FOR ALL USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = (select auth.uid()))
  OR
  (select public.current_user_role()) = 'CEO'
);

-- =====================================================
-- STEP 5: Optimize Behavior Entries Table Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view own behavior entries" ON behavior_entries;
DROP POLICY IF EXISTS "CEOs can view all behavior entries" ON behavior_entries;
DROP POLICY IF EXISTS "Users can manage own behavior entries" ON behavior_entries;

CREATE POLICY "behavior_entries_select_policy" ON behavior_entries
FOR SELECT USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = (select auth.uid()))
  OR
  (select public.current_user_role()) = 'CEO'
);

CREATE POLICY "behavior_entries_modify_policy" ON behavior_entries
FOR ALL USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = (select auth.uid()))
  OR
  (select public.current_user_role()) = 'CEO'
);

-- =====================================================
-- STEP 6: Optimize Mid Year Reviews Table Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view their mid year reviews" ON mid_year_reviews;
DROP POLICY IF EXISTS "CEO can view all mid year reviews" ON mid_year_reviews;
DROP POLICY IF EXISTS "Users can insert their own mid year review" ON mid_year_reviews;
DROP POLICY IF EXISTS "CEO can insert any mid year review" ON mid_year_reviews;
DROP POLICY IF EXISTS "Users can update their own mid year review" ON mid_year_reviews;
DROP POLICY IF EXISTS "CEO can update any mid year review" ON mid_year_reviews;

CREATE POLICY "mid_year_reviews_select_policy" ON mid_year_reviews
FOR SELECT USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = (select auth.uid()))
  OR
  (select public.current_user_role()) = 'CEO'
);

CREATE POLICY "mid_year_reviews_insert_policy" ON mid_year_reviews
FOR INSERT WITH CHECK (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = (select auth.uid()))
  OR
  (select public.current_user_role()) = 'CEO'
);

CREATE POLICY "mid_year_reviews_update_policy" ON mid_year_reviews
FOR UPDATE USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = (select auth.uid()))
  OR
  (select public.current_user_role()) = 'CEO'
);

-- =====================================================
-- STEP 7: Optimize End Year Reviews Table Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view their end year reviews" ON end_year_reviews;
DROP POLICY IF EXISTS "CEO can view all end year reviews" ON end_year_reviews;
DROP POLICY IF EXISTS "Users can insert their own end year review" ON end_year_reviews;
DROP POLICY IF EXISTS "CEO can insert any end year review" ON end_year_reviews;
DROP POLICY IF EXISTS "Users can update their own end year review" ON end_year_reviews;
DROP POLICY IF EXISTS "CEO can update any end year review" ON end_year_reviews;

CREATE POLICY "end_year_reviews_select_policy" ON end_year_reviews
FOR SELECT USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = (select auth.uid()))
  OR
  (select public.current_user_role()) = 'CEO'
);

CREATE POLICY "end_year_reviews_insert_policy" ON end_year_reviews
FOR INSERT WITH CHECK (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = (select auth.uid()))
  OR
  (select public.current_user_role()) = 'CEO'
);

CREATE POLICY "end_year_reviews_update_policy" ON end_year_reviews
FOR UPDATE USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = (select auth.uid()))
  OR
  (select public.current_user_role()) = 'CEO'
);

-- =====================================================
-- Ensure RLS is Enabled
-- =====================================================

ALTER TABLE pdrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE behaviors ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mid_year_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_year_reviews ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Grant Permissions
-- =====================================================

GRANT ALL ON pdrs TO authenticated;
GRANT ALL ON goals TO authenticated;
GRANT ALL ON behaviors TO authenticated;
GRANT ALL ON behavior_entries TO authenticated;
GRANT ALL ON mid_year_reviews TO authenticated;
GRANT ALL ON end_year_reviews TO authenticated;

-- =====================================================
-- Verification
-- =====================================================

SELECT 
  'Core RLS policies optimized!' as status,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('pdrs', 'goals', 'behaviors', 'behavior_entries', 'mid_year_reviews', 'end_year_reviews')) as core_policies;

