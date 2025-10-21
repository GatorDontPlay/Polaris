-- =====================================================
-- IMMEDIATE DATABASE SCHEMA FIXES
-- =====================================================
-- Run these commands in Supabase SQL Editor to fix the remaining issues

-- 1. Add missing fy_label column to PDRs table
ALTER TABLE pdrs ADD COLUMN IF NOT EXISTS fy_label VARCHAR(20);
ALTER TABLE pdrs ADD COLUMN IF NOT EXISTS fy_start_date DATE;
ALTER TABLE pdrs ADD COLUMN IF NOT EXISTS fy_end_date DATE;
ALTER TABLE pdrs ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 1;
ALTER TABLE pdrs ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE pdrs ADD COLUMN IF NOT EXISTS meeting_booked BOOLEAN DEFAULT false;

-- Add unique constraint for user_id + fy_label (with proper error handling)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_user_fy' AND table_name = 'pdrs'
  ) THEN
    ALTER TABLE pdrs ADD CONSTRAINT unique_user_fy UNIQUE (user_id, fy_label);
  END IF;
END $$;

-- 2. Create company_values table
CREATE TABLE IF NOT EXISTS company_values (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on company_values
ALTER TABLE company_values ENABLE ROW LEVEL SECURITY;

-- RLS policy for company_values (all authenticated users can view)
CREATE POLICY IF NOT EXISTS "Anyone can view company values" ON company_values
FOR SELECT USING (auth.role() = 'authenticated');

-- Insert default company values
INSERT INTO company_values (name, description, sort_order)
SELECT * FROM (VALUES 
  ('Innovation', 'We embrace creativity and continuously seek new ways to improve and grow.', 1),
  ('Integrity', 'We act with honesty, transparency, and ethical behavior in all our interactions.', 2),
  ('Collaboration', 'We work together effectively, sharing knowledge and supporting each other.', 3),
  ('Excellence', 'We strive for the highest quality in everything we do and continuously improve.', 4),
  ('Customer Focus', 'We put our customers at the center of everything we do and exceed their expectations.', 5)
) AS vals(name, description, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM company_values LIMIT 1);

-- 3. Create pdr_periods table
CREATE TABLE IF NOT EXISTS pdr_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on pdr_periods
ALTER TABLE pdr_periods ENABLE ROW LEVEL SECURITY;

-- RLS policy for pdr_periods (all authenticated users can view)
CREATE POLICY IF NOT EXISTS "Anyone can view pdr periods" ON pdr_periods
FOR SELECT USING (auth.role() = 'authenticated');

-- Insert default PDR period for current financial year
INSERT INTO pdr_periods (name, start_date, end_date, is_active)
SELECT * FROM (VALUES 
  ('FY2024-2025', '2024-07-01'::date, '2025-06-30'::date, true)
) AS periods(name, start_date, end_date, is_active)
WHERE NOT EXISTS (SELECT 1 FROM pdr_periods LIMIT 1);

-- 4. Create goals table if it doesn't exist
CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pdr_id UUID REFERENCES pdrs(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  target_outcome TEXT,
  success_criteria TEXT,
  priority VARCHAR(10) DEFAULT 'MEDIUM',
  employee_progress TEXT,
  employee_rating INTEGER,
  ceo_comments TEXT,
  ceo_rating INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on goals
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- RLS policies for goals
CREATE POLICY IF NOT EXISTS "Users can view goals of their PDRs" ON goals
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = goals.pdr_id AND pdrs.user_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "CEO can view all goals" ON goals
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

CREATE POLICY IF NOT EXISTS "Users can manage goals of their PDRs" ON goals
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = goals.pdr_id AND pdrs.user_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "CEO can manage all goals" ON goals
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

-- 5. Create behaviors table if it doesn't exist
CREATE TABLE IF NOT EXISTS behaviors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pdr_id UUID REFERENCES pdrs(id) ON DELETE CASCADE NOT NULL,
  value_id UUID REFERENCES company_values(id) NOT NULL,
  description TEXT NOT NULL,
  examples TEXT,
  employee_self_assessment TEXT,
  employee_rating INTEGER,
  ceo_comments TEXT,
  ceo_rating INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on behaviors
ALTER TABLE behaviors ENABLE ROW LEVEL SECURITY;

-- RLS policies for behaviors
CREATE POLICY IF NOT EXISTS "Users can view behaviors of their PDRs" ON behaviors
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = behaviors.pdr_id AND pdrs.user_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "CEO can view all behaviors" ON behaviors
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

CREATE POLICY IF NOT EXISTS "Users can manage behaviors of their PDRs" ON behaviors
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = behaviors.pdr_id AND pdrs.user_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "CEO can manage all behaviors" ON behaviors
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

-- 6. Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Database schema fixes applied successfully!';
  RAISE NOTICE 'Tables updated: pdrs (added columns), company_values (created), pdr_periods (created)';
  RAISE NOTICE 'RLS policies configured for proper access control';
  RAISE NOTICE 'Default data inserted for company values and PDR periods';
  RAISE NOTICE 'Your application should now work without 401 or schema errors';
END
$$;
