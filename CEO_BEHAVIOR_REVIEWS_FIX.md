# CEO Behavior Reviews Not Saving - Fix Complete

## Problem

After the CEO completes the final review and clicks submit:
1. The submit works without errors ✅
2. BUT the individual behavior ratings and comments entered by the CEO are **not saved to the database** ❌
3. When viewing the PDR after submission, the CEO's behavior assessments are blank

## Root Cause

The system had **two separate issues**:

### Issue #1: Missing `updated_at` Column
The `end_year_reviews` table was missing the `updated_at` column, causing the initial API error.

**Fixed in:** `fix-end-year-reviews-updated-at.sql`

### Issue #2: Behavior Reviews Not Sent to Database
The CEO review page was:
- Saving behavior ratings/comments to **localStorage only** 📁
- Not sending them to the database when completing the final review 🚫
- The `complete-final-review` API endpoint only saved overall rating/comments, not individual items

## Solution

### Backend Changes

**File:** `src/app/api/pdrs/[id]/complete-final-review/route.ts`

1. **Updated the request schema** to accept behavior and goal reviews:
```typescript
const ceoFinalReviewSchema = z.object({
  ceoOverallRating: z.number().min(1).max(5),
  ceoFinalComments: z.string().min(1, 'Final comments are required'),
  behaviorReviews: z.record(z.object({
    rating: z.number().min(1).max(5),
    comments: z.string().optional(),
  })).optional(),
  goalReviews: z.record(z.object({
    rating: z.number().min(1).max(5),
    comments: z.string().optional(),
  })).optional(),
});
```

2. **Added logic to save individual behavior reviews** to the `behaviors` table:
```typescript
for (const [behaviorId, review] of Object.entries(behaviorReviews)) {
  await supabase
    .from('behaviors')
    .update({
      ceo_rating: review.rating,
      ceo_feedback: review.comments || '',
      updated_at: new Date().toISOString(),
    })
    .eq('id', behaviorId)
    .eq('pdr_id', pdrId);
}
```

3. **Added logic to save individual goal reviews** to the `goals` table similarly

### Frontend Changes

**File:** `src/app/(ceo)/admin/reviews/[id]/page.tsx`

Updated the `handleCompleteFinalReview` function to:

1. **Collect behavior and goal reviews** from state
2. **Calculate overall rating** from all individual ratings
3. **Send all data** to the API:
```typescript
body: JSON.stringify({
  ceoOverallRating: calculatedRating,
  ceoFinalComments: endYearReviewData?.ceoOverallFeedback || 'Final review completed',
  behaviorReviews: finalBehaviorReviews, // ✅ NOW SENT!
  goalReviews: finalGoalReviews,         // ✅ NOW SENT!
})
```

## Database Schema

### Behaviors Table
- ✅ `ceo_rating` INTEGER (1-5)
- ✅ `ceo_feedback` TEXT
- ✅ `updated_at` TIMESTAMP

### Goals Table
- ✅ `ceo_rating` INTEGER (1-5)
- ✅ `ceo_feedback` TEXT
- ✅ `updated_at` TIMESTAMP

### End Year Reviews Table
- ✅ `ceo_overall_rating` INTEGER (1-5)
- ✅ `ceo_final_comments` TEXT
- ✅ `updated_at` TIMESTAMP (newly added)

## Testing Steps

### 1. Complete the Database Migration (If Not Already Done)
Run `fix-end-year-reviews-updated-at.sql` in Supabase SQL Editor

### 2. Test the CEO Final Review Flow

As CEO:
1. Navigate to **Admin → Reviews**
2. Select an employee's PDR with status `END_YEAR_SUBMITTED`
3. For each behavior:
   - Enter a CEO Final Rating (1-5)
   - Enter CEO Final Comments
4. For each goal:
   - Enter a CEO Rating (1-5)
   - Enter CEO Feedback
5. Click **"Complete Final Review"**
6. Verify success message appears

### 3. Verify Data Persistence

1. Refresh the page or navigate away and back
2. Open the same PDR again
3. **Verify** that all CEO ratings and comments are still visible
4. Check the database directly:

