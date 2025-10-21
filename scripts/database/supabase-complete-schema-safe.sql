-- =====================================================
-- COMPLETE PDR SUPABASE SCHEMA - SAFE VERSION
-- =====================================================
-- This version uses IF NOT EXISTS and DROP IF EXISTS to be idempotent
-- Safe to run multiple times without errors

-- Create user roles enum (only if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('EMPLOYEE', 'CEO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create other enums
DO $$ BEGIN
    CREATE TYPE pdr_status AS ENUM ('Created', 'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'OPEN_FOR_REVIEW', 'PLAN_LOCKED', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE goal_priority AS ENUM ('HIGH', 'MEDIUM', 'LOW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('PDR_CREATED', 'PDR_SUBMITTED', 'PDR_REVIEWED', 'GOAL_UPDATED', 'BEHAVIOR_UPDATED', 'DEADLINE_REMINDER', 'MEETING_SCHEDULED', 'GENERAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create profiles table (extends auth.users)
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

-- Create PDR periods table
CREATE TABLE IF NOT EXISTS pdr_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create PDRs table
CREATE TABLE IF NOT EXISTS pdrs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_id UUID REFERENCES pdr_periods(id),
  fy_label TEXT NOT NULL,
  fy_start_date DATE NOT NULL,
  fy_end_date DATE NOT NULL,
  status pdr_status NOT NULL DEFAULT 'Created',
  current_step INTEGER NOT NULL DEFAULT 1,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_by UUID REFERENCES profiles(id),
  locked_at TIMESTAMP WITH TIME ZONE,
  meeting_booked BOOLEAN NOT NULL DEFAULT false,
  meeting_date TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, fy_label)
);

-- Create company values table
CREATE TABLE IF NOT EXISTS company_values (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pdr_id UUID NOT NULL REFERENCES pdrs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_outcome TEXT,
  success_criteria TEXT,
  priority goal_priority DEFAULT 'MEDIUM',
  employee_rating INTEGER CHECK (employee_rating >= 1 AND employee_rating <= 5),
  employee_feedback TEXT,
  ceo_rating INTEGER CHECK (ceo_rating >= 1 AND ceo_rating <= 5),
  ceo_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create behaviors table
CREATE TABLE IF NOT EXISTS behaviors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pdr_id UUID NOT NULL REFERENCES pdrs(id) ON DELETE CASCADE,
  value_id UUID NOT NULL REFERENCES company_values(id),
  description TEXT,
  examples TEXT,
  employee_rating INTEGER CHECK (employee_rating >= 1 AND employee_rating <= 5),
  employee_feedback TEXT,
  ceo_rating INTEGER CHECK (ceo_rating >= 1 AND ceo_rating <= 5),
  ceo_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pdr_id, value_id)
);

-- Create behavior entries table (for historical tracking)
CREATE TABLE IF NOT EXISTS behavior_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pdr_id UUID NOT NULL REFERENCES pdrs(id) ON DELETE CASCADE,
  value_id UUID NOT NULL REFERENCES company_values(id),
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  impact TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create mid year reviews table
CREATE TABLE IF NOT EXISTS mid_year_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pdr_id UUID NOT NULL REFERENCES pdrs(id) ON DELETE CASCADE,
  employee_reflection TEXT,
  employee_achievements TEXT,
  employee_challenges TEXT,
  employee_goals_progress TEXT,
  ceo_feedback TEXT,
  ceo_support_needed TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pdr_id)
);

-- Create end year reviews table
CREATE TABLE IF NOT EXISTS end_year_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pdr_id UUID NOT NULL REFERENCES pdrs(id) ON DELETE CASCADE,
  employee_self_assessment TEXT,
  employee_achievements TEXT,
  employee_development_areas TEXT,
  employee_career_goals TEXT,
  employee_overall_rating INTEGER CHECK (employee_overall_rating >= 1 AND employee_overall_rating <= 5),
  ceo_assessment TEXT,
  ceo_achievements_feedback TEXT,
  ceo_development_feedback TEXT,
  ceo_career_support TEXT,
  ceo_overall_rating INTEGER CHECK (ceo_overall_rating >= 1 AND ceo_overall_rating <= 5),
  development_plan TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pdr_id)
);

-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action audit_action NOT NULL,
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES profiles(id),
  ip_address TEXT,
  user_agent TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pdr_id UUID REFERENCES pdrs(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS) for all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdr_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE behaviors ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mid_year_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_year_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "CEO can update any profile" ON profiles;

