# Mid-Year Review RLS Policy Fix

## Problem
When submitting the mid-year review, the employee receives a **500 Internal Server Error** with the message:

```
API Error: {
  code: '42501',
  details: null,
  hint: null,
  message: 'new row violates row-level security policy for table "mid_year_reviews"'
}
```

## Root Cause
**Row-Level Security (RLS) policies** for the `mid_year_reviews` table are either:
1. Missing or not properly configured in your Supabase database
2. Using "FOR ALL" policies instead of specific INSERT/UPDATE/SELECT policies
3. Not granting proper table-level permissions to authenticated users

When the employee tries to INSERT a new mid-year review, Supabase blocks it because no RLS policy explicitly allows employees to insert rows into this table.

## Fix Required

You need to run the SQL script in **Supabase SQL Editor**:

### **Step 1: Open Supabase Dashboard**
1. Go to your Supabase project
2. Click on "SQL Editor" in the left sidebar
3. Click "+ New Query"

### **Step 2: Run the Fix Script**
Copy and paste the contents of `FIX_MID_YEAR_REVIEW_RLS_POLICIES.sql` into the SQL Editor and click "Run".

This script will:
1. Drop any existing conflicting policies
2. Create 6 new policies with proper INSERT, UPDATE, SELECT operations:
   - **3 Employee policies**: View, Insert, Update their own reviews
   - **3 CEO policies**: View, Insert, Update all reviews
3. Grant table-level permissions to authenticated users
4. Verify the policies are correctly created

### **Step 3: (Optional) Fix End-Year Reviews Too**
While you're at it, run `FIX_END_YEAR_REVIEW_RLS_POLICIES.sql` to prevent the same issue when employees reach the end-year review stage.

## What the Fix Does

### Employee Policies
```sql
-- Employees can INSERT their own mid year reviews
CREATE POLICY "Users can insert their own mid year review" ON mid_year_reviews
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM pdrs 
    WHERE pdrs.id = mid_year_reviews.pdr_id 
    AND pdrs.user_id = auth.uid()
  )
);
```

This policy allows employees to insert a mid-year review **only if**:
- The PDR being referenced belongs to them (`pdrs.user_id = auth.uid()`)

### CEO Policies
```sql
-- CEO can INSERT mid year reviews for any PDR
CREATE POLICY "CEO can insert any mid year review" ON mid_year_reviews
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'CEO'
  )
);
```

This allows CEOs to insert mid-year reviews for any employee's PDR.

## Verification

After running the script, the verification query will show:

```
policyname                                  | cmd    | using_clause      | with_check_clause
--------------------------------------------+--------+-------------------+-------------------
CEO can insert any mid year review          | INSERT | No USING clause   | Has WITH CHECK clause
CEO can update any mid year review          | UPDATE | Has USING clause  | Has WITH CHECK clause
CEO can view all mid year reviews           | SELECT | Has USING clause  | No WITH CHECK clause
Users can insert their own mid year review  | INSERT | No USING clause   | Has WITH CHECK clause
Users can update their own mid year review  | UPDATE | Has USING clause  | Has WITH CHECK clause
Users can view their mid year reviews       | SELECT | Has USING clause  | No WITH CHECK clause
```

## Testing After Fix

1. ✅ Go back to the mid-year review page
2. ✅ Fill out the form
3. ✅ Click "Submit Mid-Year Review"
4. ✅ Should now successfully save without RLS errors
5. ✅ Check the terminal - no more "42501" errors

## Why This Happens

RLS policies need to be explicitly defined for each operation type (SELECT, INSERT, UPDATE, DELETE). If you only have "FOR ALL" policies or if the INSERT policy is missing, Supabase will block the operation even if the user technically has permission.

The fix ensures:
- **Specific operation policies** (INSERT, UPDATE, SELECT) instead of generic "FOR ALL"
- **Proper WITH CHECK clauses** for INSERT and UPDATE operations
- **Table-level GRANT permissions** so policies can even be evaluated

## Files Created
1. `FIX_MID_YEAR_REVIEW_RLS_POLICIES.sql` - Fix for mid-year reviews (run this now)
2. `FIX_END_YEAR_REVIEW_RLS_POLICIES.sql` - Fix for end-year reviews (run this preventively)

## Next Steps

1. **Run the SQL script** in Supabase SQL Editor
2. **Verify policies** are created (script includes verification query)
3. **Test mid-year submission** again - should work now!

Once you run the script, the employee should be able to submit mid-year reviews successfully! 🎉



