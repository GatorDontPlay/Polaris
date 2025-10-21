-- Update company values to have exactly the 4 core values required
-- This script will replace all existing company values with the 4 specified ones

-- First, disable any foreign key constraints temporarily (if needed)
-- Note: Supabase/PostgreSQL handles this automatically with CASCADE

-- Delete all existing company values and related behaviors
-- This will cascade to behaviors table due to foreign key constraints
DELETE FROM company_values;

-- Insert the 4 core company values
INSERT INTO company_values (name, description, sort_order, is_active) VALUES
('Craftsmanship', 'We take pride in our work and strive for excellence in everything we create, paying attention to detail and continuously improving our skills.', 1, true),
('Lean Thinking', 'We eliminate waste, optimize processes, and focus on delivering maximum value with minimal resources while continuously improving.', 2, true),
('Value-Centric Innovation', 'We innovate with purpose, focusing on creating meaningful value for our customers and stakeholders through creative problem-solving.', 3, true),
('Blameless Problem-Solving', 'We approach problems with curiosity and collaboration, focusing on solutions rather than blame, and learning from every challenge.', 4, true);

-- Verify the insert
SELECT id, name, description, sort_order, is_active, created_at 
FROM company_values 
ORDER BY sort_order;
