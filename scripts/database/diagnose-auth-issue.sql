-- Diagnostic script to check authentication setup
-- Run this in Supabase SQL Editor to identify signup issues

-- 1. Check if user_role enum exists
SELECT 
    'user_role enum' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status;

-- 2. Check if profiles table exists with correct structure
SELECT 
    'profiles table' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status;

-- 3. Check profiles table columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check if handle_new_user function exists
SELECT 
    'handle_new_user function' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status;

-- 5. Check if trigger exists
SELECT 
    'on_auth_user_created trigger' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name = 'on_auth_user_created' 
            AND event_object_table = 'users'
            AND event_object_schema = 'auth'
        ) 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status;

-- 6. Check RLS policies on profiles
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- 7. Show any existing triggers on auth.users
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth';

