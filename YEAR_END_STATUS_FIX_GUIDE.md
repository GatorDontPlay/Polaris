# Year End Review Status Fix - Complete Guide

## Problem Summary
Employee submitted Year End Review, but PDR status remained `MID_YEAR_APPROVED` instead of updating to `END_YEAR_SUBMITTED`. This prevented the PDR from appearing in the CEO's "Year End Review" dashboard filter.

## Root Cause
The Year End Review submission API (`/api/pdrs/[id]/end-year`) was not properly handling errors during the PDR status update. If the status update failed silently, the end_year_review would be created but the status would remain incorrect.

## What Was Fixed

### 1. Enhanced Error Handling in API (`src/app/api/pdrs/[id]/end-year/route.ts`)
- Added `.select().single()` to verify status update succeeded
- Implemented automatic rollback (deletes end_year_review) if status update fails
- Added detailed error logging with full error context
- Returns proper error response if status update fails
- Added audit log for PDR status changes (not just end_year_review creation)

### 2. Created Diagnostic Scripts
- `diagnose-year-end-status.sql` - Check database state and identify issues
- `verify-year-end-rls.sql` - Verify RLS policies allow employee updates
- `fix-year-end-status.sql` - Manually fix existing broken PDRs

## Step-by-Step Fix Process

### Step 1: Diagnose Current State

Run `diagnose-year-end-status.sql` in Supabase SQL Editor:

```bash
# This will show:
# 1. PDRs with MID_YEAR_APPROVED status and whether they have end_year_reviews
# 2. Current RLS policies on pdrs table
# 3. Count of PDRs needing fix
```

**Expected Results:**
- If end_year_review exists but status is MID_YEAR_APPROVED → Status update failed
- If no end_year_review exists → Employee hasn't submitted yet (not a bug)

### Step 2: Verify RLS Policies

Run `verify-year-end-rls.sql` in Supabase SQL Editor:

```bash
# This will:
# 1. Show current UPDATE policies on pdrs table
# 2. Verify employees have UPDATE permission
# 3. Test if RLS allows employee updates
# 4. Optionally recreate policies if needed
```

**Look for:**
- Policy: "Users can update their own PDRs" - Should use `user_id = auth.uid()`
- Policy: "CEO can update any PDR" - Should check for CEO role
- Both should have USING and WITH CHECK clauses

**If policies are missing or incorrect:**
Run Step 4 of the script to recreate them.

### Step 3: Fix Existing Broken PDRs

If Step 1 found PDRs with end_year_reviews but wrong status, run `fix-year-end-status.sql`:

```sql
-- This will:
-- 1. Show PDRs that need fixing
-- 2. Update status to END_YEAR_SUBMITTED
-- 3. Verify the fix worked
-- 4. Create audit log entries
```

**After running this:**
- Refresh the CEO dashboard
- The PDR should now appear in "Year End Review" tab
- CEO can click to review and complete

### Step 4: Test New Submissions

Have an employee with `MID_YEAR_APPROVED` status submit a Year End Review:

**Watch for in browser console:**
```
🔧 End-Year API: Current PDR status: MID_YEAR_APPROVED
🔧 End-Year API: Creating end-year review...
✅ End-Year API: End-year review created successfully
🔧 End-Year API: Updating PDR status to END_YEAR_SUBMITTED...
✅ End-Year API: PDR status updated successfully from MID_YEAR_APPROVED to END_YEAR_SUBMITTED
```

**If status update fails, you'll see:**
```
🚨 End-Year API: Failed to update PDR status: [error details]
🚨 End-Year API: Rolling back - deleting end_year_review...
```

**Check API response:**
- Success: Status 201, returns end_year_review data
- Failure: Status 500, error code "STATUS_UPDATE_FAILED" with details

### Step 5: Verify CEO Dashboard

1. Log in as CEO
2. Navigate to Dashboard → Overview tab
3. Click "Year End Review" filter tab
4. **Expected**: PDR should appear in the list
5. Click "Review" button
6. **Expected**: PDR opens with employee's Year End Review visible

## Common Issues and Solutions