DROP POLICY IF EXISTS "Anyone can view pdr periods" ON pdr_periods;
DROP POLICY IF EXISTS "Only authenticated users can view pdr periods" ON pdr_periods;

DROP POLICY IF EXISTS "Users can view their own PDRs" ON pdrs;
DROP POLICY IF EXISTS "CEO can view all PDRs" ON pdrs;
DROP POLICY IF EXISTS "Users can insert their own PDR" ON pdrs;
DROP POLICY IF EXISTS "Users can update their own PDR" ON pdrs;
DROP POLICY IF EXISTS "CEO can update any PDR" ON pdrs;

DROP POLICY IF EXISTS "Anyone can view company values" ON company_values;

DROP POLICY IF EXISTS "Users can view goals for their PDRs" ON goals;
DROP POLICY IF EXISTS "CEO can view all goals" ON goals;
DROP POLICY IF EXISTS "Users can insert goals for their PDRs" ON goals;
DROP POLICY IF EXISTS "Users can update goals for their PDRs" ON goals;
DROP POLICY IF EXISTS "CEO can update any goal" ON goals;

DROP POLICY IF EXISTS "Users can view behaviors for their PDRs" ON behaviors;
DROP POLICY IF EXISTS "CEO can view all behaviors" ON behaviors;
DROP POLICY IF EXISTS "Users can insert behaviors for their PDRs" ON behaviors;
DROP POLICY IF EXISTS "Users can update behaviors for their PDRs" ON behaviors;
DROP POLICY IF EXISTS "CEO can update any behavior" ON behaviors;

DROP POLICY IF EXISTS "Users can view behavior entries for their PDRs" ON behavior_entries;
DROP POLICY IF EXISTS "CEO can view all behavior entries" ON behavior_entries;
DROP POLICY IF EXISTS "Users can insert behavior entries for their PDRs" ON behavior_entries;
DROP POLICY IF EXISTS "Users can update behavior entries for their PDRs" ON behavior_entries;
DROP POLICY IF EXISTS "CEO can update any behavior entry" ON behavior_entries;

DROP POLICY IF EXISTS "Users can view their mid year reviews" ON mid_year_reviews;
DROP POLICY IF EXISTS "CEO can view all mid year reviews" ON mid_year_reviews;
DROP POLICY IF EXISTS "Users can insert their own mid year review" ON mid_year_reviews;
DROP POLICY IF EXISTS "Users can update their own mid year review" ON mid_year_reviews;
DROP POLICY IF EXISTS "CEO can update any mid year review" ON mid_year_reviews;

DROP POLICY IF EXISTS "Users can view their end year reviews" ON end_year_reviews;
DROP POLICY IF EXISTS "CEO can view all end year reviews" ON end_year_reviews;
DROP POLICY IF EXISTS "Users can insert their own end year review" ON end_year_reviews;
DROP POLICY IF EXISTS "Users can update their own end year review" ON end_year_reviews;
DROP POLICY IF EXISTS "CEO can update any end year review" ON end_year_reviews;

DROP POLICY IF EXISTS "CEO can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can view audit logs for their records" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- Create policies for profiles table
CREATE POLICY "Allow authenticated users to view all profiles" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "CEO can update any profile" ON profiles FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO'));

-- Create policies for pdr_periods table
CREATE POLICY "Anyone can view pdr periods" ON pdr_periods FOR SELECT TO authenticated USING (true);

-- Create policies for pdrs table
CREATE POLICY "Users can view their own PDRs" ON pdrs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "CEO can view all PDRs" ON pdrs FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO'));
CREATE POLICY "Users can insert their own PDR" ON pdrs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own PDR" ON pdrs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "CEO can update any PDR" ON pdrs FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO'));

-- Create policies for company_values table
CREATE POLICY "Anyone can view company values" ON company_values FOR SELECT TO authenticated USING (true);

-- Create policies for goals table
CREATE POLICY "Users can view goals for their PDRs" ON goals FOR SELECT USING (EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = goals.pdr_id AND pdrs.user_id = auth.uid()));
CREATE POLICY "CEO can view all goals" ON goals FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO'));
CREATE POLICY "Users can insert goals for their PDRs" ON goals FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = goals.pdr_id AND pdrs.user_id = auth.uid()));
CREATE POLICY "Users can update goals for their PDRs" ON goals FOR UPDATE USING (EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = goals.pdr_id AND pdrs.user_id = auth.uid()));
CREATE POLICY "CEO can update any goal" ON goals FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO'));

