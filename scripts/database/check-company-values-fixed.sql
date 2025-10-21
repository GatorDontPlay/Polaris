-- =====================================================
-- CHECK COMPANY VALUES IN DATABASE (FIXED)
-- =====================================================
-- Run this to see what's actually in the company_values table

-- Check all company values (including inactive ones)
SELECT 
    'All Company Values:' as section,
    id, name, description, sort_order, is_active, created_at
FROM company_values 
ORDER BY sort_order;

-- Check only active company values (what the API should return)
SELECT 
    'Active Company Values:' as section,
    id, name, description, sort_order, is_active, created_at
FROM company_values 
WHERE is_active = true
ORDER BY sort_order;

-- Count all vs active
SELECT 
    'Total Count:' as info,
    COUNT(*) as total_values,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_values,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_values
FROM company_values;

-- Check table structure
SELECT 
    'Table Structure:' as info,
    column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'company_values' 
ORDER BY ordinal_position;
