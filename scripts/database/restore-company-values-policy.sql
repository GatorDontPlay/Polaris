-- =====================================================
-- RESTORE MISSING COMPANY VALUES RLS POLICY
-- =====================================================
-- The enum migration accidentally removed the company_values RLS policy
-- This restores it so the API can read company values again

-- Ensure RLS is enabled on company_values table
ALTER TABLE company_values ENABLE ROW LEVEL SECURITY;

-- Drop any existing policy to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view company values" ON company_values;
DROP POLICY IF EXISTS "All authenticated users can view company values" ON company_values;

-- Recreate the company values read policy
CREATE POLICY "Anyone can view company values" ON company_values
FOR SELECT TO authenticated USING (true);

-- Verify the policy was created
SELECT 
    'Company Values RLS Policy Restored!' as status,
    schemaname, 
    tablename, 
    policyname, 
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'company_values'
ORDER BY policyname;

-- Test that we can now read company values
SELECT 
    'Company Values Test:' as info,
    COUNT(*) as total_values,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_values
FROM company_values;

-- Show the company values
SELECT 
    name, 
    is_active, 
    sort_order 
FROM company_values 
WHERE is_active = true
ORDER BY sort_order;