### Issue 1: RLS Policy Blocking Updates
**Symptom:** Error message mentions "new row violates row-level security policy"

**Solution:**
```sql
-- Run verify-year-end-rls.sql Step 4 to recreate policies
DROP POLICY IF EXISTS "Users can update their own PDRs" ON pdrs;

CREATE POLICY "Users can update their own PDRs" ON pdrs
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

### Issue 2: Missing Permissions
**Symptom:** Error message mentions "permission denied for table pdrs"

**Solution:**
```sql
-- Grant UPDATE permission to authenticated users
GRANT UPDATE ON pdrs TO authenticated;
```

### Issue 3: End Year Review Created But Status Not Updated
**Symptom:** Database has end_year_review record, but PDR status is still MID_YEAR_APPROVED

**Solution:**
```sql
-- Run fix-year-end-status.sql to manually fix
UPDATE pdrs 
SET status = 'END_YEAR_SUBMITTED', updated_at = NOW()
WHERE id = '<pdr_id>';
```

### Issue 4: Employee Can't Submit Year End Review
**Symptom:** Employee doesn't see Year End Review section or it's disabled

**Check:**
1. PDR status must be `MID_YEAR_APPROVED` or `PLAN_LOCKED`
2. Employee must have completed all required previous steps
3. Mid-year review must be completed (or skipped if from PLAN_LOCKED)

## Verification Checklist

After implementing the fix:

- [ ] API enhanced with rollback and detailed logging
- [ ] RLS policies verified/updated to allow employee updates
- [ ] Existing broken PDRs fixed using SQL script
- [ ] Test employee submission updates status correctly
- [ ] PDR appears in CEO's "Year End Review" filter
- [ ] CEO can open and review the submitted PDR
- [ ] Audit logs show both end_year_review creation and status change
- [ ] Error handling prevents partial state (no orphaned end_year_reviews)

## Database Queries for Manual Verification

### Check specific PDR status:
```sql
SELECT 
  p.id, 
  p.status, 
  p.user_id,
  eyr.id as review_id,
  eyr.achievements_summary
FROM pdrs p
LEFT JOIN end_year_reviews eyr ON eyr.pdr_id = p.id
WHERE p.id = '<pdr_id>';
```

### Check CEO dashboard data:
```sql
SELECT 
  p.id,
  p.status,
  prof.first_name,
  prof.last_name,
  p.updated_at
FROM pdrs p
JOIN profiles prof ON prof.id = p.user_id
WHERE p.status IN ('SUBMITTED', 'MID_YEAR_SUBMITTED', 'END_YEAR_SUBMITTED')
ORDER BY p.updated_at DESC;
```

### Check audit logs for status changes:
```sql
SELECT 
  al.id,
  al.action,
  al.table_name,
  al.old_values->>'status' as old_status,
  al.new_values->>'status' as new_status,
  al.changed_at,
  prof.first_name,
  prof.last_name
FROM audit_logs al
JOIN profiles prof ON prof.id = al.changed_by
WHERE al.table_name = 'pdrs'
  AND al.action = 'UPDATE'
  AND (al.new_values->>'status' = 'END_YEAR_SUBMITTED')
ORDER BY al.changed_at DESC
LIMIT 10;
```

## Success Criteria

✅ **Fix is successful when:**
1. Employee submits Year End Review → Status changes to `END_YEAR_SUBMITTED`
2. PDR appears in CEO's "Year End Review" dashboard tab
3. CEO can click and review the submitted content
4. No orphaned end_year_review records in database
5. Audit logs show complete trail of changes
6. Error messages are clear and actionable if something fails

## Support

If issues persist after following this guide:

1. Check browser console for detailed error messages
2. Check Supabase logs for server-side errors
3. Verify RLS policies using `verify-year-end-rls.sql`
4. Check that employee user has correct permissions
5. Verify PDR is in correct status before employee submits

## Files Modified
- `src/app/api/pdrs/[id]/end-year/route.ts` - Enhanced error handling and rollback
- `diagnose-year-end-status.sql` - Diagnostic queries
- `verify-year-end-rls.sql` - RLS policy verification and fix
- `fix-year-end-status.sql` - Manual data fix script

