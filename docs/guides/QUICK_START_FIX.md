# Quick Start: Fix PDR Access Issue

## The Problem
Users are getting "The PDR you're looking for doesn't exist or you don't have access to it" when trying to view their own PDRs.

## The Solution
Execute the RLS optimization migration that consolidates policies and removes conflicts between security layers.

## Quick Steps (5 minutes)

### 1. Open Supabase Dashboard
Go to your Supabase project → **SQL Editor**

### 2. Run the Migration
Copy and paste the entire contents of `optimize-rls-policies.sql` into SQL Editor and click **Run**.

**Expected output:**
```
✅ RLS optimization complete! | total_policies: ~20-25
```

### 3. Verify It Worked
Copy and paste `verify-rls-policies.sql` into SQL Editor and click **Run**.

**Check for:**
- ✅ Total policies: 20-25 (down from 50+)
- ✅ Helper function exists
- ✅ No unoptimized policies

### 4. Test Your Application
1. **Deploy** your code (the application changes are already complete)
2. **Log in** as an employee user
3. **Navigate** to Dashboard
4. **Click** on your PDR card
5. **Success!** Your PDR should now load

### 5. Check Console (Optional)
Open browser DevTools → Console

You should see:
```
🔍 Fetching PDR: { pdrId: "...", userId: "...", userRole: "EMPLOYEE" }
✅ PDR Fetched Successfully: { pdrId: "...", status: "...", userId: "..." }
```

## What If It Still Doesn't Work?

### Check 1: Migration Ran Successfully
In Supabase SQL Editor:
```sql
SELECT COUNT(*) as policy_count FROM pg_policies WHERE schemaname = 'public';
```
Should return ~20-25. If it returns 50+, the migration didn't run.

### Check 2: User Has Correct Role
In Supabase SQL Editor:
```sql
SELECT id, email, role FROM profiles WHERE email = 'your-email@example.com';
```
Role should be 'EMPLOYEE' or 'CEO' (uppercase).

### Check 3: PDR Exists
In Supabase SQL Editor:
```sql
SELECT id, user_id, status FROM pdrs WHERE user_id = 'your-user-id';
```
Should return your PDR(s).

### Check 4: Browser Console Errors
Open DevTools → Console and look for:
```
❌ PDR Fetch Error: { status: 404, ... }
```

The error details will show exactly what went wrong.

## Need More Detail?

See these files:
- **`RLS_OPTIMIZATION_MIGRATION_GUIDE.md`** - Complete migration guide with troubleshooting
- **`IMPLEMENTATION_SUMMARY.md`** - What was changed and why
- **`verify-rls-policies.sql`** - Diagnostic queries

## What Changed?

### Database
- Created helper function for efficient role checks
- Consolidated 50+ policies into 20-25 optimized policies
- Fixed performance issues with auth.uid() calls

### Application
- Removed redundant access checks that conflicted with RLS
- Added detailed error logging for diagnostics
- Simplified permission logic to trust RLS

### Result
✅ Users can access their own PDRs  
✅ CEO can access all PDRs  
✅ No Supabase linter warnings  
✅ Better performance  
✅ Better error messages  

## Support

If you still have issues after following these steps:

1. Check the `RLS_OPTIMIZATION_MIGRATION_GUIDE.md` troubleshooting section
2. Review browser console logs for detailed error information
3. Check Supabase logs in Dashboard → Logs
4. Verify RLS policies ran correctly using `verify-rls-policies.sql`

---

**TL;DR**: Run `optimize-rls-policies.sql` in Supabase SQL Editor, deploy your code, test. Done! 🎉

