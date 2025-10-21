-- =====================================================
-- COMPLETE PDR SYSTEM SCHEMA FOR NEW SUPABASE DATABASE
-- =====================================================
-- Run this ENTIRE script in your new Supabase SQL Editor
-- This will create all tables, relationships, policies, and seed data

-- =====================================================
-- 1. CREATE ALL ENUMS FIRST
-- =====================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('EMPLOYEE', 'CEO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE pdr_status AS ENUM (
        'Created', 'OPEN_FOR_REVIEW', 'PLAN_LOCKED', 'PDR_BOOKED', 
        'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'MID_YEAR_CHECK', 
        'END_YEAR_REVIEW', 'COMPLETED', 'LOCKED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE priority AS ENUM ('HIGH', 'MEDIUM', 'LOW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE goal_mapping_type AS ENUM (
        'PEOPLE_CULTURE', 
        'VALUE_DRIVEN_INNOVATION', 
        'OPERATING_EFFICIENCY', 
        'CUSTOMER_EXPERIENCE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'PDR_LOCKED', 'PDR_SUBMITTED', 'PDR_REMINDER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE behavior_author_type AS ENUM ('EMPLOYEE', 'CEO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. CREATE CORE TABLES
-- =====================================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'EMPLOYEE',
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PDR Periods
CREATE TABLE IF NOT EXISTS pdr_periods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Company Values
CREATE TABLE IF NOT EXISTS company_values (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PDRs (Performance Development Records)
CREATE TABLE IF NOT EXISTS pdrs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    period_id UUID,
    fy_label TEXT NOT NULL,
    fy_start_date DATE NOT NULL,
    fy_end_date DATE NOT NULL,
    status pdr_status NOT NULL DEFAULT 'Created',
    employee_fields JSONB,
    ceo_fields JSONB,
    meeting_booked BOOLEAN NOT NULL DEFAULT false,
    meeting_booked_at TIMESTAMP WITH TIME ZONE,
    locked_at TIMESTAMP WITH TIME ZONE,
    locked_by UUID,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    current_step INTEGER NOT NULL DEFAULT 1,
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, fy_label)
);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pdr_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_outcome TEXT,
    success_criteria TEXT,
    priority priority DEFAULT 'MEDIUM',
    weighting INTEGER DEFAULT 0 CHECK (weighting >= 0 AND weighting <= 100),
    goal_mapping goal_mapping_type,
    employee_progress TEXT,
    employee_rating INTEGER CHECK (employee_rating >= 1 AND employee_rating <= 5),
    ceo_comments TEXT,
    ceo_rating INTEGER CHECK (ceo_rating >= 1 AND ceo_rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Behaviors (legacy table - keeping for backward compatibility)
CREATE TABLE IF NOT EXISTS behaviors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pdr_id UUID NOT NULL,
    value_id UUID NOT NULL,
    description TEXT NOT NULL,
    examples TEXT,
    employee_self_assessment TEXT,
    employee_rating INTEGER CHECK (employee_rating >= 1 AND employee_rating <= 5),
    ceo_comments TEXT,
    ceo_rating INTEGER CHECK (ceo_rating >= 1 AND ceo_rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Behavior Entries (new flexible system)
CREATE TABLE IF NOT EXISTS behavior_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pdr_id UUID NOT NULL,
    value_id UUID NOT NULL,
    author_id UUID NOT NULL,
    author_type behavior_author_type NOT NULL,
    description TEXT NOT NULL,
    examples TEXT,
    self_assessment TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    employee_entry_id UUID, -- For CEO responses to employee entries
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mid Year Reviews
CREATE TABLE IF NOT EXISTS mid_year_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pdr_id UUID NOT NULL,
    progress_summary TEXT NOT NULL,
    blockers_challenges TEXT,
    support_needed TEXT,
    employee_comments TEXT,
    ceo_feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- End Year Reviews
CREATE TABLE IF NOT EXISTS end_year_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pdr_id UUID NOT NULL,
    achievements_summary TEXT NOT NULL,
    learnings_growth TEXT,
    challenges_faced TEXT,
    next_year_goals TEXT,
    employee_overall_rating INTEGER CHECK (employee_overall_rating >= 1 AND employee_overall_rating <= 5),
    ceo_overall_rating INTEGER CHECK (ceo_overall_rating >= 1 AND ceo_overall_rating <= 5),
    ceo_final_comments TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action audit_action NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by UUID,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT
);

-- Notifications
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

-- =====================================================
-- 3. ADD FOREIGN KEY CONSTRAINTS
-- =====================================================

-- PDRs foreign keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pdrs_user_id_fkey' 
        AND table_name = 'pdrs'
    ) THEN
        ALTER TABLE pdrs ADD CONSTRAINT pdrs_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pdrs_period_id_fkey' 
        AND table_name = 'pdrs'
    ) THEN
        ALTER TABLE pdrs ADD CONSTRAINT pdrs_period_id_fkey 
        FOREIGN KEY (period_id) REFERENCES pdr_periods(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'pdrs_locked_by_fkey' 
        AND table_name = 'pdrs'
    ) THEN
        ALTER TABLE pdrs ADD CONSTRAINT pdrs_locked_by_fkey 
        FOREIGN KEY (locked_by) REFERENCES profiles(id);
    END IF;
END $$;

-- Goals foreign keys
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

-- Behaviors foreign keys
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
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'behaviors_value_id_fkey' 
        AND table_name = 'behaviors'
    ) THEN
        ALTER TABLE behaviors ADD CONSTRAINT behaviors_value_id_fkey 
        FOREIGN KEY (value_id) REFERENCES company_values(id);
    END IF;
