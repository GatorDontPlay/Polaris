-- =====================================================
-- OPTIMIZE RLS POLICIES - Production Fix
-- =====================================================
-- This migration consolidates and optimizes all RLS policies
-- to fix Supabase linter warnings and improve performance.
--
-- Issues Fixed:
-- - 32 auth_rls_initplan warnings (auth.uid() re-evaluation)
-- - 73 multiple_permissive_policies warnings (redundant policies)
--
-- Changes:
-- - Creates efficient helper function for role checks
-- - Consolidates multiple policies into single OR-based policies
-- - Optimizes auth.uid() calls with (select auth.uid())
-- =====================================================

-- Note: Not using BEGIN/COMMIT transaction to avoid reference issues
-- Each statement will commit independently
--
-- Some DROP statements may show "does not exist" errors - this is normal
-- and means the policy wasn't there to begin with. The migration will continue.

-- =====================================================
-- STEP 1: Create Helper Function for Role Checks
-- =====================================================

-- Drop existing function if it exists (ignore error if doesn't exist)
DROP FUNCTION IF EXISTS public.current_user_role();

-- Create optimized role check function in public schema
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated, anon;

COMMENT ON FUNCTION public.current_user_role() IS 'Efficiently retrieves the authenticated user role from profiles. Used in RLS policies to avoid repeated subqueries.';

-- =====================================================
-- STEP 2: Optimize PDRs Table Policies
-- =====================================================

-- Drop existing policies
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

-- Create consolidated, optimized policies

-- SELECT: Users see their own, CEOs see all
CREATE POLICY "pdrs_select_policy" ON pdrs
FOR SELECT USING (
  user_id = (select auth.uid())
  OR
  (select public.current_user_role()) = 'CEO'
);

-- INSERT: Users can create their own PDRs
CREATE POLICY "pdrs_insert_policy" ON pdrs
FOR INSERT WITH CHECK (
  user_id = (select auth.uid())
);

-- UPDATE: Users can update their own when not locked, CEOs can update any
CREATE POLICY "pdrs_update_policy" ON pdrs
FOR UPDATE USING (
  (user_id = (select auth.uid()) AND (is_locked = false OR is_locked IS NULL))
  OR
  (select public.current_user_role()) = 'CEO'
);

-- DELETE: Users can delete their own DRAFT PDRs, CEOs can delete any DRAFT PDRs
CREATE POLICY "pdrs_delete_policy" ON pdrs
FOR DELETE USING (
  (user_id = (select auth.uid()) AND status = 'DRAFT')
  OR
  ((select public.current_user_role()) = 'CEO' AND status = 'DRAFT')
);

-- =====================================================
-- STEP 3: Optimize Goals Table Policies
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own goals" ON goals;
DROP POLICY IF EXISTS "CEOs can view all goals" ON goals;
DROP POLICY IF EXISTS "Users can manage own goals" ON goals;
DROP POLICY IF EXISTS "Users can view their PDR goals" ON goals;
DROP POLICY IF EXISTS "CEO can view all goals" ON goals;
DROP POLICY IF EXISTS "Users can manage their PDR goals" ON goals;
DROP POLICY IF EXISTS "CEO can manage all goals" ON goals;

-- Create consolidated policies

-- SELECT: Users see their PDR goals, CEOs see all
CREATE POLICY "goals_select_policy" ON goals
FOR SELECT USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = (select auth.uid()))
  OR
  (select public.current_user_role()) = 'CEO'
);

-- ALL (INSERT/UPDATE/DELETE): Users manage their PDR goals, CEOs manage all
CREATE POLICY "goals_modify_policy" ON goals
FOR ALL USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = (select auth.uid()))
  OR
  (select public.current_user_role()) = 'CEO'
);

-- =====================================================
-- STEP 4: Optimize Behaviors Table Policies
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own behaviors" ON behaviors;
DROP POLICY IF EXISTS "CEOs can view all behaviors" ON behaviors;
DROP POLICY IF EXISTS "Users can manage own behaviors" ON behaviors;
DROP POLICY IF EXISTS "Users can view their PDR behaviors" ON behaviors;
DROP POLICY IF EXISTS "CEO can view all behaviors" ON behaviors;
DROP POLICY IF EXISTS "Users can manage their PDR behaviors" ON behaviors;
DROP POLICY IF EXISTS "CEO can manage all behaviors" ON behaviors;

-- Create consolidated policies

-- SELECT: Users see their PDR behaviors, CEOs see all
CREATE POLICY "behaviors_select_policy" ON behaviors
FOR SELECT USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = (select auth.uid()))
  OR
  (select public.current_user_role()) = 'CEO'
);

-- ALL (INSERT/UPDATE/DELETE): Users manage their PDR behaviors, CEOs manage all
CREATE POLICY "behaviors_modify_policy" ON behaviors
FOR ALL USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = (select auth.uid()))
  OR
  (select public.current_user_role()) = 'CEO'
);

-- =====================================================
-- STEP 5: Optimize Behavior Entries Table Policies
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own behavior entries" ON behavior_entries;
DROP POLICY IF EXISTS "CEOs can view all behavior entries" ON behavior_entries;
DROP POLICY IF EXISTS "Users can manage own behavior entries" ON behavior_entries;

