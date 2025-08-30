-- =====================================================
-- PDR Advanced - Complete Supabase Database Schema
-- =====================================================
-- This file creates the complete database schema for the PDR system
-- Run this in your Supabase SQL editor to set up all tables, RLS policies, and triggers

-- =====================================================
-- 1. ENUMS AND TYPES
-- =====================================================

-- Create user roles enum (only if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('EMPLOYEE', 'CEO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create PDR status enum
DO $$ BEGIN
    CREATE TYPE pdr_status AS ENUM (
        'Created',
        'OPEN_FOR_REVIEW', 
        'PLAN_LOCKED',
        'PDR_BOOKED',
        'DRAFT',
        'SUBMITTED',
        'UNDER_REVIEW',
        'MID_YEAR_CHECK',
        'END_YEAR_REVIEW',
        'COMPLETED',
        'LOCKED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create priority enum
DO $$ BEGIN
    CREATE TYPE priority AS ENUM ('HIGH', 'MEDIUM', 'LOW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create audit action enum
DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create notification type enum
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('PDR_LOCKED', 'PDR_SUBMITTED', 'PDR_REMINDER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create behavior author type enum
DO $$ BEGIN
    CREATE TYPE behavior_author_type AS ENUM ('EMPLOYEE', 'CEO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. PROFILES TABLE (Already exists, but ensure it's correct)
-- =====================================================

-- Create profiles table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS profiles (
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

-- =====================================================
-- 3. PDR PERIODS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS pdr_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. PDRS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS pdrs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  period_id UUID REFERENCES pdr_periods(id) ON DELETE CASCADE,
  fy_label VARCHAR(20) NOT NULL,
  fy_start_date DATE NOT NULL,
  fy_end_date DATE NOT NULL,
  status pdr_status DEFAULT 'Created',
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

-- =====================================================
-- 5. GOALS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pdr_id UUID REFERENCES pdrs(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  target_outcome TEXT,
  success_criteria TEXT,
  priority priority DEFAULT 'MEDIUM',
  employee_progress TEXT,
  employee_rating INTEGER,
  ceo_comments TEXT,
  ceo_rating INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. COMPANY VALUES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS company_values (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. BEHAVIORS TABLE
-- =====================================================

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

-- =====================================================
-- 8. BEHAVIOR ENTRIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS behavior_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pdr_id UUID REFERENCES pdrs(id) ON DELETE CASCADE NOT NULL,
  value_id UUID REFERENCES company_values(id) NOT NULL,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  author_type behavior_author_type NOT NULL,
  description TEXT NOT NULL,
  examples TEXT,
  self_assessment TEXT,
  rating INTEGER,
  comments TEXT,
  employee_entry_id UUID REFERENCES behavior_entries(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 9. MID YEAR REVIEWS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS mid_year_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pdr_id UUID REFERENCES pdrs(id) ON DELETE CASCADE UNIQUE NOT NULL,
  progress_summary TEXT NOT NULL,
  blockers_challenges TEXT,
  support_needed TEXT,
  employee_comments TEXT,
  ceo_feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 10. END YEAR REVIEWS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS end_year_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pdr_id UUID REFERENCES pdrs(id) ON DELETE CASCADE UNIQUE NOT NULL,
  achievements_summary TEXT NOT NULL,
  learnings_growth TEXT,
  challenges_faced TEXT,
  next_year_goals TEXT,
  employee_overall_rating INTEGER,
  ceo_overall_rating INTEGER,
  ceo_final_comments TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 11. AUDIT LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  action audit_action NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- =====================================================
-- 12. NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pdr_id UUID REFERENCES pdrs(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 13. INDEXES FOR PERFORMANCE
-- =====================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- PDRs indexes  
CREATE INDEX IF NOT EXISTS idx_pdrs_user_id_fy_label ON pdrs(user_id, fy_label);
CREATE INDEX IF NOT EXISTS idx_pdrs_status ON pdrs(status);
CREATE INDEX IF NOT EXISTS idx_pdrs_fy_label ON pdrs(fy_label);
CREATE INDEX IF NOT EXISTS idx_pdrs_meeting_booked ON pdrs(meeting_booked);

-- Goals indexes
CREATE INDEX IF NOT EXISTS idx_goals_pdr_id ON goals(pdr_id);
CREATE INDEX IF NOT EXISTS idx_goals_priority ON goals(priority);

-- Behaviors indexes
CREATE INDEX IF NOT EXISTS idx_behaviors_pdr_id ON behaviors(pdr_id);
CREATE INDEX IF NOT EXISTS idx_behaviors_value_id ON behaviors(value_id);

-- Behavior entries indexes
CREATE INDEX IF NOT EXISTS idx_behavior_entries_pdr_id ON behavior_entries(pdr_id);
CREATE INDEX IF NOT EXISTS idx_behavior_entries_value_id ON behavior_entries(value_id);
CREATE INDEX IF NOT EXISTS idx_behavior_entries_author_id ON behavior_entries(author_id);
CREATE INDEX IF NOT EXISTS idx_behavior_entries_employee_entry_id ON behavior_entries(employee_entry_id);
CREATE INDEX IF NOT EXISTS idx_behavior_entries_author_type ON behavior_entries(author_type);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON audit_logs(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON audit_logs(changed_at);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read_at ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- =====================================================
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdr_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE behaviors ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mid_year_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_year_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "CEO can update any profile" ON profiles;

-- PROFILES policies
CREATE POLICY "Allow authenticated users to view all profiles" ON profiles
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "CEO can update any profile" ON profiles
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

-- PDR PERIODS policies (CEO can manage, all can view)
CREATE POLICY "Anyone can view pdr periods" ON pdr_periods
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "CEO can manage pdr periods" ON pdr_periods
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

-- PDRS policies
CREATE POLICY "Users can view their own PDRs" ON pdrs
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "CEO can view all PDRs" ON pdrs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

CREATE POLICY "Users can create their own PDRs" ON pdrs
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own PDRs" ON pdrs
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "CEO can update any PDR" ON pdrs
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

-- GOALS policies
CREATE POLICY "Users can view goals of their PDRs" ON goals
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = goals.pdr_id AND pdrs.user_id = auth.uid()
  )
);

CREATE POLICY "CEO can view all goals" ON goals
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

CREATE POLICY "Users can manage goals of their PDRs" ON goals
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = goals.pdr_id AND pdrs.user_id = auth.uid()
  )
);

CREATE POLICY "CEO can manage all goals" ON goals
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

-- COMPANY VALUES policies (all authenticated users can view)
CREATE POLICY "Anyone can view company values" ON company_values
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "CEO can manage company values" ON company_values
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

-- BEHAVIORS policies (similar to goals)
CREATE POLICY "Users can view behaviors of their PDRs" ON behaviors
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = behaviors.pdr_id AND pdrs.user_id = auth.uid()
  )
);

CREATE POLICY "CEO can view all behaviors" ON behaviors
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

CREATE POLICY "Users can manage behaviors of their PDRs" ON behaviors
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = behaviors.pdr_id AND pdrs.user_id = auth.uid()
  )
);

CREATE POLICY "CEO can manage all behaviors" ON behaviors
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

-- BEHAVIOR ENTRIES policies
CREATE POLICY "Users can view behavior entries of their PDRs" ON behavior_entries
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = behavior_entries.pdr_id AND pdrs.user_id = auth.uid()
  )
);

CREATE POLICY "CEO can view all behavior entries" ON behavior_entries
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

CREATE POLICY "Users can create behavior entries for their PDRs" ON behavior_entries
FOR INSERT WITH CHECK (
  author_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = behavior_entries.pdr_id AND pdrs.user_id = auth.uid()
  )
);

