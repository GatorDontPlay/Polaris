-- =====================================================
-- SUPABASE SCHEMA FIX - USER_ID COLUMN ERROR
-- =====================================================
-- This fixes the "user_id does not exist" error by ensuring proper table creation order

-- First, let's check if we need to add the missing column to profiles table
-- This handles the case where profiles table exists but is missing the user_id reference

-- Check if profiles table exists and has the right structure
DO $$
BEGIN
    -- If profiles table exists but doesn't have proper structure, let's fix it
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        -- Add user_id column if it doesn't exist (some schemas might have this)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_id' AND table_schema = 'public') THEN
            -- This is likely not the issue, but just in case
            ALTER TABLE profiles ADD COLUMN user_id UUID;
        END IF;
    END IF;
END $$;

-- Now let's run a simpler, step-by-step schema creation that avoids the error

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

-- Step 1: Create or ensure profiles table exists with correct structure
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

-- Step 2: Create supporting tables that don't reference profiles
CREATE TABLE IF NOT EXISTS pdr_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_values (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Now create PDRs table (this is where the error was occurring)
-- Let's be very explicit about the foreign key reference
CREATE TABLE IF NOT EXISTS pdrs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  period_id UUID,
  fy_label TEXT NOT NULL,
  fy_start_date DATE NOT NULL,
  fy_end_date DATE NOT NULL,
  status pdr_status NOT NULL DEFAULT 'Created',
  current_step INTEGER NOT NULL DEFAULT 1,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_by UUID,
  locked_at TIMESTAMP WITH TIME ZONE,
  meeting_booked BOOLEAN NOT NULL DEFAULT false,
  meeting_date TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, fy_label)
);

-- Step 4: Add foreign key constraints after tables exist
-- Add foreign key constraints only if they don't already exist
DO $$
BEGIN
    -- Add foreign key for user_id -> profiles(id)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pdrs_user_id_fkey' 
        AND table_name = 'pdrs'
    ) THEN
        ALTER TABLE pdrs ADD CONSTRAINT pdrs_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Add foreign key for period_id -> pdr_periods(id)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pdrs_period_id_fkey' 
        AND table_name = 'pdrs'
    ) THEN
        ALTER TABLE pdrs ADD CONSTRAINT pdrs_period_id_fkey 
        FOREIGN KEY (period_id) REFERENCES pdr_periods(id);
    END IF;
    
    -- Add foreign key for locked_by -> profiles(id)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pdrs_locked_by_fkey' 
        AND table_name = 'pdrs'
    ) THEN
        ALTER TABLE pdrs ADD CONSTRAINT pdrs_locked_by_fkey 
        FOREIGN KEY (locked_by) REFERENCES profiles(id);
    END IF;
END $$;

-- Step 5: Create remaining tables
CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pdr_id UUID NOT NULL,
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

-- Add foreign key for goals
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'goals_pdr_id_fkey' 
        AND table_name = 'goals'
    ) THEN
        ALTER TABLE goals ADD CONSTRAINT goals_pdr_id_fkey 
        FOREIGN KEY (pdr_id) REFERENCES pdrs(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS behaviors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pdr_id UUID NOT NULL,
  value_id UUID NOT NULL,
  description TEXT,
  examples TEXT,
  employee_rating INTEGER CHECK (employee_rating >= 1 AND employee_rating <= 5),
  employee_feedback TEXT,
  ceo_rating INTEGER CHECK (ceo_rating >= 1 AND ceo_rating <= 5),
  ceo_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign keys for behaviors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'behaviors_pdr_id_fkey' 
        AND table_name = 'behaviors'
    ) THEN
        ALTER TABLE behaviors ADD CONSTRAINT behaviors_pdr_id_fkey 
        FOREIGN KEY (pdr_id) REFERENCES pdrs(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'behaviors_value_id_fkey' 
        AND table_name = 'behaviors'
    ) THEN
        ALTER TABLE behaviors ADD CONSTRAINT behaviors_value_id_fkey 
        FOREIGN KEY (value_id) REFERENCES company_values(id);
    END IF;
    
    -- Add unique constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'behaviors_pdr_id_value_id_key' 
        AND table_name = 'behaviors'
    ) THEN
        ALTER TABLE behaviors ADD CONSTRAINT behaviors_pdr_id_value_id_key 
        UNIQUE(pdr_id, value_id);
    END IF;
