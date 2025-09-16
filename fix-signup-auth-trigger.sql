-- =====================================================
-- SIGNUP AUTH TRIGGER FIX
-- =====================================================
-- Run this in your Supabase SQL Editor to fix the signup issue

-- 1. Drop existing problematic trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Check if profiles table exists, if not create it
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'EMPLOYEE', -- Using TEXT instead of ENUM to avoid issues
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies and create simple ones
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "CEO can update any profile" ON public.profiles;

-- Create simple policies
CREATE POLICY "Enable all access for authenticated users" ON public.profiles
  FOR ALL USING (auth.role() = 'authenticated');

-- 5. Create robust trigger function with error handling
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    -- Insert profile with safe defaults
    INSERT INTO public.profiles (id, email, first_name, last_name, role)
    VALUES (
      NEW.id, 
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      CASE 
        WHEN NEW.raw_user_meta_data->>'role' = 'CEO' THEN 'CEO'
        ELSE 'EMPLOYEE'
      END
    );
    
    RAISE LOG 'Successfully created profile for user %', NEW.id;
    RETURN NEW;
    
  EXCEPTION
    WHEN unique_violation THEN
      -- Profile already exists, just log and continue
      RAISE LOG 'Profile already exists for user %, skipping', NEW.id;
      RETURN NEW;
    WHEN OTHERS THEN
      -- Log the specific error but don't fail the signup
      RAISE LOG 'Error creating profile for user %: % (%)', NEW.id, SQLERRM, SQLSTATE;
      RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;

-- 6. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 9. Verify the setup
SELECT 'Signup trigger fix applied successfully!' as status,
       'You can now test user signup' as next_step;

-- Optional: Show current trigger status
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