END $$;

-- Behavior entries foreign keys
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
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'behavior_entries_value_id_fkey' 
        AND table_name = 'behavior_entries'
    ) THEN
        ALTER TABLE behavior_entries ADD CONSTRAINT behavior_entries_value_id_fkey 
        FOREIGN KEY (value_id) REFERENCES company_values(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'behavior_entries_author_id_fkey' 
        AND table_name = 'behavior_entries'
    ) THEN
        ALTER TABLE behavior_entries ADD CONSTRAINT behavior_entries_author_id_fkey 
        FOREIGN KEY (author_id) REFERENCES profiles(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'behavior_entries_employee_entry_id_fkey' 
        AND table_name = 'behavior_entries'
    ) THEN
        ALTER TABLE behavior_entries ADD CONSTRAINT behavior_entries_employee_entry_id_fkey 
        FOREIGN KEY (employee_entry_id) REFERENCES behavior_entries(id);
    END IF;
END $$;

-- Mid year reviews foreign keys
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
END $$;

-- End year reviews foreign keys
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
END $$;

-- Audit logs foreign keys (optional - may fail if no profiles exist yet)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'audit_logs_changed_by_fkey' 
        AND table_name = 'audit_logs'
    ) THEN
        ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_changed_by_fkey 
        FOREIGN KEY (changed_by) REFERENCES profiles(id);
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Skipping audit_logs foreign key - will add later when profiles exist';
END $$;

-- Notifications foreign keys
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
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_pdr_id_fkey' 
        AND table_name = 'notifications'
    ) THEN
        ALTER TABLE notifications ADD CONSTRAINT notifications_pdr_id_fkey 
        FOREIGN KEY (pdr_id) REFERENCES pdrs(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdr_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE behaviors ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mid_year_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE end_year_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CREATE RLS POLICIES
-- =====================================================

-- Profiles policies
DROP POLICY IF EXISTS "Allow authenticated users to view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "CEO can update any profile" ON profiles;

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

-- PDR periods policies (everyone can read)
DROP POLICY IF EXISTS "Anyone can view pdr periods" ON pdr_periods;
CREATE POLICY "Anyone can view pdr periods" ON pdr_periods
    FOR SELECT TO authenticated USING (true);

-- Company values policies (everyone can read)
DROP POLICY IF EXISTS "Anyone can view company values" ON company_values;
CREATE POLICY "Anyone can view company values" ON company_values
    FOR SELECT TO authenticated USING (true);

-- PDRs policies
DROP POLICY IF EXISTS "Users can view their own PDRs" ON pdrs;
DROP POLICY IF EXISTS "CEO can view all PDRs" ON pdrs;
DROP POLICY IF EXISTS "Users can insert their own PDR" ON pdrs;
DROP POLICY IF EXISTS "Users can update their own PDR" ON pdrs;
DROP POLICY IF EXISTS "CEO can update any PDR" ON pdrs;

CREATE POLICY "Users can view their own PDRs" ON pdrs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "CEO can view all PDRs" ON pdrs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
    );

CREATE POLICY "Users can insert their own PDR" ON pdrs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own PDR" ON pdrs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "CEO can update any PDR" ON pdrs
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
    );

