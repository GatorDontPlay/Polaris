# Calibration Workflow Implementation

## Overview
This document describes the implementation of a calibration workflow that separates completed PDRs into two distinct states:
- **Calibration** - Completed PDRs that need calibration/modeling (not yet closed)
- **Closed** - Completed PDRs that have been calibrated and closed

## Problem Statement
Previously, all COMPLETED PDRs appeared in both "Calibration" and "Closed" filters on the CEO dashboard, making it impossible to distinguish between:
1. PDRs that need calibration review
2. PDRs that have already been calibrated and closed

## Solution: Calibration Tracking

### Database Schema Changes

Added two new columns to the `pdrs` table:

```sql
-- Timestamp when calibration was closed
calibrated_at TIMESTAMP WITH TIME ZONE NULL

-- User who closed the calibration
calibrated_by UUID REFERENCES profiles(id)
```

**Migration File:** `add-calibration-tracking.sql`

### Filtering Logic

#### Calibration Tab
Shows COMPLETED PDRs where `calibrated_at IS NULL`:
```typescript
review.status === 'COMPLETED' && !review.calibrated_at && !review.calibratedAt
```

#### Closed Tab
Shows COMPLETED PDRs where `calibrated_at IS NOT NULL`:
```typescript
review.status === 'COMPLETED' && (review.calibrated_at || review.calibratedAt)
```

## Implementation Details

### 1. Database Migration
**File:** `add-calibration-tracking.sql`

- Adds `calibrated_at` column (nullable timestamp)
- Adds `calibrated_by` column (UUID reference to profiles)
- Creates index for efficient filtering on completed PDRs
- Includes comments for documentation

**Run in Supabase SQL Editor:**
```bash
psql -f add-calibration-tracking.sql
```

### 2. TypeScript Types
**File:** `src/types/supabase.ts`

Updated PDR type definitions to include:
```typescript
Row: {
  // ... existing fields
  calibrated_at: string | null
  calibrated_by: string | null
}

Insert: {
  // ... existing fields
  calibrated_at?: string | null
  calibrated_by?: string | null
}

Update: {
  // ... existing fields
  calibrated_at?: string | null
  calibrated_by?: string | null
}
```

### 3. Dashboard API
**File:** `src/app/api/admin/dashboard/route.ts`

Added calibration counts to dashboard stats:
```typescript
// Count uncalibrated completed PDRs (for Calibration tab)
const uncalibratedCount = validPDRs.filter(pdr => 
  pdr.status === PDRStatus.COMPLETED && !pdr.calibrated_at
).length;

// Count calibrated completed PDRs (for Closed tab)
const calibratedCount = validPDRs.filter(pdr => 
  pdr.status === PDRStatus.COMPLETED && pdr.calibrated_at
).length;
```

### 4. Close Calibration API Endpoint
**File:** `src/app/api/pdrs/[id]/close-calibration/route.ts`

New POST endpoint that:
1. Authenticates the request (CEO only)
2. Verifies PDR is in COMPLETED status
3. Checks if not already calibrated
4. Sets `calibrated_at` and `calibrated_by` timestamps
5. Creates audit log entry
6. Returns updated PDR

**Endpoint:** `POST /api/pdrs/[id]/close-calibration`

**Authorization:** CEO role required

**Response:**
```json
{
  "pdr": { ... },
  "message": "Calibration closed successfully. PDR moved to Closed status."
}
```

**Error Cases:**
- 403: Non-CEO user attempting to close calibration
- 404: PDR not found
- 400: PDR not in COMPLETED status
- 400: Calibration already closed

### 5. Frontend Dashboard
**File:** `src/app/(ceo)/admin/page.tsx`

#### Filter Logic Updates
```typescript
case 'calibration':
  // Show completed PDRs that need calibration (not yet calibrated)
  return review.status === 'COMPLETED' && !review.calibrated_at && !review.calibratedAt;

case 'closed':
  // Show completed PDRs that have been calibrated
  return review.status === 'COMPLETED' && (review.calibrated_at || review.calibratedAt);
```

#### Close Calibration Button
Added green "Close Calibration" button that appears only in Calibration tab:
```tsx
{pendingReviewsFilter === 'calibration' && (
  <Button 
    variant="outline" 
    size="sm" 
    className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700 text-white border-green-600"
    onClick={async () => {
      // Calls /api/pdrs/[id]/close-calibration
      // Refreshes dashboard on success
    }}
  >
    Close Calibration
  </Button>
)}
```

## User Workflow

### CEO Perspective

1. **View Calibration Tab**
   - See all COMPLETED PDRs awaiting calibration
   - Each PDR shows performance data and calibration needs

2. **Review PDR**
   - Click "Review" to view full PDR details
   - Perform salary modeling/calibration analysis

3. **Close Calibration**
   - Click green "Close Calibration" button
   - PDR is timestamped and moved to Closed tab
   - Dashboard automatically refreshes

4. **View Closed Tab**
   - See all calibrated and closed PDRs
   - Can still view these PDRs as read-only

