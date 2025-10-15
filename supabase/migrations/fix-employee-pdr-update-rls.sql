-- =====================================================
-- Fix Employee PDR Update RLS Policy
-- =====================================================
-- 
-- Problem: The current RLS policy blocks employees from updating
-- their PDR status because it checks "status = 'Created'" BEFORE
-- the update, preventing the status change to 'SUBMITTED'.
--
-- Solution: Allow employees to update their own PDRs as long as
-- they're not locked. The application state machine handles
-- validation, so RLS only needs to verify ownership and lock status.
-- =====================================================

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Users can update own PDRs when Created" ON pdrs;
DROP POLICY IF EXISTS "Users can update own PDRs when not locked" ON pdrs;
DROP POLICY IF EXISTS "Users can update their own PDRs" ON pdrs;
DROP POLICY IF EXISTS "pdrs_update_policy" ON pdrs;

-- Create improved policy for employee updates
-- Allows updates to own PDRs when not locked (regardless of status)
CREATE POLICY "employees_can_update_own_unlocked_pdrs" ON pdrs
FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND (is_locked = false OR is_locked IS NULL)
)
WITH CHECK (
  auth.uid() = user_id 
  AND (is_locked = false OR is_locked IS NULL)
);

-- Ensure CEO policy exists for full control
DROP POLICY IF EXISTS "CEOs can update any PDR" ON pdrs;
DROP POLICY IF EXISTS "CEO can update any PDR" ON pdrs;

CREATE POLICY "ceos_can_update_any_pdr" ON pdrs
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'CEO'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'CEO'
  )
);

-- Add comment explaining the design
COMMENT ON POLICY "employees_can_update_own_unlocked_pdrs" ON pdrs IS 
'Allows employees to update their own PDRs when not locked. Application state machine validates transitions.';

COMMENT ON POLICY "ceos_can_update_any_pdr" ON pdrs IS 
'Allows CEOs to update any PDR regardless of lock status.';


