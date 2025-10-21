# CEO Closed Filter Fix - Completed PDRs Now Visible

## Problem
After completing a PDR as CEO, the "Closed" filter in the dashboard showed no PDRs ("All caught up!" message), even though PDRs were marked as COMPLETED.

## Root Cause
The admin dashboard API (`/api/admin/dashboard`) was filtering the `pendingReviews` array to only include PDRs that need CEO attention:
```typescript
['SUBMITTED', 'MID_YEAR_SUBMITTED', 'END_YEAR_SUBMITTED']
```

This excluded `COMPLETED` PDRs from the data sent to the frontend, making them invisible to both the "Closed" and "Calibration" filters.

## Solution
Changed the API to return ALL PDRs (including COMPLETED ones) and let the UI handle filtering based on the selected tab.

### What Changed

**File:** `src/app/api/admin/dashboard/route.ts`

1. **Renamed variable for clarity:**
   - `pendingReviewPDRs` → `allReviewPDRs`

2. **Changed filter logic:**
```typescript
// BEFORE: Only pending reviews
.filter(pdr => {
  return pdr && pdr.status && (
    ['SUBMITTED', 'MID_YEAR_SUBMITTED', 'END_YEAR_SUBMITTED'].includes(pdr.status)
  );
})

// AFTER: All PDRs with valid status
.filter(pdr => {
  return pdr && pdr.status;
})
```

3. **Updated sorting:**
   - Changed to sort by most recently updated first (was oldest first)
   - This shows recently completed PDRs at the top

4. **Increased limit:**
   - Changed from 15 to 100 PDRs to accommodate all statuses

## How It Works Now

The API returns ALL PDRs with these statuses:
- ✅ SUBMITTED (Goal Setting)
- ✅ MID_YEAR_SUBMITTED (Mid Year)
- ✅ END_YEAR_SUBMITTED (Year End)
- ✅ COMPLETED (Calibration & Closed)

The frontend dashboard filters them based on the selected tab:
- **Goal Setting** → Shows `SUBMITTED`
- **Mid Year Check-in** → Shows `MID_YEAR_SUBMITTED`
- **Year End Review** → Shows `END_YEAR_SUBMITTED`
- **Calibration** → Shows `COMPLETED`
- **Closed** → Shows `COMPLETED`

## Testing
1. Navigate to CEO Dashboard
2. Click the "Closed" filter tab
3. You should now see all COMPLETED PDRs
4. Click the "Calibration" filter tab
5. Same PDRs should appear there as well

## Notes
- The "Calibration" and "Closed" tabs show the same data (both filter for COMPLETED status)
- This might be intentional for the workflow, or they could be differentiated later
- The data now includes up to 100 PDRs (increased from 15) to accommodate all completed reviews

