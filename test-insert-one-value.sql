-- =====================================================
-- TEST INSERT ONE COMPANY VALUE
-- =====================================================
-- Simple test to insert one value and verify it shows up

-- First, let's see what's currently in the table
SELECT 'BEFORE INSERT:' as status, COUNT(*) as total_count, 
       COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
FROM company_values;

-- Insert one test value
INSERT INTO company_values (name, description, sort_order, is_active) 
VALUES ('Test Value', 'This is a test company value', 999, true);

-- Check what we have now
SELECT 'AFTER INSERT:' as status, COUNT(*) as total_count, 
       COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
FROM company_values;

-- Show all values
SELECT 'ALL VALUES:' as section, id, name, description, sort_order, is_active, created_at
FROM company_values 
ORDER BY sort_order;

-- Test the exact query the API uses
SELECT 'API QUERY RESULT:' as section, id, name, description, sort_order, is_active, created_at
FROM company_values 
WHERE is_active = true
ORDER BY sort_order;
