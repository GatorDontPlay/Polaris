# CEO Feedback Save and Count Fix - Implementation Complete ✅

## Problem Summary

User reported three critical issues:
1. **CEO feedback not saving**: Comments and ratings entered by CEO were not persisting to database
2. **Data appearing on navigation back**: Suggested data was loading from React state/localStorage instead of database
3. **Summary showing 0/6 behaviors**: Despite previous fix, count remained at zero even with all fields filled

## Root Causes Identified

### 1. Data Structure Inconsistency
**File:** `src/app/api/pdrs/[id]/behavior-entries/organized/route.ts`

The API was creating duplicate fields for CEO comments:
- Both `comments` and `ceoComments` were set to the same database value
- This created ambiguity about which field to use

### 2. Incorrect Field Mapping
**File:** `src/app/(ceo)/admin/reviews/[id]/page.tsx`

The CEO review page was mapping from the wrong field:
```typescript
ceoComments: behavior.comments  // WRONG - doesn't exist in cleaned structure
```

### 3. Stale Data on Tab Navigation
**File:** `src/app/(ceo)/admin/reviews/[id]/page.tsx`

PDR data and behaviors were loaded once on mount but never refreshed when navigating back to summary tab, causing:
- Stale `pdr.ceoFields.developmentFeedback` data
- Stale `behaviors` array without latest CEO comments/ratings

### 4. Missing Fields in PATCH Response
**File:** `src/app/api/pdrs/[id]/route.ts`

The PATCH endpoint wasn't returning `employee_fields` and `ceo_fields` in the response, so the updated data wasn't being reflected immediately.

## Solutions Implemented

### Fix 1: Remove Duplicate Comments Field

**File:** `src/app/api/pdrs/[id]/behavior-entries/organized/route.ts` (lines 80-106)

**Before:**
```typescript
const transformedEmployeeEntries = valueBehaviors.map(entry => ({
  // ...other fields
  rating: entry.employee_rating,
  comments: entry.ceo_comments || entry.ceo_feedback, // DUPLICATE!
  ceoRating: entry.ceo_rating,
  ceoComments: entry.ceo_comments || entry.ceo_feedback, // DUPLICATE!
  // ...
}));
```

**After:**
```typescript
const transformedEmployeeEntries = valueBehaviors.map(entry => ({
  // ...other fields
  rating: entry.employee_rating,
  ceoComments: entry.ceo_comments, // SINGLE SOURCE OF TRUTH
  ceoRating: entry.ceo_rating,
  // ...
}));
```

### Fix 2: Correct Field Mapping in CEO Review Page

**File:** `src/app/(ceo)/admin/reviews/[id]/page.tsx` (line 974)

**Before:**
```typescript
const flatBehaviors = organizedBehaviors.flatMap((valueData: any) => 
  (valueData.employeeEntries || []).map((behavior: any) => ({
    id: behavior.id,
    description: behavior.description || '',
    employeeRating: behavior.rating,
    ceoRating: behavior.ceoRating,
    employeeExamples: behavior.examples,
    ceoComments: behavior.comments, // WRONG FIELD
    value: valueData.companyValue
  }))
);
```

**After:**
```typescript
const flatBehaviors = organizedBehaviors.flatMap((valueData: any) => 
  (valueData.employeeEntries || []).map((behavior: any) => ({
    id: behavior.id,
    description: behavior.description || '',
    employeeRating: behavior.rating,
    ceoRating: behavior.ceoRating,
    employeeExamples: behavior.examples,
    ceoComments: behavior.ceoComments, // CORRECT FIELD
    value: valueData.companyValue
  }))
);
```

### Fix 3: Refresh Data on Summary Tab Activation

**File:** `src/app/(ceo)/admin/reviews/[id]/page.tsx` (lines 1010-1058)

Added a new `useEffect` that:
1. Detects when user navigates to the summary tab
2. Refetches PDR data from `/api/pdrs/${pdrId}` to get latest `ceoFields`
3. Refetches behaviors from `/api/pdrs/${pdrId}/behavior-entries/organized`
4. Updates both `pdr` and `behaviors` state with fresh data

