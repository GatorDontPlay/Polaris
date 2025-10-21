# Fix Mid-Year Review Display and Save Issues - Implementation Plan

## Problem Analysis

User submitted mid-year review as CEO and encountered two critical issues:

### Issue 1: Raw Data Being Displayed
The "Goals Progress" and "Behaviors Assessment" sections show raw database IDs and technical data instead of human-readable content. The screenshot shows:
```
Goal: a4a4a4a4d-c1e0 [COMMENTS] — Behavior: 0x7e0f9-cabc-4e...
```

This is caused by the current save logic combining goal/behavior IDs with comments in a plain text format that's being displayed verbatim.

### Issue 2: Check-in Comments Not Saving
Mid-year check-in comments in textareas are not auto-saving to the database. They only save when user clicks "Save Comments" or "Complete Review" buttons. This is inconsistent with:
- CEO behavior feedback (auto-saves with 500ms debounce)
- CEO development feedback (auto-saves with 500ms debounce)
- CEO goal feedback (auto-saves with debounce)

## Root Causes

### Cause 1: Incorrect Data Structure for Mid-Year Comments
**File:** `src/app/(ceo)/admin/reviews/[id]/page.tsx` (lines 400-419, 489-506)

The save logic concatenates goal/behavior IDs with comments into a single text blob:
```typescript
const goalCommentsText = Object.entries(midYearGoalComments)
  .filter(([_, comment]) => comment.trim())
  .map(([goalId, comment]) => {
    const goal = goals.find(g => g.id === goalId);
    return `Goal: ${goal?.title || goalId}\n${comment}`;  // ← Mixing IDs with text
  })
  .join('\n\n');

const combinedFeedback = [goalCommentsText, behaviorCommentsText]
  .filter(text => text.trim())
  .join('\n\n---\n\n');  // ← Saved as single blob
```

This combined string is saved to `mid_year_reviews.ceo_feedback` and then displayed as-is, showing the raw formatting.

### Cause 2: No Auto-Save for Check-in Comments
**File:** `src/app/(ceo)/admin/reviews/[id]/page.tsx` (lines 351-365)

The change handlers update local state but don't trigger auto-save:
```typescript
const handleGoalCommentChange = useCallback((goalId: string, comment: string) => {
  setMidYearGoalComments(prevComments => {
    const updatedComments = { ...prevComments, [goalId]: comment };
    // Data saved to database on mid-year submission  ← NO AUTO-SAVE!
    return updatedComments;
  });
}, [pdrId]);
```

### Cause 3: Wrong Storage Location
Mid-year check-in comments should be stored per-goal and per-behavior in structured fields (like `pdrs.ceo_fields`), not as a concatenated text blob in `mid_year_reviews.ceo_feedback`.

## Solution

### Approach: Store Check-in Comments in `pdrs.ceo_fields`

Following the pattern we established for behavior and development feedback, store mid-year check-in comments in a structured JSONB field.

**Data Structure:**
```typescript
pdrs.ceo_fields = {
  goalFeedback: { ... },  // Existing
  developmentFeedback: { ... },  // Existing
  midYearCheckIn: {  // NEW
    goals: {
      [goalId]: {
        comments: string,
        savedAt: timestamp
      }
    },
    behaviors: {
      [behaviorId]: {
        comments: string,
        savedAt: timestamp
      }
    }
  }
}
```

This aligns with our previous fixes where:
- CEO behavior feedback saves to `behaviors.ceo_comments` + `pdrs.ceo_fields`
- CEO development feedback saves to `pdrs.ceo_fields.developmentFeedback`

## Implementation Steps

### Step 1: Add Debounced Auto-Save for Goal Check-in Comments

**File:** `src/app/(ceo)/admin/reviews/[id]/page.tsx`

Add a ref for debounce timer and create debounced save function:

```typescript
// Add after line 138
const midYearGoalCheckInTimer = useRef<NodeJS.Timeout>();
const midYearBehaviorCheckInTimer = useRef<NodeJS.Timeout>();

// Add cleanup useEffect
useEffect(() => {
  return () => {
    if (midYearGoalCheckInTimer.current) {
      clearTimeout(midYearGoalCheckInTimer.current);
    }
    if (midYearBehaviorCheckInTimer.current) {
      clearTimeout(midYearBehaviorCheckInTimer.current);
    }
  };
}, []);
```

Create debounced save function for goal check-in comments:

