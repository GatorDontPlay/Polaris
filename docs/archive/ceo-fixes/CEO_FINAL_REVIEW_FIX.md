# CEO Final Review Fix - Missing updated_at Column

## Problem

When a CEO tries to complete the final review for an employee, the system returns an error:

```
Error completing final review: Internal server error

API Error: {
  code: 'PGRST204',
  details: null,
  hint: null,
  message: "Could not find the 'updated_at' column of 'end_year_reviews' in the schema cache"
}
```

## Root Cause

The `end_year_reviews` table in the database is missing the `updated_at` column, but the API code at `/api/pdrs/[id]/complete-final-review` is trying to set this column when updating the review:

```typescript
.update({
  ceo_overall_rating: finalReviewData.ceoOverallRating,
  ceo_final_comments: finalReviewData.ceoFinalComments,
  updated_at: new Date().toISOString(), // <-- This column doesn't exist!
})
```

## Solution

### Step 1: Run the Database Migration

Execute the SQL migration file in your Supabase SQL Editor:

**File:** `fix-end-year-reviews-updated-at.sql`

This migration will:
1. Add the `updated_at` column to both `end_year_reviews` and `mid_year_reviews` tables
2. Set existing rows' `updated_at` to match their `created_at` timestamp
3. Create a trigger to automatically update the `updated_at` column on any UPDATE operation
4. Verify the changes

### Step 2: Verify the Fix

After running the migration, verify the column was added:

```sql
SELECT 
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name IN ('end_year_reviews', 'mid_year_reviews')
    AND column_name = 'updated_at'
ORDER BY table_name;
```

You should see two rows:
- `end_year_reviews.updated_at`
- `mid_year_reviews.updated_at`

### Step 3: Test the CEO Final Review

1. Log in as CEO
2. Navigate to Admin → Reviews
3. Select an employee's PDR with status `END_YEAR_SUBMITTED`
4. Click "Complete Final Review"
5. Verify the review completes successfully without errors

## Files Changed

1. **fix-end-year-reviews-updated-at.sql** - Database migration to add missing columns
2. **src/types/supabase.ts** - Updated TypeScript types to include `updated_at` field
3. **CEO_FINAL_REVIEW_FIX.md** - This documentation

## Technical Details

### Database Changes

- Added `updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()` to `end_year_reviews`
- Added `updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()` to `mid_year_reviews`
- Created `update_updated_at_column()` trigger function
- Applied triggers to auto-update `updated_at` on UPDATE operations

### TypeScript Type Changes

Updated the `Database` type definition to include `updated_at: string` in:
- `end_year_reviews.Row`
- `end_year_reviews.Insert` (optional)
- `end_year_reviews.Update` (optional)
- `mid_year_reviews.Row`
- `mid_year_reviews.Insert` (optional)
- `mid_year_reviews.Update` (optional)

## Why This Happened

The database schema was inconsistent across different migration files. Some schema files included `updated_at` for review tables, while others didn't. The production database was created from a schema version that lacked this column, but the API code expected it to exist.

## Prevention

Going forward, ensure all tables that track modifications include:
1. `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
2. `updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
3. A trigger to auto-update `updated_at` on modifications

This is a standard pattern for audit trails and data tracking.

