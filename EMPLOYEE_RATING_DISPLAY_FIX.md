# Employee Rating Display Fix - Complete

## Problem
Employee self-assessment ratings were showing as "0/5" on the Final Review page when the CEO was trying to review them.

## Root Cause
The visibility condition in `src/components/ceo/behavior-review-section.tsx` (line 525) was incorrectly hiding employee ratings during the Final Review stage:

```typescript
// BEFORE (incorrect)
{employeeEntry.rating && pdr.status !== 'SUBMITTED' && (
```

This condition was showing ratings for ALL statuses except 'SUBMITTED', but the logic should have been the opposite - show ratings ONLY during the Final Review stages (END_YEAR_REVIEW and END_YEAR_SUBMITTED).

## Solution Implemented

### 1. Added PDRStatus Import
**File**: `src/components/ceo/behavior-review-section.tsx`

Added the PDRStatus type import to use proper enum values:
```typescript
import { PDRStatus } from '@/types/pdr-status';
```

### 2. Fixed Visibility Condition
**File**: `src/components/ceo/behavior-review-section.tsx` (line 525)

Updated the condition to show employee behavior ratings only during Final Review stages:
```typescript
// AFTER (correct)
{employeeEntry.rating && (pdr.status === PDRStatus.END_YEAR_REVIEW || pdr.status === PDRStatus.END_YEAR_SUBMITTED) && (
```

### 3. Verified Data Flow
Confirmed the complete data flow is working correctly:

✅ **Employee End-Year Submission**:
- Employee submits end-year review with goal/behavior ratings
- Saves to database via `/api/goals/[id]` (for goals) and `/api/behavior-entries/[id]` (for behaviors)
- Fields saved: `employee_rating` for goals, `rating` for behaviors

✅ **CEO Data Loading**:
- CEO loads PDR data via `/api/pdrs/[id]` 
- API correctly selects `employee_rating` for goals (line 101 of route.ts)
- API correctly selects `rating` for behaviors via organized endpoint
- Frontend maps both camelCase and snake_case versions for compatibility

✅ **Goal Ratings Display** (Final Review Tab):
- Already working correctly at line 2866 of CEO review page
- Displays: `{goal.employeeRating || (goal as any).employee_rating || 0}/5`
- No visibility conditions blocking the display

✅ **Behavior Ratings Display** (Behaviors Tab):
- Now fixed with proper visibility condition
- Shows ratings only during END_YEAR_REVIEW or END_YEAR_SUBMITTED status
- Progress bar and rating display working correctly

## Testing Notes
The fix ensures that:
- ✅ Employee behavior ratings show correctly in Behaviors tab during END_YEAR_REVIEW/END_YEAR_SUBMITTED
- ✅ Employee goal ratings show correctly in Final Review tab
- ✅ Ratings are hidden in other PDR stages (CREATED, SUBMITTED, CEO_REVIEW, MID_YEAR)
- ✅ Both camelCase (employeeRating) and snake_case (employee_rating) are handled correctly
- ✅ No linting errors introduced

## Files Modified
1. `/Users/ryan/Documents/Repos/pdr_advanced/src/components/ceo/behavior-review-section.tsx`
   - Added PDRStatus import
   - Fixed visibility condition for employee ratings (line 525)

## Impact
This is a **display-only fix** with no database changes required. The employee ratings were always being saved and loaded correctly - they were just hidden by an incorrect UI condition.