CREATE POLICY "CEO can create behavior entries for any PDR" ON behavior_entries
FOR INSERT WITH CHECK (
  author_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

CREATE POLICY "Users can update their own behavior entries" ON behavior_entries
FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "CEO can update any behavior entry" ON behavior_entries
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

-- MID YEAR REVIEWS policies
CREATE POLICY "Users can view their mid year reviews" ON mid_year_reviews
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = mid_year_reviews.pdr_id AND pdrs.user_id = auth.uid()
  )
);

CREATE POLICY "CEO can view all mid year reviews" ON mid_year_reviews
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

CREATE POLICY "Users can manage their mid year reviews" ON mid_year_reviews
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = mid_year_reviews.pdr_id AND pdrs.user_id = auth.uid()
  )
);

CREATE POLICY "CEO can manage all mid year reviews" ON mid_year_reviews
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

-- END YEAR REVIEWS policies
CREATE POLICY "Users can view their end year reviews" ON end_year_reviews
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = end_year_reviews.pdr_id AND pdrs.user_id = auth.uid()
  )
);

CREATE POLICY "CEO can view all end year reviews" ON end_year_reviews
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

CREATE POLICY "Users can manage their end year reviews" ON end_year_reviews
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = end_year_reviews.pdr_id AND pdrs.user_id = auth.uid()
  )
);

