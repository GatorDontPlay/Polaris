-- =====================================================
-- INSERT YOUR ACTUAL COMPANY VALUES
-- =====================================================
-- Insert the 4 core company values you specified

-- Clear any existing generic values first (optional)
-- DELETE FROM company_values WHERE name IN ('Integrity', 'Innovation', 'Collaboration', 'Excellence', 'Customer Focus', 'Self Reflection');

-- Insert YOUR 4 core company values
INSERT INTO company_values (id, name, description, sort_order, is_active) VALUES
(gen_random_uuid(), 'Craftsmanship', 'We take pride in our work and strive for excellence in everything we create, paying attention to detail and continuously improving our skills.', 1, true),
(gen_random_uuid(), 'Lean Thinking', 'We eliminate waste, optimize processes, and focus on delivering maximum value with minimal resources while continuously improving.', 2, true),
(gen_random_uuid(), 'Value-Centric Innovation', 'We innovate with purpose, focusing on creating meaningful value for our customers and stakeholders through creative problem-solving.', 3, true),
(gen_random_uuid(), 'Blameless Problem-Solving', 'We approach problems with curiosity and collaboration, focusing on solutions rather than blame, and learning from every challenge.', 4, true)
ON CONFLICT (name) DO NOTHING;

-- Insert PDR Periods (if needed)
INSERT INTO pdr_periods (id, name, start_date, end_date, is_active) VALUES
(gen_random_uuid(), 'FY 2024-2025', '2024-07-01', '2025-06-30', true),
(gen_random_uuid(), 'FY 2023-2024', '2023-07-01', '2024-06-30', false)
ON CONFLICT (name) DO NOTHING;

-- Verify your company values were inserted
SELECT 'SUCCESS!' as status, 'Your Company Values:' as info;
SELECT name, description, sort_order, is_active, created_at 
FROM company_values 
WHERE is_active = true
ORDER BY sort_order;

-- Verify PDR periods
SELECT 'PDR Periods:' as info, name, start_date, end_date, is_active 
FROM pdr_periods 
ORDER BY start_date DESC;

SELECT 'Setup complete with YOUR company values!' as final_status;
