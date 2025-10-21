# Employee Rating Not Showing for CEO - Investigation & Fix Plan

## Problem

CEO is viewing the Final Review section and sees:
- **Employee text**: "asdfadsfadsfasd" ✅ (showing correctly)
- **Employee Rating**: "0/5" ❌ (should show the employee's self-rating)

## Data Flow Analysis

### Employee Submission (End-Year Review)
**File**: `src/app/(employee)/pdr/[id]/end-year/page.tsx` (lines 752-774)

1. Employee fills out end-year form with ratings
2. Form submits to `/api/pdrs/${pdrId}/end-year` (saves overall review)
3. **Then** loops through goals and saves individual ratings:
   ```typescript
   await fetch(`/api/goals/${goalId}`, {
     method: 'PUT',
     body: JSON.stringify({
       employeeRating: assessment.rating,  // ← Should save rating
       employeeProgress: assessment.reflection,
     }),
   });
   ```

### API Save (Goals Endpoint)
**File**: `src/app/api/goals/[id]/route.ts` (line 100)

```typescript
if (goalData.employeeRating !== undefined) 
  updateData.employee_rating = goalData.employeeRating;  // ← Maps to DB column
```

✅ **Correctly saves** `employeeRating` → `employee_rating` in database

### API Load (PDR Endpoint)
**File**: `src/app/api/pdrs/[id]/route.ts` (line 103)

```typescript
goals(id, title, description, ..., employee_rating, ...)  // ← Includes in SELECT
```

✅ **Correctly selects** `employee_rating` from database

### CEO Page Load
**File**: `src/app/(ceo)/admin/reviews/[id]/page.tsx` (line 1029)

```typescript
employeeRating: goal.employeeRating || goal.employee_rating,  // ← Maps both formats
```

✅ **Correctly maps** snake_case → camelCase

### CEO Page Display
**File**: `src/app/(ceo)/admin/reviews/[id]/page.tsx` (line 2815)

```typescript
{goal.employeeRating || (goal as any).employee_rating || 0}/5
```

✅ **Correctly displays** with fallback to 0

## Root Cause Analysis

### Issue 1: Data Not Saved
**Hypothesis**: Employee's rating submission might be failing silently

**Evidence**:
- Employee text IS showing (from `end_year_reviews.achievements_summary`)
- Employee rating NOT showing (from `goals.employee_rating`)
- These are saved in **different API calls** during submission

**Potential Causes**:
1. Network error during individual goal updates (after main review saves)
2. Permission/auth error preventing goal updates
3. PDR status not allowing goal updates at submission time
4. JavaScript error preventing the goal update loop from completing

### Issue 2: Data Not Loading
**Hypothesis**: Data is saved but not being loaded/refreshed for CEO

**Potential Causes**:
1. CEO page loads PDR before employee finishes submitting all goals
2. Cache/stale data issue
3. Goals not being re-fetched when navigating to Final Review tab

### Issue 3: Display Condition Issue
**Hypothesis**: Rating is loaded but hidden by conditional logic

**Potential Causes**:
1. Status-based visibility check
2. Null/undefined vs 0 distinction issue

## Diagnostic Steps

### Step 1: Check Database Directly
Query the database to see if employee ratings are actually saved:

```sql
SELECT id, title, employee_rating, employee_progress, ceo_rating 
FROM goals 
WHERE pdr_id = 'the-pdr-id';
```

**Expected**: If employee submitted, `employee_rating` should be 1-5
**If 0 or NULL**: Data is NOT being saved → Issue 1
**If has value**: Data IS saved but not displaying → Issue 2 or 3

### Step 2: Check Browser Console During Employee Submission
Watch for:
```
✅ Goal ${goalId} rating saved: ${rating}
❌ Failed to save goal ${goalId} rating
```

**If seeing failures**: Network/permission issue preventing saves
**If no logs**: JavaScript error preventing loop execution

### Step 3: Check Browser Console During CEO View
Watch for:
```
📋 Loaded goals from API: [count]
🔍 Individual goal employee data: [details]
```

Look at the loaded goal data to see if `employee_rating` field is present.

### Step 4: Check Network Tab During CEO View
Inspect the response from `/api/pdrs/${id}`:
- Check if `goals` array is included
- Check if each goal has `employee_rating` field
- Verify the values are not 0 or null

## Proposed Fixes

### Fix 1: Add Error Handling & Logging to Employee Submission

**File**: `src/app/(employee)/pdr/[id]/end-year/page.tsx` (around line 752)

**Problem**: Silent failures - no user feedback if goal rating saves fail

**Solution**:
```typescript
// Enhanced error handling
const goalSavePromises = [];
const goalSaveErrors = [];

for (const [goalId, assessment] of Object.entries(goalSelfAssessments)) {
  try {
    console.log(`💾 Saving goal ${goalId} with rating:`, assessment.rating);
    
    const goalResponse = await fetch(`/api/goals/${goalId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeRating: assessment.rating,
        employeeProgress: assessment.reflection,
      }),
    });
    
    if (goalResponse.ok) {
      const result = await goalResponse.json();
      console.log(`✅ Goal ${goalId} rating saved successfully:`, result);
    } else {
      const errorData = await goalResponse.json().catch(() => ({}));
      console.error(`❌ Failed to save goal ${goalId}:`, errorData);
      goalSaveErrors.push({ goalId, error: errorData });
    }
  } catch (error) {
    console.error(`❌ Error saving goal ${goalId}:`, error);
    goalSaveErrors.push({ goalId, error });
  }
}

