-- =====================================================
-- FIX MISSING COMPANY VALUES
-- =====================================================
-- This fixes the empty company values that are preventing behaviors from showing
-- Run this in your Supabase SQL Editor

-- Insert the 4 core company values for CodeFish Studio
INSERT INTO company_values (id, name, description, sort_order, is_active) VALUES
(gen_random_uuid(), 'Craftsmanship', 'We take pride in our work and strive for excellence in everything we create, paying attention to detail and continuously improving our skills.', 1, true),
(gen_random_uuid(), 'Lean Thinking', 'We eliminate waste, optimize processes, and focus on delivering maximum value with minimal resources while continuously improving.', 2, true),
(gen_random_uuid(), 'Value-Centric Innovation', 'We innovate with purpose, focusing on creating meaningful value for our customers and stakeholders through creative problem-solving.', 3, true),
(gen_random_uuid(), 'Blameless Problem-Solving', 'We approach problems with curiosity and collaboration, focusing on solutions rather than blame, and learning from every challenge.', 4, true)
ON CONFLICT (name) DO NOTHING;

-- Verify the company values were inserted
SELECT 
    'Company Values Inserted Successfully!' as status,
    COUNT(*) as total_values
FROM company_values 
WHERE is_active = true;

-- Show the inserted values
SELECT 
    name, 
    description, 
    sort_order, 
    is_active, 
    created_at 
FROM company_values 
WHERE is_active = true
ORDER BY sort_order;

-- Check if there are any existing PDR periods
SELECT 
    'PDR Periods Status:' as info,
    COUNT(*) as total_periods,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_periods
FROM pdr_periods;

-- If no active PDR period exists, insert one
INSERT INTO pdr_periods (id, name, start_date, end_date, is_active) 
SELECT 
    gen_random_uuid(), 
    'FY 2025-2026', 
    '2025-07-01'::date, 
    '2026-06-30'::date, 
    true
WHERE NOT EXISTS (
    SELECT 1 FROM pdr_periods WHERE is_active = true
);

-- Final verification
SELECT 'Setup Complete!' as final_status;
SELECT 
    'Active Company Values: ' || COUNT(*) as summary
FROM company_values 
WHERE is_active = true;




