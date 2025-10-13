-- =====================================================
-- FIX COMPANY VALUES RLS POLICY
-- =====================================================
-- This fixes the RLS policy to allow server-side access to company_values
-- The issue: Server-side Supabase client couldn't read company_values due to RLS

-- Step 1: Check current policies
SELECT 
    'Current RLS Policies for company_values:' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'company_values';

-- Step 2: Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Anyone can view company values" ON company_values;

-- Step 3: Create new policy that allows both authenticated AND anonymous users to read
-- This is necessary because:
-- 1. Company values are public reference data
-- 2. Server-side API routes need to read this data
-- 3. Client-side also needs access for display
CREATE POLICY "Anyone can view company values" 
ON company_values 
FOR SELECT 
TO authenticated, anon 
USING (is_active = true);

-- Step 4: Verify the policy was created
SELECT 
    'New RLS Policy Created:' as info,
    policyname,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'company_values' 
AND policyname = 'Anyone can view company values';

-- Step 5: Test the query (as authenticated user)
SELECT 
    'Test Query Results:' as info,
    COUNT(*) as total_values,
    COUNT(*) FILTER (WHERE is_active = true) as active_values
FROM company_values;

-- Step 6: Show all active company values that should be returned
SELECT 
    'Active Company Values:' as section,
    id,
    name,
    is_active,
    sort_order
FROM company_values 
WHERE is_active = true
ORDER BY sort_order;

SELECT '✅ RLS Policy Fix Complete!' as status;