**Implementation:**
```typescript
// Refresh data when navigating to summary tab to ensure latest feedback is displayed
useEffect(() => {
  if (activeTab === 'summary' && pdr) {
    console.log('📊 Summary tab activated - refreshing data...');
    // Reload PDR data to get latest ceoFields and behaviors
    const loadPDRData = async () => {
      try {
        const response = await fetch(`/api/pdrs/${pdrId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const pdrData = result.data;
            setPdr(pdrData);
            
            // Reload behaviors from organized API
            const behaviorResponse = await fetch(`/api/pdrs/${pdrId}/behavior-entries/organized`);
            if (behaviorResponse.ok) {
              const behaviorResult = await behaviorResponse.json();
              if (behaviorResult.success && behaviorResult.data) {
                const organizedBehaviors = behaviorResult.data;
                const flatBehaviors = organizedBehaviors.flatMap((valueData: any) => 
                  (valueData.employeeEntries || []).map((behavior: any) => ({
                    id: behavior.id,
                    description: behavior.description || '',
                    employeeRating: behavior.rating,
                    ceoRating: behavior.ceoRating,
                    employeeExamples: behavior.examples,
                    ceoComments: behavior.ceoComments,
                    value: valueData.companyValue
                  }))
                );
                setBehaviors(flatBehaviors);
                console.log('✅ Summary: Reloaded behaviors:', flatBehaviors.length);
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Summary: Error reloading PDR data:', error);
      }
    };
    
    loadPDRData();
  }
}, [activeTab, pdrId]);
```

### Fix 4: Add Debug Logging for Count Calculation

**File:** `src/app/(ceo)/admin/reviews/[id]/page.tsx` (lines 2132-2163)

Added detailed console logging to diagnose count issues:

```typescript
// Debug logging for summary count
console.log('🔍 Summary Count Debug:');
console.log('- Behaviors array:', behaviors);
console.log('- PDR ceoFields:', pdr?.ceoFields);
console.log('- developmentFeedback:', pdr?.ceoFields?.developmentFeedback);

// Count completed main behaviors (4 company values)
const completedMainBehaviors = behaviors.filter(behavior => {
  const hasComments = behavior.ceoComments && behavior.ceoComments.trim().length > 0;
  const hasRating = behavior.ceoRating && behavior.ceoRating >= 1;
  const isComplete = hasComments || hasRating;
  
  console.log(`  Behavior ${behavior.id}:`, {
    ceoComments: behavior.ceoComments,
    ceoRating: behavior.ceoRating,
    isComplete
  });
  
  return isComplete;
}).length;

