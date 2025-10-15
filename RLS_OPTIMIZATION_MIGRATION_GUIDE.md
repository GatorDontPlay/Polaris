# RLS Optimization Migration Guide

## Overview

This guide walks you through executing the RLS (Row Level Security) policy optimization migration that fixes PDR access issues and resolves all Supabase linter warnings.

## What This Migration Does

### Problems Fixed
1. ✅ **PDR Access Issue**: Users can now access their own PDRs without "Access Denied" errors
2. ✅ **32 auth_rls_initplan warnings**: Optimizes `auth.uid()` calls to prevent re-evaluation per row
3. ✅ **73 multiple_permissive_policies warnings**: Consolidates redundant policies (50+ policies → ~20 policies)
4. ✅ **Performance**: Significantly improves query performance at scale

### Architecture Changes
- **Database Level**: RLS policies are now the single source of truth for access control
- **Application Level**: Removed redundant permission checks that conflicted with RLS
- **Monitoring**: Added comprehensive error logging for diagnostics

## Prerequisites

- Access to Supabase SQL Editor
- Admin/CEO account for testing
- Employee account for testing

## Migration Steps

### Step 1: Backup Current Policies (Optional but Recommended)

Run this query in Supabase SQL Editor to save current policies:

```sql
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd, 
  qual::text as using_expression,
  with_check::text as check_expression
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Save the output as a backup.

### Step 2: Execute the Optimization Migration

1. Open **Supabase Dashboard** → **SQL Editor**
2. Open the file: `optimize-rls-policies.sql`
3. Copy the entire contents
4. Paste into SQL Editor
5. Click **Run**

**Expected Output:**
```
status                          | total_policies | note
RLS optimization complete!      | ~20-25         | All warnings should be resolved
```

### Step 3: Verify the Migration

1. In SQL Editor, open `verify-rls-policies.sql`
2. Run the verification script
3. Review the output:

**Expected Results:**
- ✅ Total policies: 20-25 (down from 50+)
- ✅ No unoptimized policies (auth.uid() without select)
- ✅ Helper function auth.user_role() exists
- ✅ RLS enabled on all tables

### Step 4: Test with Real Accounts

#### Test as Employee

1. Log in to your application as an **employee user**
2. Navigate to **Dashboard**
3. You should see your PDR card
4. Click to view your PDR
5. **Expected**: PDR loads successfully ✅
6. Open browser DevTools → Console
7. Look for logs: `✅ PDR Fetched Successfully`

#### Test as CEO

1. Log in as **CEO user**
2. Navigate to **Admin Dashboard**
3. You should see all employees' PDRs
4. Click any PDR to view
5. **Expected**: All PDRs are accessible ✅

### Step 5: Verify Supabase Advisors

1. Go to **Supabase Dashboard** → **Database** → **Advisors**
2. Check both tabs:
   - **Performance**: Should show **0 auth_rls_initplan warnings** ✅
   - **Performance**: Should show **0 multiple_permissive_policies warnings** ✅

## Troubleshooting

### Issue: Migration fails with "relation does not exist"

**Cause**: Table might not exist in database

**Solution**: Check which tables exist:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

Comment out policies for non-existent tables in the migration file.

### Issue: Still getting "Access Denied" errors

**Cause**: Application code not deployed or RLS policies not applied

**Solution**:
1. Verify migration ran successfully
2. Check that application code changes are deployed
3. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
4. Check browser console for detailed error logs

### Issue: CEO cannot see all PDRs

**Cause**: User role might not be set correctly

**Solution**: Verify CEO role in profiles table:
```sql
SELECT id, email, role FROM profiles WHERE role = 'CEO';
```

If missing, update:
```sql
UPDATE profiles SET role = 'CEO' WHERE email = 'ceo@example.com';
```

### Issue: Linter still shows warnings

**Cause**: Cache or policies not fully updated

**Solution**:
1. Wait 1-2 minutes for Supabase to refresh advisors
2. Navigate away and back to Advisors page
3. Run verification script to confirm policies are correct

## Policy Structure Reference

### Before Optimization (Example: PDRs table)
```sql
-- 6 separate policies
"Users can view own PDRs"           -- SELECT for employees
"CEOs can view all PDRs"            -- SELECT for CEOs
"Users can insert own PDRs"         -- INSERT
"Users can update own PDRs"         -- UPDATE for employees
"CEOs can update any PDR"           -- UPDATE for CEOs
"Users can delete own DRAFT PDRs"   -- DELETE
```

### After Optimization (PDRs table)
```sql
-- 4 consolidated policies
"pdrs_select_policy"   -- SELECT: users OR ceo
"pdrs_insert_policy"   -- INSERT: users only
"pdrs_update_policy"   -- UPDATE: users (when not locked) OR ceo
"pdrs_delete_policy"   -- DELETE: DRAFT only, users OR ceo
```

## Key Optimizations

### 1. Helper Function
```sql
-- Instead of repeated subqueries
EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'CEO')

-- Use cached function
(select public.current_user_role()) = 'CEO'
```

### 2. Optimized auth.uid()
```sql
-- Instead of
user_id = auth.uid()  -- Re-evaluated per row

-- Use
user_id = (select auth.uid())  -- Evaluated once
```

### 3. Consolidated Policies
```sql
-- Instead of 2 policies
CREATE POLICY "employees" ... USING (user_id = auth.uid());
CREATE POLICY "ceos" ... USING (role = 'CEO');

-- Use 1 policy with OR
CREATE POLICY "combined" ... USING (
  user_id = (select auth.uid()) OR (select auth.user_role()) = 'CEO'
);
```

## Rollback Instructions

If you need to rollback the migration:

1. Restore from backup (if you saved output from Step 1)
2. Or run the old policy file:
```bash
# Run this file in SQL Editor
fix-pdrs-rls-policies.sql
```

**Note**: Rollback will restore the old policies but will bring back the performance warnings and access issues.

## Success Criteria Checklist

- [ ] Migration script runs without errors
- [ ] Verification script shows ~20-25 policies
- [ ] Employee user can access own PDR
- [ ] Employee user cannot access other users' PDRs
- [ ] CEO user can access all PDRs
- [ ] Supabase Advisors shows 0 warnings
- [ ] Browser console shows successful fetch logs
- [ ] No errors in application logs

## Next Steps

Once migration is complete and verified:

1. Monitor application logs for any unexpected errors
2. Check Supabase Advisors weekly for any new issues
3. Test with multiple employee accounts periodically
4. Document any custom policies you add in the future

## Support

If you encounter issues:

1. Check browser console for detailed error logs
2. Check Supabase logs: Dashboard → Logs
3. Run verification script for diagnostics
4. Review the troubleshooting section above

## Files Reference

- `optimize-rls-policies.sql` - Main migration script
- `verify-rls-policies.sql` - Verification and testing script
- `fix-pdrs-rls-policies.sql` - Old policy file (for rollback reference)

---

**Migration Date**: _____________  
**Executed By**: _____________  
**Verification Status**: _____________  
**Notes**: _____________

