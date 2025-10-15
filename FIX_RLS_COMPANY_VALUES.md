# Fix RLS Policy for Company Values

## Problem
The server-side API cannot read from the `company_values` table due to Row Level Security (RLS) policies blocking access. Server logs show:

```
🔍 [API] Raw data from database: []
🔍 [API] Number of values fetched: 0
⚠️ [API] No company values returned from database!
⚠️ [API] This might be an RLS policy issue.
```

## Solution: Fix RLS Policy

### Step 1: Run the SQL Migration

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**

2. **Run the Migration Script**
   - Open the file: `fix-company-values-rls-policy.sql`
   - Copy the entire contents
   - Paste into Supabase SQL Editor
   - Click **Run**

3. **Verify the Results**
   You should see:
   - Current policies listed
   - New policy created confirmation
   - Test query showing 4 active values
   - Success message: `✅ RLS Policy Fix Complete!`

### Step 2: Restart Your Dev Server

After running the SQL script:

```bash
# Stop your dev server (Ctrl+C)
# Then restart it
npm run dev
```

### Step 3: Test the Fix

1. **Refresh the behaviors page** in your browser
2. **Check the terminal logs** - you should now see:
   ```
   🔍 [API] Number of values fetched: 4
   🔍 [API] Transformed data: [4 company values]
   ✅ [API] Company values successfully fetched and transformed
   ```

3. **Verify the page displays**:
   - All 4 company value cards
   - Text input fields for each value
   - Professional Development section

## What the Fix Does

### The New RLS Policy

```sql
CREATE POLICY "Anyone can view company values" 
ON company_values 
FOR SELECT 
TO authenticated, anon 
USING (is_active = true);
```

This policy:
- ✅ Allows **authenticated** users to read company values
- ✅ Allows **anonymous** users to read company values
- ✅ Only returns **active** company values (`is_active = true`)
- ✅ Applies to **SELECT** operations only (read-only)

### Why Both `authenticated` and `anon`?

Company values are public reference data that need to be accessible in different contexts:
- **Server-side API routes** (using authenticated context)
- **Client-side components** (may use anon context)
- **Public pages** (if any)

This is safe because:
- Company values don't contain sensitive data
- The policy restricts to read-only operations
- Only active values are returned

## Troubleshooting

### If you still see empty results after running the fix:

1. **Verify the policy was created**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'company_values';
   ```
   Should show: `"Anyone can view company values"`

2. **Test the query directly**:
   ```sql
   SELECT * FROM company_values WHERE is_active = true ORDER BY sort_order;
   ```
   Should return 4 rows.

3. **Check your environment variables**:
   Ensure `.env.local` has:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Clear Next.js cache**:
   ```bash
   rm -rf .next
   npm run dev
   ```

### If you see explicit RLS errors:

The enhanced API logging will now show:
```
🚨 [API] RLS POLICY ERROR: The database query was blocked by Row Level Security.
🚨 [API] Fix: Run the fix-company-values-rls-policy.sql script in Supabase SQL Editor
```

This confirms it's an RLS issue and the SQL script will fix it.

## Alternative Solution: Service Role Key

If you prefer to keep stricter RLS policies, you can use the service role key (bypasses RLS):

### Add to `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Create service role client:
```typescript
// src/lib/supabase/server.ts
export async function createServiceClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { /* ... */ }
  )
}
```

### Use in API:
```typescript
// src/app/api/company-values/route.ts
const supabase = await createServiceClient(); // Instead of createClient()
```

**Note**: The RLS policy fix is cleaner and recommended for public reference data like company values.

## Success Criteria

✅ SQL script runs without errors  
✅ Policy shows in `pg_policies` table  
✅ Server logs show: `Number of values fetched: 4`  
✅ Behaviors page displays all 4 company value cards  
✅ No warnings in server logs about empty results  

## Related Files

- **SQL Fix**: `fix-company-values-rls-policy.sql`
- **API Route**: `src/app/api/company-values/route.ts`
- **Supabase Client**: `src/lib/supabase/server.ts`
- **Page Component**: `src/app/(employee)/pdr/[id]/behaviors/page.tsx`