-- Create policies for behaviors table
CREATE POLICY "Users can view behaviors for their PDRs" ON behaviors FOR SELECT USING (EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = behaviors.pdr_id AND pdrs.user_id = auth.uid()));
CREATE POLICY "CEO can view all behaviors" ON behaviors FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO'));
CREATE POLICY "Users can insert behaviors for their PDRs" ON behaviors FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = behaviors.pdr_id AND pdrs.user_id = auth.uid()));
CREATE POLICY "Users can update behaviors for their PDRs" ON behaviors FOR UPDATE USING (EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = behaviors.pdr_id AND pdrs.user_id = auth.uid()));
CREATE POLICY "CEO can update any behavior" ON behaviors FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO'));

-- Create policies for behavior_entries table
CREATE POLICY "Users can view behavior entries for their PDRs" ON behavior_entries FOR SELECT USING (EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = behavior_entries.pdr_id AND pdrs.user_id = auth.uid()));
CREATE POLICY "CEO can view all behavior entries" ON behavior_entries FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO'));
CREATE POLICY "Users can insert behavior entries for their PDRs" ON behavior_entries FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = behavior_entries.pdr_id AND pdrs.user_id = auth.uid()));
CREATE POLICY "Users can update behavior entries for their PDRs" ON behavior_entries FOR UPDATE USING (EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = behavior_entries.pdr_id AND pdrs.user_id = auth.uid()));
CREATE POLICY "CEO can update any behavior entry" ON behavior_entries FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO'));

-- Create policies for mid_year_reviews table
CREATE POLICY "Users can view their mid year reviews" ON mid_year_reviews FOR SELECT USING (EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = mid_year_reviews.pdr_id AND pdrs.user_id = auth.uid()));
CREATE POLICY "CEO can view all mid year reviews" ON mid_year_reviews FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO'));
CREATE POLICY "Users can insert their own mid year review" ON mid_year_reviews FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = mid_year_reviews.pdr_id AND pdrs.user_id = auth.uid()));
CREATE POLICY "Users can update their own mid year review" ON mid_year_reviews FOR UPDATE USING (EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = mid_year_reviews.pdr_id AND pdrs.user_id = auth.uid()));
CREATE POLICY "CEO can update any mid year review" ON mid_year_reviews FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO'));

-- Create policies for end_year_reviews table
CREATE POLICY "Users can view their end year reviews" ON end_year_reviews FOR SELECT USING (EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = end_year_reviews.pdr_id AND pdrs.user_id = auth.uid()));
CREATE POLICY "CEO can view all end year reviews" ON end_year_reviews FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO'));
CREATE POLICY "Users can insert their own end year review" ON end_year_reviews FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = end_year_reviews.pdr_id AND pdrs.user_id = auth.uid()));
CREATE POLICY "Users can update their own end year review" ON end_year_reviews FOR UPDATE USING (EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = end_year_reviews.pdr_id AND pdrs.user_id = auth.uid()));
CREATE POLICY "CEO can update any end year review" ON end_year_reviews FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO'));

-- Create policies for audit_logs table
CREATE POLICY "CEO can view all audit logs" ON audit_logs FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO'));
CREATE POLICY "Users can view audit logs for their records" ON audit_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (true);

-- Create policies for notifications table
CREATE POLICY "Users can view their notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON notifications FOR INSERT WITH CHECK (true);

-- Drop existing functions first
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

-- Create function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'EMPLOYEE'::user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update profile updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at() 
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
DROP TRIGGER IF EXISTS on_pdr_period_updated ON public.pdr_periods;
DROP TRIGGER IF EXISTS on_pdr_updated ON public.pdrs;
DROP TRIGGER IF EXISTS on_company_value_updated ON public.company_values;
DROP TRIGGER IF EXISTS on_goal_updated ON public.goals;
DROP TRIGGER IF EXISTS on_behavior_updated ON public.behaviors;
DROP TRIGGER IF EXISTS on_behavior_entry_updated ON public.behavior_entries;
DROP TRIGGER IF EXISTS on_mid_year_review_updated ON public.mid_year_reviews;
DROP TRIGGER IF EXISTS on_end_year_review_updated ON public.end_year_reviews;