// Alert user if any goal saves failed
if (goalSaveErrors.length > 0) {
  toast({
    title: "⚠️ Partial Save",
    description: `Some goal ratings failed to save. Please try again or contact support.`,
    variant: "destructive",
  });
}
```

### Fix 2: Add Data Refresh When CEO Views Final Review

**File**: `src/app/(ceo)/admin/reviews/[id]/page.tsx`

**Problem**: Stale data - CEO might see cached data from before employee submitted

**Solution**: Add refresh when Final Review tab is activated (similar to existing summary refresh)

```typescript
// Add to existing useEffect around line 1015
useEffect(() => {
  if (activeTab === 'final-review' && pdr) {
    console.log('📊 Final Review tab activated - refreshing data...');
    // Reload PDR data to get latest employee ratings
    const loadPDRData = async () => {
      try {
        const response = await fetch(`/api/pdrs/${pdrId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const pdrData = result.data;
            setPdr(pdrData);
            
            // Reload goals with latest employee ratings
            if (pdrData.goals && Array.isArray(pdrData.goals)) {
              setGoals(pdrData.goals.map((goal: any) => ({
                id: goal.id,
                title: goal.title,
                description: goal.description,
                employeeRating: goal.employeeRating || goal.employee_rating,
                employeeProgress: goal.employeeProgress || goal.employee_progress,
                // ... other fields
              })));
              console.log('✅ Final Review: Reloaded goals with employee ratings');
            }
          }
        }
      } catch (error) {
        console.error('❌ Final Review: Error reloading data:', error);
      }
    };
    
    loadPDRData();
  }
}, [activeTab, pdrId]);
```

### Fix 3: Add Debugging Console Logs

**File**: `src/app/(ceo)/admin/reviews/[id]/page.tsx` (around line 2815)

**Problem**: Hard to diagnose why rating shows as 0

**Solution**: Add detailed logging before display

```typescript
<div className="flex items-center gap-2 mt-1">
  <span className="text-xs font-medium text-muted-foreground">Employee Rating:</span>
  <span className="font-semibold text-sm text-foreground">
    {(() => {
      const rating = goal.employeeRating || (goal as any).employee_rating || 0;
      console.log(`🔍 Goal "${goal.title}" employee rating:`, {
        employeeRating: goal.employeeRating,
        employee_rating: (goal as any).employee_rating,
        finalRating: rating,
        goalObject: goal
      });
      return rating;
    })()}/5
  </span>
</div>
```

### Fix 4: Add Visual Indicator for Missing Ratings

**File**: `src/app/(ceo)/admin/reviews/[id]/page.tsx` (line 2815)

**Problem**: 0 rating looks like employee rated it 0, but might mean "not rated"

**Solution**: Distinguish between "not rated" and "rated as 0"

```typescript
<div className="flex items-center gap-2 mt-1">
  <span className="text-xs font-medium text-muted-foreground">Employee Rating:</span>
  {(() => {
    const rating = goal.employeeRating || (goal as any).employee_rating;
    if (rating === null || rating === undefined || rating === 0) {
      return (
        <span className="font-semibold text-sm text-muted-foreground italic">
          Not rated
        </span>
      );
    }
    return (
      <span className="font-semibold text-sm text-foreground">
        {rating}/5
      </span>
    );
  })()}
</div>
```

## Testing Plan

### Test 1: Verify Employee Submission Saves Ratings
1. Log in as employee
2. Navigate to End-Year Review
3. Fill out form with ratings for all goals
4. Open browser console
5. Click Submit
6. **Verify**: Console shows "✅ Goal ${id} rating saved successfully" for each goal
7. **Verify**: No "❌ Failed to save" errors

### Test 2: Verify Database Contains Ratings
1. After employee submission
2. Check database: `SELECT id, title, employee_rating FROM goals WHERE pdr_id = 'xxx';`
3. **Verify**: All goals have employee_rating values (1-5)

### Test 3: Verify CEO Can See Ratings
1. Log in as CEO
2. Navigate to PDR review
3. Open browser console
4. Go to Final Review tab
5. **Verify**: Console shows goal data with employee_rating values
6. **Verify**: UI displays correct ratings (not 0)

### Test 4: Verify Refresh Works
1. Employee submits while CEO has page open
2. CEO switches to different tab then back to Final Review
3. **Verify**: Latest data loads
4. **Verify**: Employee ratings now visible

## Implementation Order

1. **Fix 3 (Logging)** - Add debugging logs first to diagnose issue ← START HERE
2. **Test 2 (Database)** - Check if data is actually in database
3. **Fix 1 (Error Handling)** - If data not saving, improve error handling
4. **Fix 2 (Refresh)** - If data saved but not showing, add refresh
5. **Fix 4 (Visual)** - Polish the display

## Expected Outcomes

After fixes:
- ✅ Employee ratings save reliably to database
- ✅ Any save failures are visible to employee with error message
- ✅ CEO sees latest data when viewing Final Review
- ✅ Console logs help diagnose any future issues
- ✅ UI clearly shows "Not rated" vs "Rated 0" vs "Rated 1-5"

## Files to Modify

1. **`src/app/(employee)/pdr/[id]/end-year/page.tsx`**
   - Enhance error handling for goal rating saves
   - Add user feedback for failures

2. **`src/app/(ceo)/admin/reviews/[id]/page.tsx`**
   - Add data refresh when Final Review tab activated
   - Add debugging console logs for rating display
   - Improve visual distinction for missing vs zero ratings

## Success Criteria

- Employee can submit ratings and see confirmation
- Ratings persist in database
- CEO sees employee ratings in Final Review (not 0/5)
- System provides clear feedback when things go wrong

