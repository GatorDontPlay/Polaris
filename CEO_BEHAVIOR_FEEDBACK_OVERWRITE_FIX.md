# CEO Behavior Feedback Fields Overwrite Fix

## 🐛 Bug Description

**Issue:** Two separate textarea fields in the CEO behavior review section were saving to the same database column (`ceo_comments`), causing whichever saved last to overwrite the other field's data.

**Location:** CEO Behavior Review section in `src/components/ceo/behavior-review-section.tsx`

**Affected PDR:** `dd6636bd-74d5-4d5a-a591-98bde725f330`

**User Report:**
- User typed "i like chicken" in Field 1 (Adjust Employees Initiatives)
- User typed "gibberish letters" in Field 2 (CEO Notes/Feedback)
- After saving and refreshing, both fields showed "gibberish letters"

---

## 🔍 Root Cause Analysis

### Database Schema (Before Fix)
```sql
CREATE TABLE behaviors (
  ...
  ceo_comments TEXT,  -- Single column for CEO feedback
  ...
);
```

### UI Implementation (Before Fix)
```typescript
// Two separate textarea fields:
Field 1: "Adjust Employees Initiatives" → ceoFeedback[valueId].description
Field 2: "CEO Notes/Feedback"           → ceoFeedback[valueId].comments

// But both saved to the same column:
body: JSON.stringify({
  ceoNotes: feedback.comments,  // ❌ Only sends comments field!
});
```

### The Race Condition
```
Timeline:
0ms:   User types "i like chicken" in Field 1
       → Triggers debounced save (500ms delay)
100ms: User types "gibberish" in Field 2
       → Triggers debounced save (500ms delay)
600ms: Field 1 save completes → writes "i like chicken" to ceo_comments
650ms: Field 2 save completes → writes "gibberish" to ceo_comments ❌ OVERWRITES
Result: Only "gibberish" persists in database
```

---

## ✅ Solution

Added a new database column `ceo_adjusted_initiative` to store Field 1 separately from Field 2.

### New Data Flow
```
UI Field 1 (Adjust Initiatives) → description → API → ceo_adjusted_initiative (NEW)
UI Field 2 (CEO Notes/Feedback) → comments   → API → ceo_comments (existing)
```

---

## 📝 Implementation Details

### 1. Database Migration
**File:** `supabase/migrations/add_ceo_adjusted_initiative.sql` (NEW)

```sql
ALTER TABLE behaviors 
ADD COLUMN IF NOT EXISTS ceo_adjusted_initiative TEXT;

COMMENT ON COLUMN behaviors.ceo_adjusted_initiative IS 
'CEO adjustments or refinements to employee behavior initiatives. This is separate from ceo_comments which contains CEO feedback/notes.';

CREATE INDEX IF NOT EXISTS idx_behaviors_ceo_adjusted_initiative 
ON behaviors(ceo_adjusted_initiative) 
WHERE ceo_adjusted_initiative IS NOT NULL;
```

**Deployment:** Run this SQL in Supabase SQL Editor before deploying code changes.

### 2. API Schema Update
**File:** `src/app/api/behaviors/[id]/ceo-feedback/route.ts`

**Added new field to Zod schema:**
```typescript
const ceoFeedbackSchema = z.object({
  ceoNotes: z.string().optional(),
  ceoAdjustedInitiative: z.string().optional(), // NEW
  ceoRating: z.number().int().min(1).max(5).optional(),
});
```

**Updated save logic:**
```typescript
if (feedbackData.ceoAdjustedInitiative !== undefined) {
  updateData.ceo_adjusted_initiative = feedbackData.ceoAdjustedInitiative;
}
```

**Updated audit log:**
```typescript
const oldValues = {
  ceo_comments: behavior.ceo_comments,
  ceo_adjusted_initiative: behavior.ceo_adjusted_initiative, // NEW
  ceo_rating: behavior.ceo_rating,
};
```

### 3. Component Save Functions
**File:** `src/components/ceo/behavior-review-section.tsx`

