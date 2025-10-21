-- =====================================================
-- PERFORMANCE OPTIMIZATION SCRIPT
-- =====================================================
-- Run this script to add performance indexes and optimizations
-- This should be run AFTER the main schema deployment

-- =====================================================
-- 1. CREATE PERFORMANCE INDEXES
-- =====================================================

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- PDRs table indexes (most critical for performance)
CREATE INDEX IF NOT EXISTS idx_pdrs_user_id ON pdrs(user_id);
CREATE INDEX IF NOT EXISTS idx_pdrs_status ON pdrs(status);
CREATE INDEX IF NOT EXISTS idx_pdrs_fy_label ON pdrs(fy_label);
CREATE INDEX IF NOT EXISTS idx_pdrs_created_at ON pdrs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdrs_updated_at ON pdrs(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdrs_is_locked ON pdrs(is_locked);
CREATE INDEX IF NOT EXISTS idx_pdrs_period_id ON pdrs(period_id);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_pdrs_user_status ON pdrs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pdrs_status_updated ON pdrs(status, updated_at DESC);

-- Goals table indexes
CREATE INDEX IF NOT EXISTS idx_goals_pdr_id ON goals(pdr_id);
CREATE INDEX IF NOT EXISTS idx_goals_priority ON goals(priority);
CREATE INDEX IF NOT EXISTS idx_goals_weighting ON goals(weighting);
CREATE INDEX IF NOT EXISTS idx_goals_goal_mapping ON goals(goal_mapping);
CREATE INDEX IF NOT EXISTS idx_goals_created_at ON goals(created_at);

-- Behaviors table indexes
CREATE INDEX IF NOT EXISTS idx_behaviors_pdr_id ON behaviors(pdr_id);
CREATE INDEX IF NOT EXISTS idx_behaviors_value_id ON behaviors(value_id);
CREATE INDEX IF NOT EXISTS idx_behaviors_created_at ON behaviors(created_at);

-- Behavior entries table indexes
CREATE INDEX IF NOT EXISTS idx_behavior_entries_pdr_id ON behavior_entries(pdr_id);
CREATE INDEX IF NOT EXISTS idx_behavior_entries_value_id ON behavior_entries(value_id);
CREATE INDEX IF NOT EXISTS idx_behavior_entries_author_id ON behavior_entries(author_id);
CREATE INDEX IF NOT EXISTS idx_behavior_entries_author_type ON behavior_entries(author_type);
CREATE INDEX IF NOT EXISTS idx_behavior_entries_created_at ON behavior_entries(created_at DESC);

-- Composite index for common behavior entry queries
CREATE INDEX IF NOT EXISTS idx_behavior_entries_pdr_value ON behavior_entries(pdr_id, value_id);
CREATE INDEX IF NOT EXISTS idx_behavior_entries_author_type_pdr ON behavior_entries(author_type, pdr_id);

-- Mid year reviews indexes
CREATE INDEX IF NOT EXISTS idx_mid_year_reviews_pdr_id ON mid_year_reviews(pdr_id);
CREATE INDEX IF NOT EXISTS idx_mid_year_reviews_submitted_at ON mid_year_reviews(submitted_at DESC);

-- End year reviews indexes
CREATE INDEX IF NOT EXISTS idx_end_year_reviews_pdr_id ON end_year_reviews(pdr_id);
CREATE INDEX IF NOT EXISTS idx_end_year_reviews_submitted_at ON end_year_reviews(submitted_at DESC);

-- Company values indexes
CREATE INDEX IF NOT EXISTS idx_company_values_is_active ON company_values(is_active);
CREATE INDEX IF NOT EXISTS idx_company_values_sort_order ON company_values(sort_order);

-- PDR periods indexes
CREATE INDEX IF NOT EXISTS idx_pdr_periods_is_active ON pdr_periods(is_active);
CREATE INDEX IF NOT EXISTS idx_pdr_periods_start_date ON pdr_periods(start_date);
CREATE INDEX IF NOT EXISTS idx_pdr_periods_end_date ON pdr_periods(end_date);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Composite index for unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON audit_logs(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON audit_logs(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Composite index for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_date ON audit_logs(table_name, changed_at DESC);

-- =====================================================
-- 2. ANALYZE TABLES FOR QUERY OPTIMIZATION
-- =====================================================

-- Update table statistics for better query planning
ANALYZE profiles;
ANALYZE pdrs;
ANALYZE goals;
ANALYZE behaviors;
ANALYZE behavior_entries;
ANALYZE mid_year_reviews;
ANALYZE end_year_reviews;
ANALYZE company_values;
ANALYZE pdr_periods;
ANALYZE notifications;
ANALYZE audit_logs;

-- =====================================================
-- 3. CREATE USEFUL DATABASE FUNCTIONS
-- =====================================================

-- Function to get PDR statistics for a user
CREATE OR REPLACE FUNCTION get_user_pdr_stats(user_uuid UUID)
RETURNS TABLE(
    total_pdrs INTEGER,
    completed_pdrs INTEGER,
    current_pdr_id UUID,
    avg_goal_rating NUMERIC,
    avg_behavior_rating NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_pdrs,
        COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END)::INTEGER as completed_pdrs,
        MAX(CASE WHEN p.status NOT IN ('COMPLETED', 'LOCKED') THEN p.id END) as current_pdr_id,
        ROUND(AVG(g.employee_rating), 2) as avg_goal_rating,
        ROUND(AVG(b.employee_rating), 2) as avg_behavior_rating
    FROM pdrs p
    LEFT JOIN goals g ON p.id = g.pdr_id
    LEFT JOIN behaviors b ON p.id = b.pdr_id
    WHERE p.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get CEO dashboard statistics
CREATE OR REPLACE FUNCTION get_ceo_dashboard_stats()
RETURNS TABLE(
    total_employees INTEGER,
    total_pdrs INTEGER,
    pending_reviews INTEGER,
    completed_pdrs INTEGER,
    avg_completion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM profiles WHERE role = 'EMPLOYEE' AND is_active = true) as total_employees,
        COUNT(p.*)::INTEGER as total_pdrs,
        COUNT(CASE WHEN p.status IN ('SUBMITTED', 'UNDER_REVIEW', 'OPEN_FOR_REVIEW') THEN 1 END)::INTEGER as pending_reviews,
        COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END)::INTEGER as completed_pdrs,
        ROUND(
            COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END)::NUMERIC / 
            NULLIF(COUNT(p.*)::NUMERIC, 0) * 100, 2
        ) as avg_completion_rate
    FROM pdrs p;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. CREATE PERFORMANCE MONITORING VIEWS
-- =====================================================

-- View for slow queries monitoring (requires pg_stat_statements extension)
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    rows
FROM pg_stat_statements 
WHERE calls > 10 
ORDER BY mean_exec_time DESC 
LIMIT 20;

-- View for table sizes
CREATE OR REPLACE VIEW table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- 5. SHOW PERFORMANCE OPTIMIZATION RESULTS
-- =====================================================

-- Show all indexes created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Show table sizes
SELECT * FROM table_sizes;

-- Show function creation results
SELECT 
    routine_name,
    routine_type,
    'Created successfully' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_user_pdr_stats', 'get_ceo_dashboard_stats')
ORDER BY routine_name;

SELECT 'Performance optimization completed!' as status;