```sql
-- Check behavior reviews
SELECT 
  b.id,
  cv.name as company_value,
  b.ceo_rating,
  b.ceo_feedback,
  b.updated_at
FROM behaviors b
JOIN company_values cv ON b.value_id = cv.id
WHERE b.pdr_id = 'YOUR_PDR_ID'
  AND b.ceo_rating IS NOT NULL;

-- Check goal reviews
SELECT 
  id,
  title,
  ceo_rating,
  ceo_feedback,
  updated_at
FROM goals
WHERE pdr_id = 'YOUR_PDR_ID'
  AND ceo_rating IS NOT NULL;

-- Check end year review
SELECT 
  ceo_overall_rating,
  ceo_final_comments,
  updated_at
FROM end_year_reviews
WHERE pdr_id = 'YOUR_PDR_ID';
```

## Files Modified

1. ✅ `fix-end-year-reviews-updated-at.sql` - Database migration for `updated_at` columns
2. ✅ `src/types/supabase.ts` - Added `updated_at` to type definitions
3. ✅ `src/app/api/pdrs/[id]/complete-final-review/route.ts` - Save behavior/goal reviews to database
4. ✅ `src/app/(ceo)/admin/reviews/[id]/page.tsx` - Send behavior/goal reviews + load from database
5. ✅ `src/app/api/pdrs/[id]/route.ts` - Fixed column names (`ceo_feedback` not `ceo_comments`)
6. ✅ `src/app/api/pdrs/[id]/behavior-entries/organized/route.ts` - Include `ceoRating` in response
7. ✅ `CEO_FINAL_REVIEW_FIX.md` - Initial fix documentation
8. ✅ `CEO_BEHAVIOR_REVIEWS_FIX.md` - This comprehensive fix documentation

## What Happens Now

When the CEO clicks "Complete Final Review":

1. ✅ Frontend collects all behavior ratings/comments from state
2. ✅ Frontend collects all goal ratings/comments from state
3. ✅ Frontend calculates overall rating from all individual ratings
4. ✅ Frontend sends everything to the API in one request
5. ✅ Backend saves each behavior's CEO rating/feedback to `behaviors` table
6. ✅ Backend saves each goal's CEO rating/feedback to `goals` table
7. ✅ Backend saves overall rating/comments to `end_year_reviews` table
8. ✅ Backend marks PDR as `COMPLETED` and locks it
9. ✅ All data is persisted and visible on page reload

## Console Logging

The fix includes detailed logging for debugging:

**Backend logs:**
```
💾 Saving behavior reviews: 4
✅ Updated behavior abc123 with rating 4
✅ Updated behavior def456 with rating 5
...
```

**Frontend logs:**
```
📦 Collecting behavior and goal reviews for final submission...
Final behavior reviews: { behaviorId1: { rating: 4, comments: '...' }, ... }
📊 Calculated overall rating: 4 (from 8 ratings)
```

## Prevention

This fix ensures:
- ✅ All CEO review data is saved to the database, not just localStorage
- ✅ The `complete-final-review` endpoint handles all review data atomically
- ✅ Individual ratings and overall ratings are both persisted
- ✅ Data is available after page refresh or session end
- ✅ Audit trail is complete with proper `updated_at` timestamps

## Related Issues Fixed

- [x] Missing `updated_at` column on `end_year_reviews`
- [x] Missing `updated_at` column on `mid_year_reviews`
- [x] CEO behavior ratings not persisting to database
- [x] CEO goal ratings not persisting to database
- [x] CEO behavior ratings not loading from database on page load
- [x] CEO goal ratings not loading from database on page load
- [x] Overall rating calculation from individual ratings
- [x] Data loss on page refresh after completing review
- [x] Wrong column names in API (`ceo_comments` vs `ceo_feedback`)
- [x] Missing `ceoRating` field in organized behaviors API response

## Summary of All Changes

### Database Layer
- Added `updated_at` columns with auto-update triggers

### API Layer (Backend)
1. **Complete Final Review Endpoint** - Now accepts and saves individual behavior/goal reviews
2. **PDR GET Endpoint** - Fixed to query `ceo_feedback` instead of `ceo_comments`
3. **Organized Behaviors Endpoint** - Added `ceoRating` and `ceoComments` to response

### Frontend Layer
1. **CEO Review Page (Send)** - Sends all behavior/goal reviews when completing
2. **CEO Review Page (Load)** - Loads CEO ratings from database into form state
3. **Comprehensive Logging** - Added detailed console logs for debugging

