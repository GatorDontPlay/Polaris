-- =====================================================
-- VERIFY COMPANY VALUES IN DATABASE
-- =====================================================
-- Run this to check what's currently in your company_values table

-- Check if company_values table exists
SELECT 
    'Table Exists Check:' as info,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'company_values' 
        AND table_schema = 'public'
    ) as table_exists;

-- Check all company values (active and inactive)
SELECT 
    'All Company Values:' as info,
    COUNT(*) as total_count
FROM company_values;

-- Show all company values with details
SELECT 
    id,
    name,
    description,
    sort_order,
    is_active,
    created_at
FROM company_values
ORDER BY sort_order, created_at;

-- Check specifically for active company values (what the API queries)
SELECT 
    'Active Company Values:' as info,
    COUNT(*) as active_count
FROM company_values 
WHERE is_active = true;

-- Show active company values only
SELECT 
    name,
    is_active,
    sort_order
FROM company_values 
WHERE is_active = true
ORDER BY sort_order;

-- Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'company_values'
AND table_schema = 'public'
ORDER BY ordinal_position;