## Key Benefits

### 1. Clear Separation of States
- **Calibration** = "Needs my attention for modeling"
- **Closed** = "Already reviewed and closed"

### 2. Audit Trail
- `calibrated_at` - When calibration was closed
- `calibrated_by` - Which CEO closed it
- Full audit log in `audit_logs` table

### 3. Flexible Workflow
- CEOs can close calibration without changing PDR status
- PDRs remain in COMPLETED status throughout
- Easy to track which PDRs need attention

### 4. Scalability
- Indexed for performance
- Works with existing PDR statuses
- No breaking changes to existing data

## Testing

### Manual Testing Steps

1. **Complete a PDR as Employee**
   - Navigate through PDR workflow to completion
   - Verify PDR status = COMPLETED

2. **View as CEO**
   - Go to CEO Dashboard
   - Click "Calibration" tab
   - Verify PDR appears (calibrated_at is NULL)

3. **Close Calibration**
   - Click green "Close Calibration" button
   - Verify success message
   - Verify PDR disappears from Calibration tab

4. **View Closed Tab**
   - Click "Closed" tab
   - Verify PDR appears (calibrated_at is NOT NULL)
   - Verify "View" button works

### Database Verification

```sql
-- Check calibration status
SELECT 
  id,
  user_id,
  status,
  calibrated_at,
  calibrated_by,
  updated_at
FROM pdrs
WHERE status = 'COMPLETED'
ORDER BY updated_at DESC;

-- Check audit logs
SELECT *
FROM audit_logs
WHERE table_name = 'pdrs'
  AND action = 'UPDATE'
  AND new_values::jsonb ? 'calibrated_at'
ORDER BY created_at DESC;
```

## Migration Path

### For Existing Completed PDRs

All existing COMPLETED PDRs will have `calibrated_at = NULL`, meaning they'll all appear in the Calibration tab initially. This is the correct behavior - they need calibration review.

To bulk-close old PDRs if desired:
```sql
-- Close all PDRs from previous years
UPDATE pdrs
SET 
  calibrated_at = updated_at,
  calibrated_by = (SELECT id FROM profiles WHERE role = 'CEO' LIMIT 1)
WHERE status = 'COMPLETED'
  AND fy_start_date < '2024-01-01'
  AND calibrated_at IS NULL;
```

## Files Changed

1. **Database**
   - `add-calibration-tracking.sql` - New migration

2. **Types**
   - `src/types/supabase.ts` - Added calibration fields

3. **API**
   - `src/app/api/admin/dashboard/route.ts` - Added calibration counts
   - `src/app/api/pdrs/[id]/close-calibration/route.ts` - New endpoint

4. **Frontend**
   - `src/app/(ceo)/admin/page.tsx` - Updated filters and added button

## Architecture Decisions

### Why Timestamp Instead of Boolean Flag?

Using `calibrated_at` timestamp instead of `is_calibrated` boolean provides:
- When calibration was closed (audit trail)
- Who closed it (via calibrated_by)
- Sortable/filterable by time
- More flexible for future features (e.g., "closed within last 30 days")

### Why Separate from PDR Status?

Keeping calibration separate from PDR status allows:
- PDR status represents employee journey
- Calibration represents CEO internal workflow
- No confusion about PDR completion vs. CEO closure
- Simpler state machine (PDR status unchanged)

### Why Button in Dashboard vs. Dedicated Page?

Dashboard placement provides:
- Quick action from list view
- No extra navigation required
- Consistent with other approval workflows
- CEO can batch-close multiple PDRs efficiently

## Future Enhancements

### Potential Features

1. **Bulk Close Calibration**
   - Select multiple PDRs
   - Close all at once

2. **Calibration Reminders**
   - Notify CEO of PDRs awaiting calibration
   - Auto-reminder after X days

3. **Calibration Notes**
   - Add CEO notes when closing calibration
   - Track modeling decisions

4. **Calibration History**
   - View when each PDR was calibrated
   - Compare calibration timing across employees

5. **Reopen Calibration**
   - Allow CEO to reopen if needed
   - Track reopen history

## Troubleshooting

### PDR Not Appearing in Calibration Tab
**Check:**
- PDR status is exactly 'COMPLETED' (case-sensitive)
- calibrated_at is NULL
- User has CEO role

### Close Calibration Button Not Working
**Check:**
- Network tab for API errors
- Console for JavaScript errors
- User authentication (CEO role)
- PDR ID is valid

### PDR Appears in Both Tabs
**Check:**
- Browser cache (hard refresh)
- Database: `SELECT calibrated_at FROM pdrs WHERE id = 'xxx'`
- Frontend filter logic for typos

## Support

For issues or questions:
1. Check audit_logs table for recent changes
2. Verify database schema matches migration
3. Check browser console for errors
4. Review API response in Network tab

---

**Last Updated:** 2025-10-15
**Author:** Claude (AI Assistant)
**Status:** ✅ Complete and Tested

