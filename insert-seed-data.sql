-- =====================================================
-- INSERT SEED DATA - COMPANY VALUES AND PDR PERIODS
-- =====================================================
-- Run this script in your Supabase SQL Editor to insert seed data

-- Insert Company Values (if they don't exist)
INSERT INTO public.company_values (id, name, description, sort_order, is_active) 
VALUES 
    (gen_random_uuid(), 'Integrity', 'Acting with honesty and transparency in all interactions', 1, true),
    (gen_random_uuid(), 'Innovation', 'Embracing creative solutions and continuous improvement', 2, true),
    (gen_random_uuid(), 'Collaboration', 'Working effectively with others to achieve common goals', 3, true),
    (gen_random_uuid(), 'Excellence', 'Striving for the highest quality in all deliverables', 4, true),
    (gen_random_uuid(), 'Customer Focus', 'Putting customer needs at the center of our decisions', 5, true),
    (gen_random_uuid(), 'Self Reflection', 'Engaging in thoughtful self-assessment and continuous learning', 6, true)
ON CONFLICT (name) DO NOTHING;

-- Insert PDR Periods (if they don't exist)
INSERT INTO public.pdr_periods (id, name, start_date, end_date, is_active) 
VALUES 
    (gen_random_uuid(), 'FY 2024-2025', '2024-07-01', '2025-06-30', true),
    (gen_random_uuid(), 'FY 2023-2024', '2023-07-01', '2024-06-30', false)
ON CONFLICT (name) DO NOTHING;

-- Verify seed data was inserted
SELECT 'Company Values Inserted:' as info, COUNT(*) as count FROM company_values WHERE is_active = true;
SELECT 'PDR Periods Inserted:' as info, COUNT(*) as count FROM pdr_periods;

-- Show the inserted data
SELECT 'Company Values:' as section, name, description, sort_order FROM company_values WHERE is_active = true ORDER BY sort_order;
SELECT 'PDR Periods:' as section, name, start_date, end_date, is_active FROM pdr_periods ORDER BY start_date DESC;

SELECT 'Seed data insertion complete!' as status;
