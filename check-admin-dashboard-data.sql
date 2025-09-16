-- =====================================================
-- CHECK ADMIN DASHBOARD DATA REQUIREMENTS
-- =====================================================
-- Check if all required data exists for the admin dashboard

-- 1. Check PDR periods (active period required)
SELECT 'PDR Periods:' as section, 
       COUNT(*) as total_periods,
       COUNT(CASE WHEN is_active = true THEN 1 END) as active_periods
FROM pdr_periods;

SELECT 'Active PDR Period:' as section, id, name, start_date, end_date, is_active
FROM pdr_periods 
WHERE is_active = true;

-- 2. Check profiles (employees)
SELECT 'Profiles:' as section,
       COUNT(*) as total_profiles,
       COUNT(CASE WHEN role = 'EMPLOYEE' THEN 1 END) as employees,
       COUNT(CASE WHEN role = 'CEO' THEN 1 END) as ceos,
       COUNT(CASE WHEN is_active = true THEN 1 END) as active_profiles
FROM profiles;

-- 3. Check PDRs
SELECT 'PDRs:' as section,
       COUNT(*) as total_pdrs,
       COUNT(CASE WHEN status = 'SUBMITTED' THEN 1 END) as submitted,
       COUNT(CASE WHEN status = 'UNDER_REVIEW' THEN 1 END) as under_review,
       COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed
FROM pdrs;

-- 4. Check audit logs (for recent activity)
SELECT 'Audit Logs:' as section,
       COUNT(*) as total_logs,
       COUNT(CASE WHEN changed_at >= NOW() - INTERVAL '14 days' THEN 1 END) as recent_logs
FROM audit_logs;

-- 5. Check goals and behaviors (for ratings)
SELECT 'Goals:' as section,
       COUNT(*) as total_goals,
       COUNT(CASE WHEN employee_rating IS NOT NULL THEN 1 END) as with_employee_rating,
       COUNT(CASE WHEN ceo_rating IS NOT NULL THEN 1 END) as with_ceo_rating
FROM goals;

SELECT 'Behaviors:' as section,
       COUNT(*) as total_behaviors,
       COUNT(CASE WHEN employee_rating IS NOT NULL THEN 1 END) as with_employee_rating,
       COUNT(CASE WHEN ceo_rating IS NOT NULL THEN 1 END) as with_ceo_rating
FROM behaviors;
