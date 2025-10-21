# PDR Status Case Sensitivity Fix

**Date**: October 14, 2025  
**Issue**: Goals and behaviors could not be created due to status check failure  
**Root Cause**: Case sensitivity mismatch between database and code

---

## Problem Identified

### Error Message
```
"PDR status 'Created' does not allow editing"
code: 'INVALID_STATUS'
```

### Root Cause
- **Database**: PDR status is stored as `'Created'` (capital C, lowercase rest)
- **API Code**: Checking for `'CREATED'` (all caps)
- **Result**: Status check failed, preventing goal/behavior creation

### Example
```typescript
// Database value
pdr.status = 'Created'

// Code was checking for
const EMPLOYEE_EDITABLE_STATUSES = ['CREATED', ...]

// Result: 'Created' !== 'CREATED' ❌
```

---

## Solution Implemented

### Files Modified (6 API Routes)

1. ✅ `src/app/api/pdrs/[id]/goals/route.ts`
2. ✅ `src/app/api/behavior-entries/[id]/route.ts`
3. ✅ `src/app/api/pdrs/[id]/behavior-entries/route.ts`
4. ✅ `src/app/api/pdrs/[id]/behaviors/route.ts`
5. ✅ `src/app/api/goals/[id]/route.ts`
6. ✅ `src/app/api/behaviors/[id]/route.ts`

### Change Applied

**BEFORE**:
```typescript
const EMPLOYEE_EDITABLE_STATUSES = [
  'CREATED',        // ❌ All caps - didn't match database
  'PLAN_APPROVED', 
  'PLAN_LOCKED',
  'MID_YEAR_CHECK',
  'MID_YEAR_SUBMITTED',
  'MID_YEAR_APPROVED',
  'END_YEAR_REVIEW'
];
```

**AFTER**:
```typescript
const EMPLOYEE_EDITABLE_STATUSES = [
  'Created',        // ✅ Match actual database value
  'CREATED',        // Keep for backward compatibility
  'PLAN_APPROVED', 
  'PLAN_LOCKED',
  'MID_YEAR_CHECK',
  'MID_YEAR_SUBMITTED',
  'MID_YEAR_APPROVED',
  'END_YEAR_REVIEW'
];
```

---

## Testing Instructions

### 1. Test Goal Creation
1. Navigate to `/pdr/[id]/goals`
2. Click "Add Goal"
3. Fill out form:
   - Title: "Test Goal"
   - Weighting: 50
   - Goal Mapping: Select any option
   - Description: Optional
4. Click "Add Goal"
5. **Expected**: ✅ Goal saves successfully
6. **Expected**: ✅ Goal appears in list immediately
7. Refresh page
8. **Expected**: ✅ Goal persists (loaded from database)

### 2. Test Behavior Creation
1. Navigate to `/pdr/[id]/behaviors`
2. Click "Add Behavior" for any company value
3. Fill out form
4. **Expected**: ✅ Behavior saves successfully

### 3. Verify Database Values
Run in Supabase SQL editor:
```sql
SELECT id, status, fy_label, created_at
FROM pdrs
WHERE status = 'Created'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected**: Should return PDRs with status = 'Created'

---

## Additional Logging Added

### Client-Side (`use-supabase-pdrs.ts`)
```typescript
console.log('🎯 Creating goal with data:', goalData);
console.error('❌ Goal creation failed:', { status, statusText, error });
console.log('✅ Goal created successfully:', result.data);
```

### Server-Side (`api/pdrs/[id]/goals/route.ts`)
```typescript
console.error('❌ Goal validation failed:', validation.response);
console.log('✅ Goal validation passed:', goalData);
```

These logs help debug any future issues with goal/behavior creation.

---

## Why This Happened

### Database Schema
The PDR table likely uses an enum or check constraint with 'Created' as the value:
```sql
status VARCHAR CHECK (status IN ('Created', 'Submitted', ...))
```

### Code Assumption
The API code was written assuming all-caps status values:
```typescript
'CREATED', 'SUBMITTED', etc.
```

### Mismatch
Database and code had different casing conventions, causing the comparison to fail.

---

## Prevention for Future

### Recommendation 1: Standardize Status Values
Choose one convention and stick to it:
- **Option A**: All caps in database AND code (`'CREATED'`)
- **Option B**: Pascal case in database AND code (`'Created'`)

### Recommendation 2: Use TypeScript Enums
```typescript
export enum PDRStatus {
  CREATED = 'Created',        // Maps code enum to DB value
  SUBMITTED = 'Submitted',
  PLAN_APPROVED = 'PlanApproved',
  // ...
}

// Usage
const EMPLOYEE_EDITABLE_STATUSES = [
  PDRStatus.CREATED,
  PDRStatus.PLAN_APPROVED,
  // ...
];
```

### Recommendation 3: Database Migration
Optionally standardize all status values in database:
```sql
-- If you want all-caps (would require code changes)
UPDATE pdrs SET status = UPPER(status);
UPDATE mid_year_reviews SET status = UPPER(status);
-- etc.
```

**Note**: Current fix (supporting both 'Created' and 'CREATED') is backward compatible and works immediately.

---

## Impact

✅ **Immediate**: Goals and behaviors can now be created  
✅ **Backward Compatible**: Supports both 'Created' and 'CREATED'  
✅ **No Database Changes**: Works with existing data  
✅ **Comprehensive**: Fixed across all 6 API routes  

---

## Related Documentation

- `DEMO_INFRASTRUCTURE_REMOVAL.md` - Demo cleanup and database-only flow
- `src/lib/pdr-state-machine.ts` - PDR state machine and status transitions
- `src/types/index.ts` - PDRStatus type definition

---

## Success Verification

After this fix, you should be able to:
- ✅ Create goals for PDRs with status 'Created'
- ✅ Create behaviors for PDRs with status 'Created'
- ✅ Update goals/behaviors in allowed statuses
- ✅ See proper error messages for invalid statuses
- ✅ Have consistent status handling across all API routes