```typescript
const debouncedSaveGoalCheckIn = useCallback((goalId: string, comment: string) => {
  if (midYearGoalCheckInTimer.current) {
    clearTimeout(midYearGoalCheckInTimer.current);
  }
  
  midYearGoalCheckInTimer.current = setTimeout(async () => {
    try {
      console.log('💾 Auto-saving goal check-in comment to database...');
      
      // Get existing midYearCheckIn data
      const existingCheckIn = pdr?.ceoFields?.midYearCheckIn || { goals: {}, behaviors: {} };
      
      // Update the specific goal's comment
      const updatedCheckIn = {
        ...existingCheckIn,
        goals: {
          ...existingCheckIn.goals,
          [goalId]: {
            comments: comment,
            savedAt: new Date().toISOString()
          }
        }
      };
      
      const response = await fetch(`/api/pdrs/${pdrId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ceoFields: {
            ...pdr?.ceoFields,
            midYearCheckIn: updatedCheckIn
          }
        })
      });
      
      if (response.ok) {
        console.log('✅ Goal check-in comment saved successfully');
      } else {
        console.error('❌ Failed to save goal check-in comment:', response.status);
      }
    } catch (error) {
      console.error('❌ Error saving goal check-in comment:', error);
    }
  }, 500);
}, [pdr, pdrId]);
```

### Step 2: Add Debounced Auto-Save for Behavior Check-in Comments

```typescript
const debouncedSaveBehaviorCheckIn = useCallback((behaviorId: string, comment: string) => {
  if (midYearBehaviorCheckInTimer.current) {
    clearTimeout(midYearBehaviorCheckInTimer.current);
  }
  
  midYearBehaviorCheckInTimer.current = setTimeout(async () => {
    try {
      console.log('💾 Auto-saving behavior check-in comment to database...');
      
      const existingCheckIn = pdr?.ceoFields?.midYearCheckIn || { goals: {}, behaviors: {} };
      
      const updatedCheckIn = {
        ...existingCheckIn,
        behaviors: {
          ...existingCheckIn.behaviors,
          [behaviorId]: {
            comments: comment,
            savedAt: new Date().toISOString()
          }
        }
      };
      
      const response = await fetch(`/api/pdrs/${pdrId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ceoFields: {
            ...pdr?.ceoFields,
            midYearCheckIn: updatedCheckIn
          }
        })
      });
      
      if (response.ok) {
        console.log('✅ Behavior check-in comment saved successfully');
      } else {
        console.error('❌ Failed to save behavior check-in comment:', response.status);
      }
    } catch (error) {
      console.error('❌ Error saving behavior check-in comment:', error);
    }
  }, 500);
}, [pdr, pdrId]);
```

### Step 3: Update Change Handlers to Trigger Auto-Save

**Replace existing handlers (lines 351-365):**

```typescript
const handleGoalCommentChange = useCallback((goalId: string, comment: string) => {
  setMidYearGoalComments(prevComments => {
    const updatedComments = { ...prevComments, [goalId]: comment };
    return updatedComments;
  });
  
  // Trigger auto-save to database
  debouncedSaveGoalCheckIn(goalId, comment);
}, [debouncedSaveGoalCheckIn]);

const handleBehaviorCommentChange = useCallback((behaviorId: string, comment: string) => {
  setMidYearBehaviorComments(prevComments => {
    const updatedComments = { ...prevComments, [behaviorId]: comment };
    return updatedComments;
  });
  
  // Trigger auto-save to database
  debouncedSaveBehaviorCheckIn(behaviorId, comment);
}, [debouncedSaveBehaviorCheckIn]);
```

### Step 4: Load Check-in Comments from `pdrs.ceo_fields`

**Update loading logic (around line 1140):**

```typescript
// Load mid-year check-in comments from ceo_fields
if (pdr?.ceoFields?.midYearCheckIn) {
  const checkInData = pdr.ceoFields.midYearCheckIn;
  
  // Load goal check-in comments
  if (checkInData.goals) {
    const goalComments: Record<string, string> = {};
    Object.entries(checkInData.goals).forEach(([goalId, data]: [string, any]) => {
      goalComments[goalId] = data.comments || '';
    });
    setMidYearGoalComments(goalComments);
    console.log('📋 Loaded mid-year goal check-in comments from ceo_fields:', goalComments);
  }
  
  // Load behavior check-in comments
  if (checkInData.behaviors) {
    const behaviorComments: Record<string, string> = {};
    Object.entries(checkInData.behaviors).forEach(([behaviorId, data]: [string, any]) => {
      behaviorComments[behaviorId] = data.comments || '';
    });
    setMidYearBehaviorComments(behaviorComments);
    console.log('📋 Loaded mid-year behavior check-in comments from ceo_fields:', behaviorComments);
  }
}
```

**Remove the old loading logic that loads from mid_year_reviews (lines 1135-1180):**
- Remove the code that combines employee content into goal comments
- Remove the code that loads behavior comments from behaviors array

### Step 5: Update or Remove Old Save Functions

The functions `handleSaveMidYearComments` and `handleSaveMidYearReview` can be simplified or removed since auto-save handles persistence.

**Option A: Remove save buttons entirely** (since auto-save handles it)

**Option B: Keep buttons for backward compatibility** but make them no-ops or just show success message:

```typescript
const handleSaveMidYearComments = async () => {
  // Auto-save has already saved everything
  toast({
    title: "✅ Comments Saved",
    description: "All check-in comments are automatically saved as you type.",
  });
};
```

### Step 6: Update Submit Function

The `handleSaveMidYearReview` function should still update PDR status but no longer needs to save comments:

```typescript
const handleSaveMidYearReview = async () => {
  if (!pdr) return;
  
  setIsSaving(true);
  
  try {
    // All comments already auto-saved to pdrs.ceo_fields.midYearCheckIn
    // Just need to update PDR status
    
    const response = await fetch(`/api/pdrs/${pdrId}/approve-midyear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        // No need to send comments - already saved
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to complete mid-year review');
    }
    
    toast({
      title: "✅ Mid-Year Review Complete",
      description: "The review has been completed and the PDR is now open for final review.",
    });
    
    router.push('/admin/reviews');
  } catch (error) {
    console.error('Error completing mid-year review:', error);
    toast({
      title: "❌ Error",
      description: error instanceof Error ? error.message : "Failed to complete review",
      variant: "destructive",
    });
  } finally {
    setIsSaving(false);
  }
};
```

## Expected Results

### Before Fix:
- ❌ Check-in comments only save on button click
- ❌ Raw data displayed: `Goal: abc-123\nComment text`
- ❌ Data lost if page refreshes before saving
- ❌ Inconsistent with other CEO feedback fields

### After Fix:
- ✅ Check-in comments auto-save as you type (500ms debounce)
- ✅ Only comment text displayed (no IDs or formatting)
- ✅ Data persists across page refreshes
- ✅ Consistent with CEO behavior and development feedback
- ✅ Console shows auto-save confirmations
- ✅ Network tab shows PATCH requests to `/api/pdrs/${id}`

## Data Flow

### Save Flow:
1. User types in check-in textarea
2. `onChange` → `handleGoalCommentChange()` → updates local state
3. `debouncedSaveGoalCheckIn()` triggered (500ms delay)
4. API call: `PATCH /api/pdrs/${id}`
5. Body: `{ ceoFields: { midYearCheckIn: { goals: { [goalId]: { comments, savedAt } } } } }`
6. Database: `pdrs.ceo_fields` updated
7. Console: `✅ Goal check-in comment saved successfully`

### Load Flow:
1. Page loads PDR data
2. `useEffect` checks `pdr?.ceoFields?.midYearCheckIn`
3. Extracts comments from structured object
4. Updates state: `setMidYearGoalComments({ [goalId]: comments })`
5. Textareas populated with comments
6. Display shows clean comment text (no IDs)

## Files to Modify

1. **`src/app/(ceo)/admin/reviews/[id]/page.tsx`**
   - Add debounce timer refs
   - Add debounced save functions for goal and behavior check-ins
   - Update change handlers to trigger auto-save
   - Update loading logic to read from `ceo_fields.midYearCheckIn`
   - Simplify or remove save button handlers
   - Update submit function to not re-save comments

## Testing Checklist

### Test 1: Auto-Save Goal Check-in
- [ ] Navigate to Mid-Year Review tab
- [ ] Type comment in goal check-in textarea
- [ ] Wait 1 second
- [ ] Check console for `💾 Auto-saving goal check-in comment`
- [ ] Check console for `✅ Goal check-in comment saved successfully`
- [ ] Refresh page
- [ ] Comment still visible ✅

### Test 2: Auto-Save Behavior Check-in
- [ ] Type comment in behavior check-in textarea
- [ ] Wait 1 second
- [ ] Check console for auto-save messages
- [ ] Refresh page
- [ ] Comment still visible ✅

### Test 3: Display Shows Clean Text
- [ ] Add check-in comments
- [ ] Submit mid-year review
- [ ] Navigate back to view review
- [ ] Should NOT see goal/behavior IDs
- [ ] Should only see comment text ✅

### Test 4: Consistency with Other Fields
- [ ] Add CEO behavior feedback (auto-saves)
- [ ] Add CEO development feedback (auto-saves)
- [ ] Add mid-year check-in (should also auto-save)
- [ ] All three types save consistently ✅

## Alignment with Previous Fixes

This solution follows the exact same pattern as our previous fixes:

### CEO Behavior Feedback:
- **Save:** Debounced auto-save (500ms) via `updateCeoFeedback()`
- **Store:** `behaviors.ceo_comments` in database
- **Load:** Read from `behavior.ceoComments` in API response
- **Display:** Show in textarea bound to state

### CEO Development Feedback:
- **Save:** Debounced auto-save (500ms) via `debouncedSaveAdditionalFeedback()`
- **Store:** `pdrs.ceo_fields.developmentFeedback` in database
- **Load:** Read from `pdr.ceoFields.developmentFeedback`
- **Display:** Show in textarea bound to state

### Mid-Year Check-in Comments (NEW):
- **Save:** Debounced auto-save (500ms) via `debouncedSaveGoalCheckIn()` / `debouncedSaveBehaviorCheckIn()`
- **Store:** `pdrs.ceo_fields.midYearCheckIn` in database
- **Load:** Read from `pdr.ceoFields.midYearCheckIn`
- **Display:** Show in textarea bound to state

**All three use the same pattern: debounced auto-save → structured JSONB storage → clean display** ✅

## Summary

This fix ensures mid-year check-in comments work exactly like all other CEO feedback fields:
- Auto-save as you type
- Store in structured database fields
- Load cleanly without raw IDs
- Display only the comment text

The solution is consistent, maintainable, and aligned with our previous architectural decisions.

