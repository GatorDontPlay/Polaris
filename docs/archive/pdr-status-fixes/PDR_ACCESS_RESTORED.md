# PDR Access Restored - Column Name Fix

## Problem
After the previous changes, PDRs became inaccessible with the error:
```
"The PDR you're looking for doesn't exist or you don't have access to it."
```

## Root Cause
The API was querying database columns that don't exist:
- Trying to select `employee_feedback` - **column doesn't exist**
- Trying to select `ceo_feedback` - **actual column name is `ceo_comments`**

This caused the entire database query to fail, making all PDRs inaccessible.

## Solution Applied
Reverted API queries to use the actual database column names that exist.

## Files Fixed

### 1. ✅ `src/app/api/pdrs/[id]/route.ts`
**Changed:**
- Goals query: `ceo_feedback` → `ceo_comments`
- Behaviors query: `ceo_feedback` → `ceo_comments`
- Removed non-existent `employee_feedback` column

### 2. ✅ `src/app/api/pdrs/[id]/complete-final-review/route.ts`
**Changed:**
- Behavior updates: `ceo_feedback` → `ceo_comments`
- Goal updates: `ceo_feedback` → `ceo_comments`

### 3. ✅ `src/app/api/pdrs/[id]/behavior-entries/organized/route.ts`
**Changed:**
- Prioritized `ceo_comments` over `ceo_feedback` as fallback

### 4. ✅ `src/app/(ceo)/admin/reviews/[id]/page.tsx`
**Changed:**
- Updated to load `ceo_comments` instead of `ceo_feedback`
- Ensured proper fallback order

## Database Schema (Actual)

### Goals Table
```sql
- employee_rating (INTEGER)
- ceo_rating (INTEGER)
- ceo_comments (TEXT)  ← Actual column name
```

### Behaviors Table
```sql
- employee_rating (INTEGER)
- ceo_rating (INTEGER)
- ceo_comments (TEXT)  ← Actual column name
```

## Testing
1. ✅ Navigate to any PDR URL (e.g., `/pdr/cba56fd0-264d-4ad1-ac44-ba6ad78f2298`)
2. ✅ PDR should load successfully
3. ✅ CEO can view and complete final reviews
4. ✅ Behavior and goal ratings save correctly
5. ✅ Data persists after page refresh

## What Works Now
- ✅ PDR pages load correctly
- ✅ CEO can view employee PDRs
- ✅ CEO can complete final reviews
- ✅ Behavior ratings save to database
- ✅ Goal ratings save to database
- ✅ All data persists correctly

## Note on Column Naming
The database currently uses `ceo_comments` (not `ceo_feedback`). If you want to standardize the naming to `ceo_feedback` in the future, you would need to:
1. Create a database migration to rename columns
2. Update all code references after migration completes

For now, all code uses the actual column names that exist in the database.