END $$;

-- Continue with remaining tables...
CREATE TABLE IF NOT EXISTS behavior_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pdr_id UUID NOT NULL,
  value_id UUID NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  impact TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign keys for behavior_entries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'behavior_entries_pdr_id_fkey' 
        AND table_name = 'behavior_entries'
    ) THEN
        ALTER TABLE behavior_entries ADD CONSTRAINT behavior_entries_pdr_id_fkey 
        FOREIGN KEY (pdr_id) REFERENCES pdrs(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'behavior_entries_value_id_fkey' 
        AND table_name = 'behavior_entries'
    ) THEN
        ALTER TABLE behavior_entries ADD CONSTRAINT behavior_entries_value_id_fkey 
        FOREIGN KEY (value_id) REFERENCES company_values(id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS mid_year_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pdr_id UUID NOT NULL,
  employee_reflection TEXT,
  employee_achievements TEXT,
  employee_challenges TEXT,
  employee_goals_progress TEXT,
  ceo_feedback TEXT,
  ceo_support_needed TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign keys and constraints for mid_year_reviews
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'mid_year_reviews_pdr_id_fkey' 
        AND table_name = 'mid_year_reviews'
    ) THEN
        ALTER TABLE mid_year_reviews ADD CONSTRAINT mid_year_reviews_pdr_id_fkey 
        FOREIGN KEY (pdr_id) REFERENCES pdrs(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'mid_year_reviews_pdr_id_key' 
        AND table_name = 'mid_year_reviews'
    ) THEN
        ALTER TABLE mid_year_reviews ADD CONSTRAINT mid_year_reviews_pdr_id_key 
        UNIQUE(pdr_id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS end_year_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pdr_id UUID NOT NULL,
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign keys and constraints for end_year_reviews
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'end_year_reviews_pdr_id_fkey' 
        AND table_name = 'end_year_reviews'
    ) THEN
        ALTER TABLE end_year_reviews ADD CONSTRAINT end_year_reviews_pdr_id_fkey 
        FOREIGN KEY (pdr_id) REFERENCES pdrs(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'end_year_reviews_pdr_id_key' 
        AND table_name = 'end_year_reviews'
    ) THEN
        ALTER TABLE end_year_reviews ADD CONSTRAINT end_year_reviews_pdr_id_key 
        UNIQUE(pdr_id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action audit_action NOT NULL,
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key for audit_logs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'audit_logs_user_id_fkey' 
        AND table_name = 'audit_logs'
    ) THEN
        ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pdr_id UUID,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign keys for notifications
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_user_id_fkey' 
        AND table_name = 'notifications'
    ) THEN
        ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_pdr_id_fkey' 
        AND table_name = 'notifications'
    ) THEN
        ALTER TABLE notifications ADD CONSTRAINT notifications_pdr_id_fkey 
        FOREIGN KEY (pdr_id) REFERENCES pdrs(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Enable RLS on all tables
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

-- Insert initial data (company values and PDR periods)
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

INSERT INTO public.pdr_periods (id, name, start_date, end_date, is_active) 
SELECT gen_random_uuid(), 'FY 2024-2025', '2024-07-01', '2025-06-30', true
WHERE NOT EXISTS (SELECT 1 FROM public.pdr_periods WHERE name = 'FY 2024-2025');

INSERT INTO public.pdr_periods (id, name, start_date, end_date, is_active) 
SELECT gen_random_uuid(), 'FY 2023-2024', '2023-07-01', '2024-06-30', false
WHERE NOT EXISTS (SELECT 1 FROM public.pdr_periods WHERE name = 'FY 2023-2024');

SELECT 'Schema creation completed successfully! Tables and constraints added.' as status;
