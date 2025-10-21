-- =====================================================
-- VERIFY PDR STATUS ENUM VALUES
-- =====================================================
-- This script verifies that all required PDR status values exist in the database
-- Run this in your Supabase SQL Editor to check the current enum values

-- Check all current enum values
SELECT unnest(enum_range(NULL::pdr_status)) as status_value
ORDER BY status_value;

-- Check if specific statuses exist
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM unnest(enum_range(NULL::pdr_status)) as e(val) 
      WHERE e.val = 'MID_YEAR_SUBMITTED'
    ) THEN '✅ MID_YEAR_SUBMITTED exists'
    ELSE '❌ MID_YEAR_SUBMITTED missing'
  END as mid_year_submitted_status,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM unnest(enum_range(NULL::pdr_status)) as e(val) 
      WHERE e.val = 'END_YEAR_SUBMITTED'
    ) THEN '✅ END_YEAR_SUBMITTED exists'
    ELSE '❌ END_YEAR_SUBMITTED missing'
  END as end_year_submitted_status,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM unnest(enum_range(NULL::pdr_status)) as e(val) 
      WHERE e.val = 'MID_YEAR_APPROVED'
    ) THEN '✅ MID_YEAR_APPROVED exists'
    ELSE '❌ MID_YEAR_APPROVED missing'
  END as mid_year_approved_status;

-- If any values are missing, you need to run the migration script
-- See: pdr-status-enum-migration-final.sql

