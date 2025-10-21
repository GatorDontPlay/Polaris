# Quick Fix: Company Values Not Showing

## The Issue
Your behaviors page is blank because the database RLS (Row Level Security) policy is blocking the API from reading company values.

## Quick Fix (5 minutes)

### Step 1: Run SQL Script in Supabase
1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy the contents of: `fix-company-values-rls-policy.sql`
3. Paste and click **Run**
4. Verify you see: `✅ RLS Policy Fix Complete!`

### Step 2: Restart Dev Server
```bash
# Stop server (Ctrl+C in terminal)
npm run dev
```

### Step 3: Test
1. Refresh the behaviors page
2. You should now see all 4 company value input fields

## What to Look For

### ✅ Success - You'll see in terminal:
```
🔍 [API] Number of values fetched: 4
🔍 [API] Transformed data: [4 company values]
✅ [API] Company values successfully fetched and transformed
```

### ✅ Success - You'll see on page:
- 4 company value cards (Craftsmanship, Lean Thinking, Value-Centric Innovation, Blameless Problem-Solving)
- Text input for each value
- Professional Development section

### ❌ Still broken - You'll see:
```
⚠️ [API] No company values returned from database!
⚠️ [API] This might be an RLS policy issue.
```

If still broken, see `FIX_RLS_COMPANY_VALUES.md` for detailed troubleshooting.

## Files Created
- `fix-company-values-rls-policy.sql` - The SQL fix to run
- `FIX_RLS_COMPANY_VALUES.md` - Detailed explanation and troubleshooting
- `QUICK_FIX_STEPS.md` - This file

## What Was Changed
- Enhanced API error logging (`src/app/api/company-values/route.ts`)
- Created SQL migration to fix RLS policy
- Added helpful warnings when data is missing