**Updated `saveCeoReview` function:**
```typescript
body: JSON.stringify({
  ceoNotes: feedback.comments,
  ceoAdjustedInitiative: feedback.description, // NEW - send both fields
}),
```

**Updated `saveAllReviews` function:**
```typescript
body: JSON.stringify({
  ceoNotes: feedback.comments || '',
  ceoAdjustedInitiative: feedback.description || '', // NEW - send both fields
}),
```

### 4. Component Load Logic
**File:** `src/components/ceo/behavior-review-section.tsx`

**Updated data loading to populate both fields separately:**
```typescript
valueData.employeeEntries.forEach((behavior) => {
  // Load adjusted initiative into description field
  if (behavior.ceoAdjustedInitiative && behavior.ceoAdjustedInitiative.trim() !== '') {
    adjustedInitiative = behavior.ceoAdjustedInitiative;
    hasAdjustedInitiative = true;
  }
  
  // Load comments into comments field (separate)
  if (behavior.ceoComments && behavior.ceoComments.trim() !== '') {
    ceoComments = behavior.ceoComments;
    hasComments = true;
  }
});

if (hasComments || hasAdjustedInitiative) {
  newCeoFeedback[valueData.companyValue.id] = {
    description: adjustedInitiative,  // Separate field
    comments: ceoComments,            // Separate field
  };
}
```

### 5. Organized Data API
**File:** `src/app/api/pdrs/[id]/behavior-entries/organized/route.ts`

**Added new field to response:**
```typescript
ceoComments: entry.ceo_comments,
ceoAdjustedInitiative: entry.ceo_adjusted_initiative, // NEW
ceoRating: entry.ceo_rating,
```

### 6. TypeScript Types
**File:** `src/types/index.ts`

**Updated `Behavior` interface:**
```typescript
export interface Behavior {
  // ... existing fields
  ceoComments?: string;
  ceoAdjustedInitiative?: string; // NEW
  ceoRating?: number;
  // ... rest of fields
}
```

**Updated `BehaviorEntry` interface:**
```typescript
export interface BehaviorEntry {
  // ... existing fields
  ceoComments?: string;
  ceoAdjustedInitiative?: string; // NEW
  ceoRating?: number;
  // ... rest of fields
}
```

---

## 🧪 Testing Instructions

### Test Case 1: Fresh Save Test
1. Navigate to a PDR behavior review page (CEO view)
2. Type "Test adjusted initiative" in Field 1 (Adjust Employees Initiatives)
3. Type "Test CEO comments" in Field 2 (CEO Notes/Feedback)
4. Wait 1 second for debounced auto-save
5. Refresh the page (F5)
6. **Expected:** 
   - Field 1 shows "Test adjusted initiative" ✅
   - Field 2 shows "Test CEO comments" ✅

### Test Case 2: Rapid Typing Test (Original Bug Scenario)
1. Type quickly in Field 1, then immediately type in Field 2
2. Wait 2 seconds for both saves to complete
3. Refresh the page
4. **Expected:** Both fields persist correctly ✅

### Test Case 3: Existing Data Backward Compatibility
1. Open PDR `dd6636bd-74d5-4d5a-a591-98bde725f330` (has old data)
2. Navigate to Behaviors tab
3. **Expected:** 
   - Field 1 (Adjust Initiatives) is empty or shows null (new column, no data yet)
   - Field 2 (CEO Notes) shows existing data from `ceo_comments` column ✅

### Test Case 4: Navigation Persistence Test
1. Fill both fields with different text
2. Navigate to "Goals" tab
3. Navigate back to "Behaviors" tab
4. **Expected:** Both fields still show their respective text ✅

### Test Case 5: Save All Reviews Test
1. Fill multiple behavior feedback forms (both fields in each)
2. Navigate to another tab (triggers `saveAllReviews`)
3. Return to Behaviors tab
4. **Expected:** All fields across all behaviors are saved correctly ✅

---

## 🔬 Verification Steps

### Console Log Checks

