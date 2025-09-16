-- =====================================================
-- CLEANUP COMPANY VALUES - KEEP ONLY YOUR 4 VALUES
-- =====================================================
-- Remove the generic values and test value, keep only your 4 custom values

-- Delete the generic values that came from the deployment script
DELETE FROM company_values 
WHERE name IN (
    'Integrity', 
    'Innovation', 
    'Collaboration', 
    'Excellence', 
    'Customer Focus', 
    'Self Reflection',
    'Test Value'
);

-- Verify we now have only your 4 custom values
SELECT 'AFTER CLEANUP:' as status, 
       COUNT(*) as total_values,
       COUNT(CASE WHEN is_active = true THEN 1 END) as active_values
FROM company_values;

-- Show your 4 custom company values
SELECT 'YOUR COMPANY VALUES:' as section,
       id, name, description, sort_order, is_active, created_at
FROM company_values 
WHERE is_active = true
ORDER BY sort_order;

-- Verify the API query will work correctly
SELECT 'API WILL RETURN:' as info, COUNT(*) as count
FROM company_values 
WHERE is_active = true;