-- Create triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_pdr_period_updated
  BEFORE UPDATE ON public.pdr_periods
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_pdr_updated
  BEFORE UPDATE ON public.pdrs
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_company_value_updated
  BEFORE UPDATE ON public.company_values
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

CREATE TRIGGER on_mid_year_review_updated
  BEFORE UPDATE ON public.mid_year_reviews
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_end_year_review_updated
  BEFORE UPDATE ON public.end_year_reviews
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_pdrs_user_id ON pdrs(user_id);
CREATE INDEX IF NOT EXISTS idx_pdrs_status ON pdrs(status);
CREATE INDEX IF NOT EXISTS idx_pdrs_fy_label ON pdrs(fy_label);
CREATE INDEX IF NOT EXISTS idx_goals_pdr_id ON goals(pdr_id);
CREATE INDEX IF NOT EXISTS idx_behaviors_pdr_id ON behaviors(pdr_id);
CREATE INDEX IF NOT EXISTS idx_behaviors_value_id ON behaviors(value_id);
CREATE INDEX IF NOT EXISTS idx_behavior_entries_pdr_id ON behavior_entries(pdr_id);
CREATE INDEX IF NOT EXISTS idx_mid_year_reviews_pdr_id ON mid_year_reviews(pdr_id);
CREATE INDEX IF NOT EXISTS idx_end_year_reviews_pdr_id ON end_year_reviews(pdr_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON audit_logs(changed_at);

-- Initial Data Seeding

-- Insert Company Values (only if they don't exist)
INSERT INTO public.company_values (id, name, description, sort_order) 
SELECT gen_random_uuid(), 'Integrity', 'Acting with honesty and transparency in all interactions', 1
WHERE NOT EXISTS (SELECT 1 FROM public.company_values WHERE name = 'Integrity');

INSERT INTO public.company_values (id, name, description, sort_order) 
SELECT gen_random_uuid(), 'Innovation', 'Embracing creative solutions and continuous improvement', 2
WHERE NOT EXISTS (SELECT 1 FROM public.company_values WHERE name = 'Innovation');

INSERT INTO public.company_values (id, name, description, sort_order) 
SELECT gen_random_uuid(), 'Collaboration', 'Working effectively with others to achieve common goals', 3
WHERE NOT EXISTS (SELECT 1 FROM public.company_values WHERE name = 'Collaboration');

INSERT INTO public.company_values (id, name, description, sort_order) 
SELECT gen_random_uuid(), 'Excellence', 'Striving for the highest quality in all deliverables', 4
WHERE NOT EXISTS (SELECT 1 FROM public.company_values WHERE name = 'Excellence');

INSERT INTO public.company_values (id, name, description, sort_order) 
SELECT gen_random_uuid(), 'Customer Focus', 'Putting customer needs at the center of our decisions', 5
WHERE NOT EXISTS (SELECT 1 FROM public.company_values WHERE name = 'Customer Focus');

INSERT INTO public.company_values (id, name, description, sort_order) 
SELECT gen_random_uuid(), 'Self Reflection', 'Engaging in thoughtful self-assessment and continuous learning', 6
WHERE NOT EXISTS (SELECT 1 FROM public.company_values WHERE name = 'Self Reflection');

-- Insert PDR Periods (only if they don't exist)
INSERT INTO public.pdr_periods (id, name, start_date, end_date, is_active) 
SELECT gen_random_uuid(), 'FY 2024-2025', '2024-07-01', '2025-06-30', true
WHERE NOT EXISTS (SELECT 1 FROM public.pdr_periods WHERE name = 'FY 2024-2025');

INSERT INTO public.pdr_periods (id, name, start_date, end_date, is_active) 
SELECT gen_random_uuid(), 'FY 2023-2024', '2023-07-01', '2024-06-30', false
WHERE NOT EXISTS (SELECT 1 FROM public.pdr_periods WHERE name = 'FY 2023-2024');

INSERT INTO public.pdr_periods (id, name, start_date, end_date, is_active) 
SELECT gen_random_uuid(), 'FY 2025-2026', '2025-07-01', '2026-06-30', false
WHERE NOT EXISTS (SELECT 1 FROM public.pdr_periods WHERE name = 'FY 2025-2026');

-- Final success message
SELECT 'Supabase PDR schema setup completed successfully!' as status;
