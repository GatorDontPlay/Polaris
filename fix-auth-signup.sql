-- Fix authentication signup issues
-- Run this in Supabase SQL Editor to fix signup problems

-- 1. Create user_role enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('EMPLOYEE', 'CEO');
    END IF;
END $$;

-- 2. Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
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

-- 3. Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "CEO can update any profile" ON public.profiles;

-- 5. Create RLS policies
CREATE POLICY "Allow authenticated users to view all profiles" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "CEO can update any profile" ON public.profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'CEO'
        )
    );

-- 6. Drop existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 7. Create the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
AS $$
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
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error (this will appear in Supabase logs)
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        -- Re-raise the error to fail the user creation
        RAISE;
END;
$$ LANGUAGE plpgsql;

-- 8. Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

SELECT 'Authentication setup completed successfully!' as status;

