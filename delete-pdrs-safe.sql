-- =====================================================
-- SAFE PDR DELETION SCRIPT
-- =====================================================
-- This script provides multiple options to delete PDRs
-- with safety checks and confirmation steps
-- Run this in your Supabase SQL Editor

-- =====================================================
-- STEP 1: REVIEW WHAT WILL BE DELETED
-- =====================================================

-- Option A: See ALL PDRs that would be deleted
SELECT 
  p.id,
  p.status,
  p.fy_label,
  prof.first_name,
  prof.last_name,
  prof.email,
  p.created_at,
  COUNT(DISTINCT g.id) as goal_count,
  COUNT(DISTINCT b.id) as behavior_count,
  COUNT(DISTINCT myr.id) as mid_year_review_count,
  COUNT(DISTINCT eyr.id) as end_year_review_count
FROM pdrs p
LEFT JOIN profiles prof ON prof.id = p.user_id
LEFT JOIN goals g ON g.pdr_id = p.id
LEFT JOIN behaviors b ON b.pdr_id = p.id
LEFT JOIN mid_year_reviews myr ON myr.pdr_id = p.id
LEFT JOIN end_year_reviews eyr ON eyr.pdr_id = p.id
GROUP BY p.id, p.status, p.fy_label, prof.first_name, prof.last_name, prof.email, p.created_at
ORDER BY p.created_at DESC;

-- Option B: See only TEST/DEMO PDRs (if you have demo users)
SELECT 
  p.id,
  p.status,
  prof.email,
  'DEMO/TEST PDR' as type
FROM pdrs p
JOIN profiles prof ON prof.id = p.user_id
WHERE prof.email LIKE '%demo%' 
   OR prof.email LIKE '%test%';

-- Option C: See PDRs by status
SELECT 
  status,
  COUNT(*) as count
FROM pdrs
GROUP BY status
ORDER BY count DESC;

-- =====================================================
-- STEP 2: CREATE BACKUP (OPTIONAL BUT RECOMMENDED)
-- =====================================================

-- Create backup tables with timestamp
DO $$ 
DECLARE
  backup_suffix TEXT := '_backup_' || to_char(now(), 'YYYYMMDD_HH24MISS');
BEGIN
  -- Backup PDRs
  EXECUTE format('CREATE TABLE pdrs%s AS SELECT * FROM pdrs', backup_suffix);
  -- Backup Goals
  EXECUTE format('CREATE TABLE goals%s AS SELECT * FROM goals', backup_suffix);
  -- Backup Behaviors
  EXECUTE format('CREATE TABLE behaviors%s AS SELECT * FROM behaviors', backup_suffix);
  -- Backup Mid Year Reviews
  EXECUTE format('CREATE TABLE mid_year_reviews%s AS SELECT * FROM mid_year_reviews', backup_suffix);
  -- Backup End Year Reviews
  EXECUTE format('CREATE TABLE end_year_reviews%s AS SELECT * FROM end_year_reviews', backup_suffix);
  -- Backup Behavior Entries
  EXECUTE format('CREATE TABLE behavior_entries%s AS SELECT * FROM behavior_entries', backup_suffix);
  
  RAISE NOTICE 'Backup created with suffix: %', backup_suffix;
END $$;

-- Verify backups were created
SELECT 
  table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%backup_%'
ORDER BY table_name DESC;

-- =====================================================
-- STEP 3: DELETE OPTIONS
-- =====================================================

-- ⚠️ WARNING: Review Step 1 output before running any delete commands!

-- -----------------------------------------------------
-- OPTION 1: Delete ALL PDRs and related data
-- -----------------------------------------------------
-- This deletes EVERYTHING. Use with extreme caution!

DO $$ 
BEGIN
  -- Delete in correct order to handle foreign keys
  DELETE FROM behavior_entries;
  DELETE FROM behaviors;
  DELETE FROM goals;
  DELETE FROM mid_year_reviews;
  DELETE FROM end_year_reviews;
  DELETE FROM pdrs;
  
  RAISE NOTICE 'All PDRs and related data deleted';
END $$;

-- Verify deletion
SELECT 
  'pdrs' as table_name, COUNT(*) as remaining_records FROM pdrs
