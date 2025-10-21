-- =====================================================
-- DROP ALL TABLES AND RECREATE FROM SCRATCH
-- =====================================================
-- This will give you a clean, working database in 5 minutes

-- =====================================================
-- STEP 1: SAFELY DROP ALL APPLICATION TABLES
-- =====================================================
-- Note: This preserves auth.users and auth.* tables (Supabase managed)

-- Drop tables in dependency order (child tables first)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS end_year_reviews CASCADE;
DROP TABLE IF EXISTS mid_year_reviews CASCADE;
DROP TABLE IF EXISTS behavior_entries CASCADE;
DROP TABLE IF EXISTS behaviors CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS pdrs CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS company_values CASCADE;
DROP TABLE IF EXISTS pdr_periods CASCADE;

-- Drop any custom types/enums
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS pdr_status CASCADE;
DROP TYPE IF EXISTS priority CASCADE;
DROP TYPE IF EXISTS audit_action CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS behavior_author_type CASCADE;

-- =====================================================
-- STEP 2: CREATE FRESH SCHEMA
-- =====================================================

-- Create enums
CREATE TYPE user_role AS ENUM ('EMPLOYEE', 'CEO');
CREATE TYPE pdr_status AS ENUM (
    'DRAFT',
    'OPEN_FOR_REVIEW', 
    'PLAN_LOCKED',
    'PDR_BOOKED',
    'SUBMITTED',
    'UNDER_REVIEW',
    'MID_YEAR_CHECK',
    'END_YEAR_REVIEW',
    'COMPLETED',
    'LOCKED'
);

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'EMPLOYEE',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create PDR periods table
CREATE TABLE pdr_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create PDRs table
CREATE TABLE pdrs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  period_id UUID REFERENCES pdr_periods(id) ON DELETE CASCADE,
  fy_label VARCHAR(20) NOT NULL,
  fy_start_date DATE NOT NULL,
  fy_end_date DATE NOT NULL,
  status pdr_status DEFAULT 'DRAFT',
  employee_fields JSONB,
  ceo_fields JSONB,
  meeting_booked BOOLEAN DEFAULT false,
  meeting_booked_at TIMESTAMP WITH TIME ZONE,
  locked_at TIMESTAMP WITH TIME ZONE,
  locked_by UUID REFERENCES profiles(id),
  is_locked BOOLEAN DEFAULT false,
  current_step INTEGER DEFAULT 1,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, fy_label)
);

-- Create company values table
CREATE TABLE company_values (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create goals table
CREATE TABLE goals (
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

-- Create behaviors table
CREATE TABLE behaviors (
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

-- =====================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdr_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE behaviors ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: CREATE RLS POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "Allow authenticated users to view all profiles" ON profiles
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "CEO can update any profile" ON profiles
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

-- PDR periods policies
CREATE POLICY "Anyone can view pdr periods" ON pdr_periods
FOR SELECT USING (auth.role() = 'authenticated');

-- PDRs policies
CREATE POLICY "Users can view their own PDRs" ON pdrs
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "CEO can view all PDRs" ON pdrs
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

CREATE POLICY "Users can create their own PDRs" ON pdrs
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own PDRs" ON pdrs
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "CEO can update any PDR" ON pdrs
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

-- Goals policies
CREATE POLICY "Users can view goals of their PDRs" ON goals
FOR SELECT USING (
  EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = goals.pdr_id AND pdrs.user_id = auth.uid())
);

CREATE POLICY "CEO can view all goals" ON goals
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

CREATE POLICY "Users can manage goals of their PDRs" ON goals
FOR ALL USING (
  EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = goals.pdr_id AND pdrs.user_id = auth.uid())
);

CREATE POLICY "CEO can manage all goals" ON goals
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

-- Company values policies
CREATE POLICY "Anyone can view company values" ON company_values
FOR SELECT USING (auth.role() = 'authenticated');

-- Behaviors policies
CREATE POLICY "Users can view behaviors of their PDRs" ON behaviors
FOR SELECT USING (
  EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = behaviors.pdr_id AND pdrs.user_id = auth.uid())
);

CREATE POLICY "CEO can view all behaviors" ON behaviors
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

CREATE POLICY "Users can manage behaviors of their PDRs" ON behaviors
FOR ALL USING (
  EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = behaviors.pdr_id AND pdrs.user_id = auth.uid())
);

CREATE POLICY "CEO can manage all behaviors" ON behaviors
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
);

-- =====================================================
-- STEP 5: CREATE TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language plpgsql security definer;

-- Function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'EMPLOYEE')
  );
  RETURN NEW;
END;
$$ language plpgsql security definer;

-- Create triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_pdr_updated
  BEFORE UPDATE ON public.pdrs
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_goal_updated
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_behavior_updated
  BEFORE UPDATE ON public.behaviors
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- =====================================================
-- STEP 6: GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- STEP 7: INSERT SEED DATA
-- =====================================================

-- Insert default company values
INSERT INTO company_values (name, description, sort_order) VALUES 
('Innovation', 'We embrace creativity and continuously seek new ways to improve and grow.', 1),
('Integrity', 'We act with honesty, transparency, and ethical behavior in all our interactions.', 2),
('Collaboration', 'We work together effectively, sharing knowledge and supporting each other.', 3),
('Excellence', 'We strive for the highest quality in everything we do and continuously improve.', 4),
('Customer Focus', 'We put our customers at the center of everything we do and exceed their expectations.', 5);

-- Insert default PDR period
INSERT INTO pdr_periods (name, start_date, end_date, is_active) VALUES 
('FY2024-2025', '2024-07-01', '2025-06-30', true);

-- =====================================================
-- STEP 8: RECREATE YOUR USER PROFILE
-- =====================================================

-- Insert your profile (this will work because we have the auth.users record)
INSERT INTO profiles (id, email, first_name, last_name, role, is_active)
SELECT 
  id,
  email,
  'Ryan',
  'Higginson',
  'EMPLOYEE',
  true
FROM auth.users 
WHERE email = 'ryan.higginson@codefishstudio.com'
ON CONFLICT (id) DO UPDATE SET
  first_name = 'Ryan',
  last_name = 'Higginson',
  role = 'EMPLOYEE',
  is_active = true;

-- Success message
SELECT 'DATABASE RECREATED SUCCESSFULLY! 🎉' as status,
       'Clean slate - everything should work now!' as message;