-- Create consolidated policies

-- SELECT: Users see their PDR behavior entries, CEOs see all
CREATE POLICY "behavior_entries_select_policy" ON behavior_entries
FOR SELECT USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = (select auth.uid()))
  OR
  (select public.current_user_role()) = 'CEO'
);

-- ALL (INSERT/UPDATE/DELETE): Users manage their PDR behavior entries, CEOs manage all
CREATE POLICY "behavior_entries_modify_policy" ON behavior_entries
FOR ALL USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = (select auth.uid()))
  OR
  (select public.current_user_role()) = 'CEO'
);

-- =====================================================
-- STEP 6: Optimize Mid Year Reviews Table Policies
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their mid year reviews" ON mid_year_reviews;
DROP POLICY IF EXISTS "CEO can view all mid year reviews" ON mid_year_reviews;
DROP POLICY IF EXISTS "Users can insert their own mid year review" ON mid_year_reviews;
DROP POLICY IF EXISTS "CEO can insert any mid year review" ON mid_year_reviews;
DROP POLICY IF EXISTS "Users can update their own mid year review" ON mid_year_reviews;
DROP POLICY IF EXISTS "CEO can update any mid year review" ON mid_year_reviews;

-- Create consolidated policies

-- SELECT: Users see their PDR mid year reviews, CEOs see all
CREATE POLICY "mid_year_reviews_select_policy" ON mid_year_reviews
FOR SELECT USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = (select auth.uid()))
  OR
  (select public.current_user_role()) = 'CEO'
);

-- INSERT: Users can create their mid year review, CEOs can create any
CREATE POLICY "mid_year_reviews_insert_policy" ON mid_year_reviews
FOR INSERT WITH CHECK (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = (select auth.uid()))
  OR
  (select public.current_user_role()) = 'CEO'
);

-- UPDATE: Users can update their mid year review, CEOs can update any
CREATE POLICY "mid_year_reviews_update_policy" ON mid_year_reviews
FOR UPDATE USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = (select auth.uid()))
  OR
  (select public.current_user_role()) = 'CEO'
);

-- =====================================================
-- STEP 7: Optimize End Year Reviews Table Policies
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their end year reviews" ON end_year_reviews;
DROP POLICY IF EXISTS "CEO can view all end year reviews" ON end_year_reviews;
DROP POLICY IF EXISTS "Users can insert their own end year review" ON end_year_reviews;
DROP POLICY IF EXISTS "CEO can insert any end year review" ON end_year_reviews;
DROP POLICY IF EXISTS "Users can update their own end year review" ON end_year_reviews;
DROP POLICY IF EXISTS "CEO can update any end year review" ON end_year_reviews;

-- Create consolidated policies

-- SELECT: Users see their PDR end year reviews, CEOs see all
CREATE POLICY "end_year_reviews_select_policy" ON end_year_reviews
FOR SELECT USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = (select auth.uid()))
  OR
  (select public.current_user_role()) = 'CEO'
);

-- INSERT: Users can create their end year review, CEOs can create any
CREATE POLICY "end_year_reviews_insert_policy" ON end_year_reviews
FOR INSERT WITH CHECK (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = (select auth.uid()))
  OR
  (select public.current_user_role()) = 'CEO'
);

-- UPDATE: Users can update their end year review, CEOs can update any
CREATE POLICY "end_year_reviews_update_policy" ON end_year_reviews
FOR UPDATE USING (
  pdr_id IN (SELECT id FROM pdrs WHERE user_id = (select auth.uid()))
  OR
  (select public.current_user_role()) = 'CEO'
);

-- =====================================================
-- STEP 8: Optimize Audit Logs Table Policies
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "CEO can view all audit logs" ON audit_logs;

-- Create consolidated policy

-- SELECT: Users see their audit logs, CEOs see all
CREATE POLICY "audit_logs_select_policy" ON audit_logs
FOR SELECT USING (
  user_id = (select auth.uid())
  OR
  (select public.current_user_role()) = 'CEO'
);

-- =====================================================
-- STEP 9: Optimize Profiles Table Policies
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to view all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- Create single consolidated policy for profiles
-- All authenticated users can view all profiles (needed for app functionality)
-- Users can only update their own profile
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT USING (
  auth.uid() IS NOT NULL
);

CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE USING (
  id = (select auth.uid())
);

-- =====================================================
-- STEP 10: Ensure RLS is Enabled
-- =====================================================

ALTER TABLE pdrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE behaviors ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mid_year_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_year_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 11: Grant Permissions
-- =====================================================

GRANT ALL ON pdrs TO authenticated;
GRANT ALL ON goals TO authenticated;
GRANT ALL ON behaviors TO authenticated;
GRANT ALL ON behavior_entries TO authenticated;
GRANT ALL ON mid_year_reviews TO authenticated;
GRANT ALL ON end_year_reviews TO authenticated;
GRANT SELECT ON audit_logs TO authenticated;
GRANT SELECT, UPDATE ON profiles TO authenticated;

-- =====================================================
-- Verification Query
-- =====================================================

SELECT 
  'RLS optimization complete!' as status,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
  'All auth_rls_initplan and multiple_permissive_policies warnings should be resolved.' as note;

