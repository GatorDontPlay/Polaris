# Year End Review Status Fix - Quick Start

## 🚨 Immediate Action Required

Your PDR has a Year End Review but status is `MID_YEAR_APPROVED` instead of `END_YEAR_SUBMITTED`.

## ⚡ Quick Fix (5 minutes)

### Option 1: Fix Existing PDR Now (Recommended)

**Run this in Supabase SQL Editor:**

```sql
-- Fix the broken PDR status
UPDATE pdrs 
SET status = 'END_YEAR_SUBMITTED', updated_at = NOW()
WHERE status = 'MID_YEAR_APPROVED'
  AND EXISTS (
    SELECT 1 FROM end_year_reviews 
    WHERE pdr_id = pdrs.id 
    AND achievements_summary IS NOT NULL
  );

-- Verify it worked
SELECT 
  p.id,
  p.status,
  prof.first_name || ' ' || prof.last_name as employee_name,
  'FIXED - Now visible in CEO dashboard' as result
FROM pdrs p
JOIN profiles prof ON prof.id = p.user_id
WHERE p.status = 'END_YEAR_SUBMITTED'
ORDER BY p.updated_at DESC
LIMIT 5;
```

**Then:** Refresh CEO dashboard → Go to "Year End Review" tab → PDR should now appear

### Option 2: Verify RLS Policies (If fix doesn't work)

**Run in Supabase SQL Editor:**

```sql
-- Check if RLS is blocking updates
SELECT policyname, cmd
FROM pg_policies 
WHERE tablename = 'pdrs' AND cmd = 'UPDATE';

-- If missing, create policy:
CREATE POLICY "Users can update their own PDRs" ON pdrs
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

## ✅ What Was Fixed in Code

The API now:
- ✅ Properly verifies status update succeeded
- ✅ Rolls back end_year_review if status update fails
- ✅ Returns clear error messages
- ✅ Logs status changes to audit trail

**File Updated:** `src/app/api/pdrs/[id]/end-year/route.ts`

## 📋 Testing Checklist

After running the fix:

1. **CEO Dashboard**
   - [ ] Log in as CEO
   - [ ] Navigate to Dashboard
   - [ ] Click "Year End Review" filter
   - [ ] Verify PDR appears in list

2. **Review PDR**
   - [ ] Click "Review" button on the PDR
   - [ ] Verify employee's Year End Review content is visible
   - [ ] CEO can input final ratings and comments

3. **Test New Submissions**
   - [ ] Have employee submit another Year End Review
   - [ ] Check status changes to `END_YEAR_SUBMITTED`
   - [ ] Appears in CEO dashboard immediately

## 🔍 Quick Diagnosis

**Check current state:**

```sql
SELECT 
  p.id,
  p.status,
  CASE 
    WHEN eyr.id IS NOT NULL THEN '❌ HAS REVIEW - STATUS WRONG'
    ELSE '✅ NO REVIEW YET - OK'
  END as diagnosis
FROM pdrs p
LEFT JOIN end_year_reviews eyr ON eyr.pdr_id = p.id
WHERE p.status = 'MID_YEAR_APPROVED';
```

## 📚 Full Documentation

See `YEAR_END_STATUS_FIX_GUIDE.md` for:
- Detailed troubleshooting
- Complete diagnostic scripts
- RLS policy verification
- Testing procedures

## 🆘 Still Having Issues?

1. Check browser console when employee submits
2. Look for: `🚨 End-Year API: Failed to update PDR status`
3. Run `verify-year-end-rls.sql` to check permissions
4. Verify employee user ID matches PDR user_id