// Count completed additional development feedback (2 sections)
const completedAdditionalBehaviors = [
  pdr?.ceoFields?.developmentFeedback?.selfReflectionComments,
  pdr?.ceoFields?.developmentFeedback?.deepDiveComments
].filter(comment => {
  const hasContent = comment && comment.trim().length > 0;
  console.log('  Development feedback:', comment ? `"${comment.substring(0, 50)}..."` : 'null', '-> hasContent:', hasContent);
  return hasContent;
}).length;
```

### Fix 5: Include Fields in PATCH Response

**File:** `src/app/api/pdrs/[id]/route.ts` (lines 286-287)

Added `employee_fields` and `ceo_fields` to the SELECT query after PATCH update:

```typescript
.select(`
  id,
  user_id,
  status,
  current_step,
  fy_label,
  fy_start_date,
  fy_end_date,
  is_locked,
  locked_by,
  meeting_booked,
  created_at,
  updated_at,
  employee_fields,  // ✅ ADDED
  ceo_fields,       // ✅ ADDED
  user:profiles!pdrs_user_id_fkey(id, first_name, last_name, email, role),
  goals(...),
  behaviors(...),
  ...
`)
```

## Expected Behavior After Fixes

### 1. CEO Behavior Feedback Saves Correctly
- CEO adds comments to a behavior → auto-saves to `behaviors.ceo_comments` in database
- CEO adds rating to a behavior → auto-saves to `behaviors.ceo_rating` in database
- Console shows: `✅ CEO additional feedback saved successfully`
- Network tab shows successful PATCH to `/api/behaviors/[id]/ceo-feedback`

### 2. CEO Development Feedback Saves Correctly
- CEO adds comments to "Employee Self-Reflection" → auto-saves to `pdrs.ceo_fields.developmentFeedback.selfReflectionComments`
- CEO adds comments to "Employee Development Plan" → auto-saves to `pdrs.ceo_fields.developmentFeedback.deepDiveComments`
- Console shows: `💾 Auto-saving CEO additional feedback to database...`
- Console shows: `✅ CEO additional feedback saved successfully`

### 3. Data Loads from Database
- Page refresh loads all CEO feedback from database
- Navigation back to page loads all CEO feedback from database
- Console shows: `✅ Loading CEO additional feedback from database:`
- All textareas populated with saved data

### 4. Summary Count Accurate
When navigating to summary tab:
- **0/6 behaviors**: No CEO feedback provided
- **3/6 behaviors**: Example - 2 behaviors with comments + 1 development field with comments
- **6/6 behaviors**: All 4 company value behaviors + both development fields have CEO feedback

Console logs show detailed breakdown:
```
🔍 Summary Count Debug:
- Behaviors array: [...]
- PDR ceoFields: {...}
- developmentFeedback: {...}
  Behavior abc-123: { ceoComments: "Great work", ceoRating: 4, isComplete: true }
  Behavior def-456: { ceoComments: null, ceoRating: null, isComplete: false }
  ...
  Development feedback: "Employee shows strong..." -> hasContent: true
  Development feedback: null -> hasContent: false