UNION ALL
SELECT 'goals', COUNT(*) FROM goals
UNION ALL
SELECT 'behaviors', COUNT(*) FROM behaviors
UNION ALL
SELECT 'mid_year_reviews', COUNT(*) FROM mid_year_reviews
UNION ALL
SELECT 'end_year_reviews', COUNT(*) FROM end_year_reviews
UNION ALL
SELECT 'behavior_entries', COUNT(*) FROM behavior_entries;

-- -----------------------------------------------------
-- OPTION 2: Delete PDRs for specific user(s)
-- -----------------------------------------------------
-- Replace <user_email> with actual email

DO $$ 
DECLARE
  target_user_id uuid;
BEGIN
  -- Get user ID
  SELECT id INTO target_user_id 
  FROM profiles 
  WHERE email = '<user_email>'; -- CHANGE THIS
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Delete related data first
  DELETE FROM behavior_entries 
  WHERE behavior_id IN (
    SELECT b.id FROM behaviors b 
    JOIN pdrs p ON p.id = b.pdr_id 
    WHERE p.user_id = target_user_id
  );
  
  DELETE FROM behaviors WHERE pdr_id IN (SELECT id FROM pdrs WHERE user_id = target_user_id);
  DELETE FROM goals WHERE pdr_id IN (SELECT id FROM pdrs WHERE user_id = target_user_id);
  DELETE FROM mid_year_reviews WHERE pdr_id IN (SELECT id FROM pdrs WHERE user_id = target_user_id);
  DELETE FROM end_year_reviews WHERE pdr_id IN (SELECT id FROM pdrs WHERE user_id = target_user_id);
  DELETE FROM pdrs WHERE user_id = target_user_id;
  
  RAISE NOTICE 'PDRs deleted for user: %', target_user_id;
END $$;

-- -----------------------------------------------------
-- OPTION 3: Delete PDRs by status
-- -----------------------------------------------------
-- Example: Delete all PDRs in 'Created' status (not yet submitted)

DO $$ 
BEGIN
  -- Delete related data first
  DELETE FROM behavior_entries 
  WHERE behavior_id IN (
    SELECT b.id FROM behaviors b 
    JOIN pdrs p ON p.id = b.pdr_id 
    WHERE p.status = 'Created' -- CHANGE STATUS AS NEEDED
  );
  
  DELETE FROM behaviors WHERE pdr_id IN (SELECT id FROM pdrs WHERE status = 'Created');
  DELETE FROM goals WHERE pdr_id IN (SELECT id FROM pdrs WHERE status = 'Created');
  DELETE FROM mid_year_reviews WHERE pdr_id IN (SELECT id FROM pdrs WHERE status = 'Created');
  DELETE FROM end_year_reviews WHERE pdr_id IN (SELECT id FROM pdrs WHERE status = 'Created');
  DELETE FROM pdrs WHERE status = 'Created';
  
  RAISE NOTICE 'PDRs with status "Created" deleted';
END $$;

-- -----------------------------------------------------
-- OPTION 4: Delete specific PDR by ID
-- -----------------------------------------------------
-- Replace <pdr_id> with actual PDR ID

DO $$ 
DECLARE
  target_pdr_id uuid := '<pdr_id>'; -- CHANGE THIS
BEGIN
  -- Delete related data first
  DELETE FROM behavior_entries 
  WHERE behavior_id IN (SELECT id FROM behaviors WHERE pdr_id = target_pdr_id);
  
  DELETE FROM behaviors WHERE pdr_id = target_pdr_id;
  DELETE FROM goals WHERE pdr_id = target_pdr_id;
  DELETE FROM mid_year_reviews WHERE pdr_id = target_pdr_id;
  DELETE FROM end_year_reviews WHERE pdr_id = target_pdr_id;
  DELETE FROM pdrs WHERE id = target_pdr_id;
  
  RAISE NOTICE 'PDR deleted: %', target_pdr_id;
END $$;

-- -----------------------------------------------------
-- OPTION 5: Delete TEST/DEMO PDRs only
-- -----------------------------------------------------
-- Deletes PDRs for users with 'demo' or 'test' in email

