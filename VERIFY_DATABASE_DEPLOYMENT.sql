-- =====================================================
-- DATABASE DEPLOYMENT VERIFICATION SCRIPT
-- =====================================================
-- Run this AFTER deploying the main schema to verify everything worked

-- =====================================================
-- 1. VERIFY ALL TABLES EXIST
-- =====================================================
SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            'profiles', 'pdrs', 'goals', 'company_values', 'behaviors', 
            'behavior_entries', 'mid_year_reviews', 'end_year_reviews', 
            'audit_logs', 'notifications', 'pdr_periods'
        ) THEN '✅ REQUIRED'
        ELSE '⚠️  EXTRA'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- =====================================================
-- 2. VERIFY ALL ENUMS EXIST
-- =====================================================
SELECT 
    typname as enum_name,
    CASE 
        WHEN typname IN ('user_role', 'pdr_status', 'priority', 'goal_mapping_type', 'audit_action', 'notification_type', 'behavior_author_type') 
        THEN '✅ REQUIRED'
        ELSE '⚠️  EXTRA'
    END as status
FROM pg_type 
WHERE typtype = 'e' 
ORDER BY typname;

-- =====================================================
-- 3. VERIFY CRITICAL COLUMNS EXIST
-- =====================================================
-- Check goals table has weighting and goal_mapping
SELECT 
    'goals.' || column_name as column_path,
    data_type,
    CASE 
        WHEN column_name IN ('weighting', 'goal_mapping') THEN '✅ CRITICAL'
        WHEN column_name IN ('id', 'pdr_id', 'title', 'priority') THEN '✅ CORE'
        ELSE '📋 STANDARD'
    END as importance
FROM information_schema.columns 
WHERE table_name = 'goals' 
ORDER BY 
    CASE 
        WHEN column_name IN ('weighting', 'goal_mapping') THEN 1
        WHEN column_name IN ('id', 'pdr_id', 'title', 'priority') THEN 2
        ELSE 3
    END,
    column_name;

-- =====================================================
-- 4. VERIFY FOREIGN KEY CONSTRAINTS
-- =====================================================
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    '✅ LINKED' as status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- =====================================================
-- 5. VERIFY RLS IS ENABLED
-- =====================================================
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN '✅ SECURED'
        ELSE '🚨 UNSECURED'
    END as security_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- 6. VERIFY SEED DATA EXISTS
-- =====================================================
SELECT 
    'Company Values' as data_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= 6 THEN '✅ COMPLETE'
        WHEN COUNT(*) > 0 THEN '⚠️  PARTIAL'
        ELSE '🚨 MISSING'
    END as status
FROM company_values 
WHERE is_active = true

UNION ALL

SELECT 
    'PDR Periods' as data_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= 2 THEN '✅ COMPLETE'
        WHEN COUNT(*) > 0 THEN '⚠️  PARTIAL'
        ELSE '🚨 MISSING'
    END as status
FROM pdr_periods

UNION ALL

SELECT 
    'Active Periods' as data_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 1 THEN '✅ COMPLETE'
        WHEN COUNT(*) > 1 THEN '⚠️  MULTIPLE'
        ELSE '🚨 MISSING'
    END as status
FROM pdr_periods 
WHERE is_active = true;

-- =====================================================
-- 7. VERIFY FUNCTIONS AND TRIGGERS
-- =====================================================
SELECT 
    routine_name as function_name,
    routine_type,
    '✅ EXISTS' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('handle_new_user')
ORDER BY routine_name;

SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    '✅ ACTIVE' as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND trigger_name IN ('on_auth_user_created')
ORDER BY trigger_name;

-- =====================================================
-- 8. VERIFY INDEXES EXIST
-- =====================================================
SELECT 
    schemaname,
    tablename,
    indexname,
    '✅ INDEXED' as status
FROM pg_indexes 
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- =====================================================
-- 9. SHOW DEPLOYMENT SUMMARY
-- =====================================================
SELECT 
    '🎉 DATABASE DEPLOYMENT VERIFICATION COMPLETE' as message,
    NOW() as verified_at;

-- Show what to do next
SELECT 
    'NEXT STEPS' as action,
    '1. Update .env.local with new database credentials' as step_1,
    '2. Restart your development server (npm run dev)' as step_2,
    '3. Test /api/health endpoint' as step_3,
    '4. Try user registration and login' as step_4;