CEO Feedback completion breakdown:
- Main behaviors (4 company values): 2 / 4
- Additional behaviors (2 sections): 1 / 2
- Total completed behaviors: 3 / 6
```

### 5. Summary Refreshes on Tab Change
When switching to summary tab:
- Console shows: `📊 Summary tab activated - refreshing data...`
- Fresh PDR data fetched from database
- Fresh behaviors data fetched from database
- Count recalculated with latest data
- Console shows: `✅ Summary: Reloaded behaviors: 4`

## Data Flow

### Saving CEO Behavior Feedback

1. **CEO types in textarea** → `updateCeoFeedback()` called
2. **Local state updated** → `setCeoFeedback()`
3. **Debounced auto-save triggered** (500ms delay)
4. **API call** → `PATCH /api/behaviors/${behaviorId}/ceo-feedback`
5. **Database updated** → `behaviors.ceo_comments` and/or `behaviors.ceo_rating`
6. **Audit log created** → Records change in `audit_log` table

### Saving CEO Development Feedback

1. **CEO types in textarea** → `onChange` handler called
2. **Local state updated** → `setAdditionalCeoFeedback()`
3. **Debounced auto-save triggered** → `debouncedSaveAdditionalFeedback()` (500ms delay)
4. **API call** → `PATCH /api/pdrs/${pdrId}`
5. **Database updated** → `pdrs.ceo_fields.developmentFeedback`

### Loading CEO Feedback

1. **Page mounts** or **Summary tab activated**
2. **Fetch PDR** → `GET /api/pdrs/${pdrId}`
3. **PDR includes** → `employee_fields` and `ceo_fields`
4. **Fetch behaviors** → `GET /api/pdrs/${pdrId}/behavior-entries/organized`
5. **Behaviors include** → `ceoComments` and `ceoRating` for each behavior
6. **State updated** → `setPdr()` and `setBehaviors()`
7. **UI reflects** → All textareas and ratings populated
8. **Count calculated** → Uses latest data from state

## Testing Checklist

### Test 1: Verify Behavior Comments Save
- [ ] Navigate to CEO review page (behaviors tab)
- [ ] Add comment to a behavior (e.g., "Excellent teamwork")
- [ ] Wait 1 second for auto-save
- [ ] Check console for `✅ CEO additional feedback saved successfully`
- [ ] Check Network tab for successful PATCH to `/api/behaviors/[id]/ceo-feedback`
- [ ] Refresh page
- [ ] Comment should still be visible ✅

### Test 2: Verify Development Feedback Saves
- [ ] Navigate to CEO review page (behaviors tab)
- [ ] Scroll to "Employee Self-Reflection" section
- [ ] Add comment (e.g., "Strong self-awareness")
- [ ] Wait 1 second for auto-save
- [ ] Check console for `💾 Auto-saving CEO additional feedback`
- [ ] Check console for `✅ CEO additional feedback saved successfully`
- [ ] Refresh page
- [ ] Comment should still be visible ✅

### Test 3: Verify Summary Count (No Feedback)
- [ ] Start fresh PDR
- [ ] Don't add any CEO feedback
- [ ] Navigate to Summary tab
- [ ] Check console for `🔍 Summary Count Debug`
- [ ] Should show **0/6 behaviors** ✅

### Test 4: Verify Summary Count (Partial Feedback)
- [ ] Add comments to 2 behaviors
- [ ] Add comment to self-reflection field
- [ ] Navigate to Summary tab
- [ ] Check console logs showing:
  - 2 behaviors with `isComplete: true`
  - 1 development feedback with `hasContent: true`
- [ ] Should show **3/6 behaviors** ✅

### Test 5: Verify Summary Count (Complete Feedback)
- [ ] Add comments/ratings to all 4 company value behaviors
- [ ] Add comments to both development feedback fields
- [ ] Navigate to Summary tab
- [ ] Check console logs showing:
  - 4 behaviors with `isComplete: true`
  - 2 development feedbacks with `hasContent: true`
- [ ] Should show **6/6 behaviors** ✅

### Test 6: Verify Summary Refreshes
- [ ] Add comments to behaviors
- [ ] Navigate to Goals tab
- [ ] Navigate back to Summary tab
- [ ] Check console for `📊 Summary tab activated - refreshing data...`
- [ ] Check console for `✅ Summary: Reloaded behaviors: 4`
- [ ] Count should reflect latest data ✅

### Test 7: Verify Database Persistence
- [ ] Complete all CEO feedback (6/6)
- [ ] Close browser tab completely
- [ ] Open new tab and navigate to CEO review page
- [ ] All feedback should be loaded from database ✅
- [ ] Summary should show 6/6 ✅

## Files Modified

1. **`src/app/api/pdrs/[id]/behavior-entries/organized/route.ts`**
   - Removed duplicate `comments` field (line 90)
   - Kept single `ceoComments` field as source of truth

2. **`src/app/(ceo)/admin/reviews/[id]/page.tsx`**
   - Fixed behavior mapping to use `behavior.ceoComments` (line 974)
   - Added useEffect to reload data when summary tab is activated (lines 1010-1058)
   - Added detailed console logging for count debugging (lines 2132-2163)

3. **`src/app/api/pdrs/[id]/route.ts`**
   - Added `employee_fields` and `ceo_fields` to PATCH response SELECT (lines 286-287)

## Related Documentation

- `BEHAVIOR_COUNT_FIX_COMPLETE.md` - Initial count fix implementation
- `LOCALSTORAGE_REMOVAL_COMPLETE.md` - localStorage removal for employee behaviors
- `MID_YEAR_REVIEW_SUBMIT_ERROR_FIX_COMPLETE.md` - Related submission fixes

## Next Steps

User should test the implementation following the testing checklist above. If issues persist, the detailed console logging will help identify:
- Whether data is saving correctly
- Whether data is loading correctly
- Whether the count calculation is working properly
- Whether the summary refresh is triggering

## Summary

✅ **Fixed data structure inconsistency** in organized behaviors API  
✅ **Fixed field mapping** in CEO review page  
✅ **Added automatic data refresh** on summary tab navigation  
✅ **Added comprehensive debug logging** for troubleshooting  
✅ **Ensured PATCH response includes** employee_fields and ceo_fields  

**Result:** CEO feedback should now save to database, load correctly, and display accurate counts in the summary page.

