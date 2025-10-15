-- =====================================================
-- Fix Orphaned End-Year Reviews
-- =====================================================
-- This script fixes PDRs where end_year_reviews were created
-- but the PDR status wasn't updated to END_YEAR_SUBMITTED
-- due to RLS policy issues before the service role client fix.
-- =====================================================

-- Step 1: Verify the problem - Show PDRs with orphaned end-year reviews
DO $$ 
DECLARE
  orphaned_count INTEGER;
  rec RECORD;
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'STEP 1: Checking for orphaned end-year reviews...';
  RAISE NOTICE '================================================';
  
  SELECT COUNT(*) INTO orphaned_count
  FROM pdrs p
  INNER JOIN end_year_reviews e ON e.pdr_id = p.id
  WHERE p.status = 'MID_YEAR_APPROVED';
  
  IF orphaned_count > 0 THEN
    RAISE NOTICE 'Found % PDR(s) with orphaned end-year reviews', orphaned_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Details:';
    
    -- Show details of orphaned records
    FOR rec IN (
      SELECT 
        p.id,
        p.status as current_status,
        pr.first_name || ' ' || pr.last_name as employee_name,
        pr.email as employee_email,
        e.id as review_id,
        e.created_at as review_created_at
      FROM pdrs p
      INNER JOIN profiles pr ON p.user_id = pr.id
      INNER JOIN end_year_reviews e ON e.pdr_id = p.id
      WHERE p.status = 'MID_YEAR_APPROVED'
      ORDER BY e.created_at DESC
    ) LOOP
      RAISE NOTICE '  PDR: % | Employee: % (%) | Review Created: % | Current Status: %',
        rec.id, rec.employee_name, rec.employee_email, rec.review_created_at, rec.current_status;
    END LOOP;
  ELSE
    RAISE NOTICE 'No orphaned end-year reviews found. Database is consistent.';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- Step 2: Fix the orphaned records
DO $$ 
DECLARE
  updated_count INTEGER;
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'STEP 2: Fixing orphaned end-year reviews...';
  RAISE NOTICE '================================================';
  
  -- Update PDR status to END_YEAR_SUBMITTED for PDRs that have end-year reviews
  -- but are still in MID_YEAR_APPROVED status
  WITH updated AS (
    UPDATE pdrs
    SET 
      status = 'END_YEAR_SUBMITTED',
      updated_at = NOW()
    WHERE id IN (
      SELECT p.id
      FROM pdrs p
      INNER JOIN end_year_reviews e ON e.pdr_id = p.id
      WHERE p.status = 'MID_YEAR_APPROVED'
    )
    RETURNING id, status
  )
  SELECT COUNT(*) INTO updated_count FROM updated;
  
  IF updated_count > 0 THEN
    RAISE NOTICE '✅ Updated % PDR(s) from MID_YEAR_APPROVED to END_YEAR_SUBMITTED', updated_count;
  ELSE
    RAISE NOTICE 'No PDRs needed updating.';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- Step 3: Verify the fix
DO $$ 
DECLARE
  fixed_count INTEGER;
  rec RECORD;
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'STEP 3: Verifying the fix...';
  RAISE NOTICE '================================================';
  
  -- Count PDRs now in END_YEAR_SUBMITTED status with end-year reviews
  SELECT COUNT(*) INTO fixed_count
  FROM pdrs p
  INNER JOIN end_year_reviews e ON e.pdr_id = p.id
  WHERE p.status = 'END_YEAR_SUBMITTED';
  
  RAISE NOTICE 'Found % PDR(s) correctly in END_YEAR_SUBMITTED status with end-year reviews', fixed_count;
  RAISE NOTICE '';
  
  IF fixed_count > 0 THEN
    RAISE NOTICE 'Details:';
    
    -- Show details of fixed records
    FOR rec IN (
      SELECT 
        p.id,
        p.status,
        pr.first_name || ' ' || pr.last_name as employee_name,
        pr.email as employee_email,
        e.created_at as review_submitted_at,
        p.updated_at as status_updated_at
      FROM pdrs p
      INNER JOIN profiles pr ON p.user_id = pr.id
      INNER JOIN end_year_reviews e ON e.pdr_id = p.id
      WHERE p.status = 'END_YEAR_SUBMITTED'
      ORDER BY e.created_at DESC
    ) LOOP
      RAISE NOTICE '  ✅ PDR: % | Employee: % (%) | Status: % | Review: % | Updated: %',
        rec.id, rec.employee_name, rec.employee_email, rec.status, 
        rec.review_submitted_at, rec.status_updated_at;
    END LOOP;
  END IF;
  
  RAISE NOTICE '';
END $$;

-- Step 4: Final consistency check
DO $$ 
DECLARE
  remaining_orphans INTEGER;
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'STEP 4: Final consistency check...';
  RAISE NOTICE '================================================';
  
  -- Check if any orphaned records remain
  SELECT COUNT(*) INTO remaining_orphans
  FROM pdrs p
  INNER JOIN end_year_reviews e ON e.pdr_id = p.id
  WHERE p.status = 'MID_YEAR_APPROVED';
  
  IF remaining_orphans = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All end-year reviews are now properly reflected in PDR status';
    RAISE NOTICE '✅ Database is now consistent';
  ELSE
    RAISE WARNING '⚠️  WARNING: Still found % orphaned record(s). Manual review needed.', remaining_orphans;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Migration complete!';
  RAISE NOTICE '================================================';
END $$;

