-- =====================================================
-- VERIFY RLS POLICIES - Check Optimization Results
-- =====================================================
-- This script verifies that RLS policies have been
-- properly consolidated and optimized.
-- =====================================================

-- =====================================================
-- 1. Check Policy Count (should be ~20-25 total)
-- =====================================================

SELECT 
  'Policy Count Check' as test,
  COUNT(*) as total_policies,
  CASE 
    WHEN COUNT(*) BETWEEN 20 AND 30 THEN '✓ PASS - Policies consolidated'
    ELSE '✗ FAIL - Unexpected policy count'
  END as result
FROM pg_policies 
WHERE schemaname = 'public';

-- =====================================================
-- 2. List All Policies by Table
-- =====================================================

SELECT 
  tablename,
  COUNT(*) as policy_count,
  array_agg(policyname ORDER BY policyname) as policies
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- =====================================================
-- 3. Check for Problematic auth.uid() Usage
-- =====================================================

SELECT 
  'Auth Function Usage Check' as test,
  tablename,
  policyname,
  CASE 
    WHEN definition LIKE '%auth.uid()%' 
         AND definition NOT LIKE '%(select auth.uid())%' 
    THEN '✗ FAIL - Unoptimized auth.uid()'
    ELSE '✓ PASS - Optimized'
  END as result
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- 4. Verify Helper Function Exists
-- =====================================================

SELECT 
  'Helper Function Check' as test,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'current_user_role' 
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN '✓ PASS - public.current_user_role() exists'
    ELSE '✗ FAIL - Helper function missing'
  END as result;

-- =====================================================
-- 5. Test Policy as Employee (Simulated)
-- =====================================================

-- Note: This requires setting up test data
-- Uncomment and customize with real user IDs for testing

/*
-- Set up test context as employee
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "YOUR-TEST-EMPLOYEE-USER-ID"}';

-- Test: Employee should see only their own PDRs
SELECT 
  'Employee PDR Access Test' as test,
  COUNT(*) as pdrs_visible,
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ PASS - Employee can see own PDRs'
    ELSE '✗ FAIL - Employee cannot see PDRs'
  END as result
FROM pdrs 
WHERE user_id = 'YOUR-TEST-EMPLOYEE-USER-ID';

-- Test: Employee should NOT see other users' PDRs
SELECT 
  'Employee Isolation Test' as test,
  COUNT(*) as other_pdrs_visible,
  CASE 
    WHEN COUNT(*) = 0 THEN '✓ PASS - Employee cannot see others PDRs'
    ELSE '✗ FAIL - Employee can see others PDRs'
  END as result
FROM pdrs 
WHERE user_id != 'YOUR-TEST-EMPLOYEE-USER-ID';

RESET role;
RESET request.jwt.claims;
*/

-- =====================================================
-- 6. Test Policy as CEO (Simulated)
-- =====================================================

/*
-- Set up test context as CEO
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "YOUR-TEST-CEO-USER-ID"}';

-- Test: CEO should see all PDRs
SELECT 
  'CEO PDR Access Test' as test,
  COUNT(*) as total_pdrs_visible,
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ PASS - CEO can see all PDRs'
    ELSE '✗ FAIL - CEO cannot see PDRs'
  END as result
FROM pdrs;

RESET role;
RESET request.jwt.claims;
*/

-- =====================================================
-- 7. Check RLS is Enabled on All Tables
-- =====================================================

SELECT 
  'RLS Enabled Check' as test,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✓ Enabled'
    ELSE '✗ Disabled'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'pdrs', 'goals', 'behaviors', 'behavior_entries',
    'mid_year_reviews', 'end_year_reviews', 'audit_logs', 'profiles'
  )
ORDER BY tablename;

-- =====================================================
-- 8. Summary Report
-- =====================================================

SELECT 
  '====== VERIFICATION SUMMARY ======' as report;

SELECT 
  'Total Policies' as metric,
  COUNT(*) as value
FROM pg_policies 
WHERE schemaname = 'public';

SELECT 
  'Tables with RLS' as metric,
  COUNT(*) as value
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true;

SELECT 
  'Unoptimized Policies' as metric,
  COUNT(*) as value
FROM pg_policies 
WHERE schemaname = 'public'
  AND definition LIKE '%auth.uid()%' 
  AND definition NOT LIKE '%(select auth.uid())%';

SELECT 
  '====== END VERIFICATION ======' as report;

-- =====================================================
-- Instructions for Manual Testing
-- =====================================================

/*
TO TEST MANUALLY:

1. Log in as an employee user in your application
2. Navigate to the dashboard
3. Verify you can see your own PDR
4. Note your user ID from the browser console or database

5. Run these queries in Supabase SQL Editor:
   
   -- Replace YOUR-USER-ID with actual ID
   SELECT * FROM pdrs WHERE user_id = 'YOUR-USER-ID';
   
   -- Should return your PDRs

6. Log in as CEO user
7. Navigate to admin dashboard
8. Verify you can see all PDRs

9. Check Supabase Advisors again - warnings should be gone:
   - Database → Advisors → Performance
   - Should show no auth_rls_initplan warnings
   - Should show no multiple_permissive_policies warnings
*/