DO $$ 
BEGIN
  -- Delete related data first
  DELETE FROM behavior_entries 
  WHERE behavior_id IN (
    SELECT b.id FROM behaviors b 
    JOIN pdrs p ON p.id = b.pdr_id 
    JOIN profiles prof ON prof.id = p.user_id
    WHERE prof.email LIKE '%demo%' OR prof.email LIKE '%test%'
  );
  
  DELETE FROM behaviors 
  WHERE pdr_id IN (
    SELECT p.id FROM pdrs p 
    JOIN profiles prof ON prof.id = p.user_id
    WHERE prof.email LIKE '%demo%' OR prof.email LIKE '%test%'
  );
  
  DELETE FROM goals 
  WHERE pdr_id IN (
    SELECT p.id FROM pdrs p 
    JOIN profiles prof ON prof.id = p.user_id
    WHERE prof.email LIKE '%demo%' OR prof.email LIKE '%test%'
  );
  
  DELETE FROM mid_year_reviews 
  WHERE pdr_id IN (
    SELECT p.id FROM pdrs p 
    JOIN profiles prof ON prof.id = p.user_id
    WHERE prof.email LIKE '%demo%' OR prof.email LIKE '%test%'
  );
  
  DELETE FROM end_year_reviews 
  WHERE pdr_id IN (
    SELECT p.id FROM pdrs p 
    JOIN profiles prof ON prof.id = p.user_id
    WHERE prof.email LIKE '%demo%' OR prof.email LIKE '%test%'
  );
  
  DELETE FROM pdrs 
  WHERE user_id IN (
    SELECT id FROM profiles 
    WHERE email LIKE '%demo%' OR email LIKE '%test%'
  );
  
  RAISE NOTICE 'Demo/Test PDRs deleted';
END $$;

-- =====================================================
-- STEP 4: RESTORE FROM BACKUP (IF NEEDED)
-- =====================================================

-- If you made a mistake, restore from backup
-- Replace <backup_suffix> with your actual backup suffix from Step 2

DO $$ 
DECLARE
  backup_suffix TEXT := '_backup_20241015_143000'; -- CHANGE THIS to your backup suffix
BEGIN
  -- Drop current tables
  DROP TABLE IF EXISTS pdrs CASCADE;
  DROP TABLE IF EXISTS goals CASCADE;
  DROP TABLE IF EXISTS behaviors CASCADE;
  DROP TABLE IF EXISTS mid_year_reviews CASCADE;
  DROP TABLE IF EXISTS end_year_reviews CASCADE;
  DROP TABLE IF EXISTS behavior_entries CASCADE;
  
  -- Restore from backup
  EXECUTE format('ALTER TABLE pdrs%s RENAME TO pdrs', backup_suffix);
  EXECUTE format('ALTER TABLE goals%s RENAME TO goals', backup_suffix);
  EXECUTE format('ALTER TABLE behaviors%s RENAME TO behaviors', backup_suffix);
  EXECUTE format('ALTER TABLE mid_year_reviews%s RENAME TO mid_year_reviews', backup_suffix);
  EXECUTE format('ALTER TABLE end_year_reviews%s RENAME TO end_year_reviews', backup_suffix);
  EXECUTE format('ALTER TABLE behavior_entries%s RENAME TO behavior_entries', backup_suffix);
  
  RAISE NOTICE 'Data restored from backup: %', backup_suffix;
END $$;

-- =====================================================
-- STEP 5: CLEAN UP AUDIT LOGS (OPTIONAL)
-- =====================================================

-- Delete audit logs for deleted PDRs
DELETE FROM audit_logs 
WHERE table_name IN ('pdrs', 'goals', 'behaviors', 'mid_year_reviews', 'end_year_reviews', 'behavior_entries')
  AND record_id NOT IN (
    SELECT id::text FROM pdrs
    UNION
    SELECT id::text FROM goals
    UNION
    SELECT id::text FROM behaviors
    UNION
    SELECT id::text FROM mid_year_reviews
    UNION
    SELECT id::text FROM end_year_reviews
    UNION
    SELECT id::text FROM behavior_entries
  );

RAISE NOTICE 'Orphaned audit logs cleaned up';