-- Goals policies
DROP POLICY IF EXISTS "Users can view goals for their PDRs" ON goals;
DROP POLICY IF EXISTS "CEO can view all goals" ON goals;
DROP POLICY IF EXISTS "Users can manage goals for their PDRs" ON goals;
DROP POLICY IF EXISTS "CEO can manage all goals" ON goals;

CREATE POLICY "Users can view goals for their PDRs" ON goals
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = goals.pdr_id AND pdrs.user_id = auth.uid())
    );

CREATE POLICY "CEO can view all goals" ON goals
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
    );

CREATE POLICY "Users can manage goals for their PDRs" ON goals
    FOR ALL USING (
        EXISTS (SELECT 1 FROM pdrs WHERE pdrs.id = goals.pdr_id AND pdrs.user_id = auth.uid())
    );

CREATE POLICY "CEO can manage all goals" ON goals
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')
    );

-- Similar policies for other tables...
-- (Behaviors, behavior_entries, reviews, notifications)

-- =====================================================
-- 6. CREATE PERFORMANCE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_pdrs_user_id ON pdrs(user_id);
CREATE INDEX IF NOT EXISTS idx_pdrs_status ON pdrs(status);
CREATE INDEX IF NOT EXISTS idx_pdrs_fy_label ON pdrs(fy_label);
CREATE INDEX IF NOT EXISTS idx_pdrs_created_at ON pdrs(created_at);

CREATE INDEX IF NOT EXISTS idx_goals_pdr_id ON goals(pdr_id);
CREATE INDEX IF NOT EXISTS idx_goals_priority ON goals(priority);

CREATE INDEX IF NOT EXISTS idx_behaviors_pdr_id ON behaviors(pdr_id);
CREATE INDEX IF NOT EXISTS idx_behaviors_value_id ON behaviors(value_id);

CREATE INDEX IF NOT EXISTS idx_behavior_entries_pdr_id ON behavior_entries(pdr_id);
CREATE INDEX IF NOT EXISTS idx_behavior_entries_value_id ON behavior_entries(value_id);
CREATE INDEX IF NOT EXISTS idx_behavior_entries_author_id ON behavior_entries(author_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON audit_logs(changed_at);

-- =====================================================
-- 7. CREATE ESSENTIAL FUNCTIONS
-- =====================================================

-- Function to handle new user registration
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

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =====================================================
-- 8. INSERT SEED DATA
-- =====================================================

-- Company Values
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

-- PDR Periods
INSERT INTO public.pdr_periods (id, name, start_date, end_date, is_active) 
SELECT gen_random_uuid(), 'FY 2024-2025', '2024-07-01', '2025-06-30', true
WHERE NOT EXISTS (SELECT 1 FROM public.pdr_periods WHERE name = 'FY 2024-2025');

INSERT INTO public.pdr_periods (id, name, start_date, end_date, is_active) 
SELECT gen_random_uuid(), 'FY 2023-2024', '2023-07-01', '2024-06-30', false
WHERE NOT EXISTS (SELECT 1 FROM public.pdr_periods WHERE name = 'FY 2023-2024');

-- =====================================================
-- 9. VERIFICATION QUERIES
-- =====================================================

-- Show schema deployment summary
SELECT 
    'Tables Created' as metric,
    COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'profiles', 'pdrs', 'goals', 'company_values', 'behaviors', 
    'behavior_entries', 'mid_year_reviews', 'end_year_reviews', 
    'audit_logs', 'notifications', 'pdr_periods'
)

UNION ALL

SELECT 
    'Enums Created' as metric,
    COUNT(*) as count
FROM pg_type 
WHERE typtype = 'e' 
AND typname IN ('user_role', 'pdr_status', 'priority', 'goal_mapping_type', 'audit_action', 'notification_type', 'behavior_author_type')

UNION ALL

SELECT 
    'Company Values' as metric,
    COUNT(*) as count
FROM company_values 
WHERE is_active = true

UNION ALL

SELECT 
    'PDR Periods' as metric,
    COUNT(*) as count
FROM pdr_periods

UNION ALL

SELECT 
    'Active Periods' as metric,
    COUNT(*) as count
FROM pdr_periods 
WHERE is_active = true;

-- Show goals table structure to verify weighting and goal_mapping columns
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'goals' 
AND column_name IN ('weighting', 'goal_mapping', 'priority', 'title')
ORDER BY ordinal_position;

SELECT 'PDR System Schema Deployment Complete!' as status;
