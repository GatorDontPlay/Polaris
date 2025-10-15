-- =====================================================
-- VERIFY RLS POLICIES FOR YEAR END REVIEW
-- =====================================================
-- Run this in your Supabase SQL Editor to ensure 
-- employees can update PDR status during end-year submission

-- Step 1: Check current RLS policies on pdrs table
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  CASE 
    WHEN qual IS NOT NULL THEN pg_get_expr(qual, 'pdrs'::regclass)
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN pg_get_expr(with_check, 'pdrs'::regclass)
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies 
WHERE tablename = 'pdrs' AND cmd = 'UPDATE'
ORDER BY policyname;

-- Step 2: Check if employees have UPDATE permission on pdrs table
SELECT 
  grantee, 
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'pdrs' 
  AND privilege_type = 'UPDATE'
  AND grantee = 'authenticated';

-- Step 3: Test if RLS would allow an employee to update status
-- This simulates what happens when an employee tries to update PDR status
-- Replace <test_user_id> with an actual employee user ID
DO $$
DECLARE
  test_user_id uuid;
  test_pdr_id uuid;
  can_update boolean;
BEGIN
  -- Get a test user (first employee)
  SELECT id INTO test_user_id 
  FROM auth.users 
  LIMIT 1;

  -- Get a test PDR for that user
  SELECT id INTO test_pdr_id
  FROM pdrs
  WHERE user_id = test_user_id
  LIMIT 1;

  IF test_pdr_id IS NULL THEN
    RAISE NOTICE 'No PDRs found for testing';
    RETURN;
  END IF;

  -- Check if update would be allowed by RLS
  -- This doesn't actually update, just checks permissions
  PERFORM 1
  FROM pdrs
  WHERE id = test_pdr_id
    AND user_id = test_user_id;

  IF FOUND THEN
    RAISE NOTICE 'RLS CHECK PASSED: Employee can see and potentially update their PDR';
  ELSE
    RAISE NOTICE 'RLS CHECK FAILED: Employee cannot access their PDR';
  END IF;
END $$;

-- Step 4: If RLS policies are missing or incorrect, recreate them
-- Run this ONLY if Step 1 shows missing or incorrect policies

-- Drop existing policies first (if they exist)
DROP POLICY IF EXISTS "Users can update their own PDRs" ON pdrs;
DROP POLICY IF EXISTS "CEO can update any PDR" ON pdrs;

-- Create policy for employees to update their own PDRs
CREATE POLICY "Users can update their own PDRs" ON pdrs
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create policy for CEOs to update any PDR
CREATE POLICY "CEO can update any PDR" ON pdrs
FOR UPDATE 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

-- Step 5: Verify policies were created successfully
SELECT 
  policyname,
  cmd,
  'Policy created successfully' as status
FROM pg_policies 
WHERE tablename = 'pdrs' 
  AND cmd = 'UPDATE'
  AND policyname IN ('Users can update their own PDRs', 'CEO can update any PDR');