Watch the browser console while testing:

**When Loading Data:**
```
🔍 Loading behavior: {
  id: "abc123",
  ceoComments: "Test CEO comments",
  ceoAdjustedInitiative: "Test adjusted initiative",
  hasContent: true
}
```

**When Saving Data:**
```
💾 Saving CEO feedback to /api/behaviors/abc123/ceo-feedback
Request body: {
  ceoNotes: "Test CEO comments",
  ceoAdjustedInitiative: "Test adjusted initiative"
}
```

### Database Verification

Query the database directly:
```sql
SELECT 
  id,
  value_id,
  ceo_comments,
  ceo_adjusted_initiative,
  ceo_rating,
  updated_at
FROM behaviors
WHERE pdr_id = 'dd6636bd-74d5-4d5a-a591-98bde725f330'
ORDER BY updated_at DESC;
```

**Expected:** Both columns should have values after CEO fills both fields.

---

## 📊 Impact Assessment

### Data Safety
- ✅ **No data loss:** Existing `ceo_comments` data remains untouched
- ✅ **Backward compatible:** Old data displays correctly in Field 2
- ✅ **Additive change:** New column, no destructive alterations

### Performance Impact
- ✅ **Minimal:** One additional TEXT column per behavior entry
- ✅ **Indexed:** Index added for query optimization
- ✅ **No N+1 queries:** Column fetched in existing queries

### Feature Impact
- ✅ **Isolated:** Only affects CEO behavior review feature
- ✅ **Preserves fixes:** Doesn't impact mid-year check-in or final review fixes
- ✅ **Type-safe:** Full TypeScript coverage with updated interfaces

---

## 🎯 Related Issues

This fix is related to but separate from:
- ✅ **CEO Mid-Year Check-In Comments Fix** (`CEO_MID_YEAR_CHECKIN_STALE_CLOSURE_FIX.md`) - Similar state management issue, different feature
- ✅ **CEO Final Review State Refresh Fix** (`CEO_FINAL_REVIEW_STATE_REFRESH_FIX.md`) - State refresh issue, different feature

---

## 📋 Files Changed Summary

### New Files
- `supabase/migrations/add_ceo_adjusted_initiative.sql`

### Modified Files
- `src/app/api/behaviors/[id]/ceo-feedback/route.ts` (API schema & save logic)
- `src/components/ceo/behavior-review-section.tsx` (save & load functions)
- `src/app/api/pdrs/[id]/behavior-entries/organized/route.ts` (organized data response)
- `src/types/index.ts` (TypeScript interfaces)

### Total Changes
- 1 new file
- 4 modified files
- ~60 lines added
- ~15 lines modified

---

## 🚀 Deployment Checklist

- [ ] **Step 1:** Run database migration in Supabase SQL Editor
  ```sql
  -- Copy contents of supabase/migrations/add_ceo_adjusted_initiative.sql
  -- Paste and execute in Supabase SQL Editor
  ```
- [ ] **Step 2:** Verify column exists
  ```sql
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'behaviors' 
  AND column_name = 'ceo_adjusted_initiative';
  ```
- [ ] **Step 3:** Deploy code changes (all modified files)
- [ ] **Step 4:** Test with existing PDR data (backward compatibility)
- [ ] **Step 5:** Test with new PDR data (both fields working)
- [ ] **Step 6:** Monitor for any runtime errors in first 24 hours

---

## 🔧 Rollback Plan

If issues arise:

1. **Revert code changes** to previous commit
2. **Keep database column** (no harm, just unused)
3. **Or drop column if needed:**
   ```sql
   ALTER TABLE behaviors DROP COLUMN IF EXISTS ceo_adjusted_initiative;
   ```

**Note:** No data loss will occur during rollback as the fix only adds functionality.

---

**Date Fixed:** October 21, 2024  
**Fixed By:** Claude  
**Status:** ✅ Implemented & Ready for Testing  
**Priority:** High - Data Loss Bug  
**Verified:** Pending user testing