CREATE POLICY "CEO can manage all end year reviews" ON end_year_reviews
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

-- AUDIT LOGS policies (CEO can view all, users can view their own)
CREATE POLICY "Users can view audit logs for their changes" ON audit_logs
FOR SELECT USING (changed_by = auth.uid());

CREATE POLICY "CEO can view all audit logs" ON audit_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);

CREATE POLICY "System can insert audit logs" ON audit_logs
FOR INSERT WITH CHECK (true);

-- NOTIFICATIONS policies
CREATE POLICY "Users can view their notifications" ON notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON notifications
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
FOR INSERT WITH CHECK (true);

-- =====================================================
-- 15. TRIGGERS AND FUNCTIONS
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

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
DROP TRIGGER IF EXISTS on_pdr_updated ON public.pdrs;
DROP TRIGGER IF EXISTS on_goal_updated ON public.goals;
DROP TRIGGER IF EXISTS on_behavior_updated ON public.behaviors;
DROP TRIGGER IF EXISTS on_behavior_entry_updated ON public.behavior_entries;

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

CREATE TRIGGER on_behavior_entry_updated
  BEFORE UPDATE ON public.behavior_entries
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- =====================================================
-- 16. PERMISSIONS
-- =====================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- 17. INITIAL SEED DATA
-- =====================================================

-- Insert default company values (only if table is empty)
INSERT INTO company_values (name, description, sort_order)
SELECT * FROM (VALUES 
  ('Innovation', 'We embrace creativity and continuously seek new ways to improve and grow.', 1),
  ('Integrity', 'We act with honesty, transparency, and ethical behavior in all our interactions.', 2),
  ('Collaboration', 'We work together effectively, sharing knowledge and supporting each other.', 3),
  ('Excellence', 'We strive for the highest quality in everything we do and continuously improve.', 4),
  ('Customer Focus', 'We put our customers at the center of everything we do and exceed their expectations.', 5)
) AS vals(name, description, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM company_values LIMIT 1);

-- Insert a default PDR period (only if table is empty)
INSERT INTO pdr_periods (name, start_date, end_date, is_active)
SELECT * FROM (VALUES 
  ('FY2024-2025', '2024-07-01'::date, '2025-06-30'::date, true)
) AS periods(name, start_date, end_date, is_active)
WHERE NOT EXISTS (SELECT 1 FROM pdr_periods LIMIT 1);

-- =====================================================
-- SCHEMA CREATION COMPLETE
-- =====================================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'PDR Advanced database schema created successfully!';
  RAISE NOTICE 'Tables created: profiles, pdr_periods, pdrs, goals, company_values, behaviors, behavior_entries, mid_year_reviews, end_year_reviews, audit_logs, notifications';
  RAISE NOTICE 'RLS policies enabled and configured for role-based access control';
  RAISE NOTICE 'Indexes created for optimal performance';
  RAISE NOTICE 'Triggers configured for automatic timestamps and user profile creation';
  RAISE NOTICE 'Initial seed data inserted for company values and PDR periods';
END
$$;
