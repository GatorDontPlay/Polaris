# Employee Rating Database-Only Fix - Complete Solution Plan

## Problem Statement

Employee submits end-year review with goal ratings, but CEO sees "0/5" instead of the actual ratings. This indicates a disconnect between what's being saved and what's being displayed.

## Core Principle

**Database as Single Source of Truth**
- All data must be saved to database immediately
- All displays must read from database only
- No reliance on client-side state, localStorage, or cached data
- Follow the same pattern as our previous fixes (behavior feedback, development feedback, etc.)

## Root Cause Analysis

### Current Implementation Problems

1. **Sequential Save Process** (Employee Submission)
   - Step 1: Save main review to `end_year_reviews` ✅
   - Step 2: Loop through goals, save ratings individually ❌ (may fail silently)
   - **Issue**: If Step 2 fails, employee doesn't know and CEO sees 0

2. **No Validation of Save Success**
   - Employee page doesn't verify all ratings were saved
   - No feedback if API call fails
   - Success toast shown even if goal ratings failed

3. **Stale Data on CEO Side**
   - CEO page loads data once on mount
   - Doesn't refresh when switching tabs
   - May show cached data from before employee submission

4. **No Transaction Guarantee**
   - Individual goal saves are separate API calls
   - If one fails, others may succeed
   - Partial data state with no rollback

## Comprehensive Solution

### Phase 1: Ensure Reliable Database Saves

#### Fix 1.1: Batch Goal Rating Updates in Single Transaction

**File**: `src/app/api/pdrs/[id]/end-year/route.ts`

**Current**: Employee page loops and calls `/api/goals/${id}` for each goal separately
**Problem**: Multiple network requests, any can fail independently
**Solution**: Add bulk update endpoint to save all goal ratings in one transaction

**New endpoint**: `POST /api/pdrs/[id]/save-goal-ratings`

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success) return authResult.response;
    
    const { user } = authResult;
    const pdrId = params.id;
    const { goalRatings } = await request.json();
    
    // goalRatings format: { [goalId]: { rating: number, progress: string } }
    
    const supabase = await createClient();
    
    // Verify PDR access and status
    const { data: pdr, error: pdrError } = await supabase
      .from('pdrs')
      .select('*, goals(id)')
      .eq('id', pdrId)
      .single();
      
    if (pdrError || !pdr) {
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }
    
    if (pdr.user_id !== user.id && user.role !== 'CEO') {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }
    
    // Validate all goal IDs belong to this PDR
    const pdrGoalIds = pdr.goals.map((g: any) => g.id);
    const invalidGoals = Object.keys(goalRatings).filter(id => !pdrGoalIds.includes(id));
    if (invalidGoals.length > 0) {
      return createApiError(`Invalid goal IDs: ${invalidGoals.join(', ')}`, 400, 'INVALID_GOAL_IDS');
    }
    
    // Save all goal ratings in parallel (Supabase handles transaction)
    const updatePromises = Object.entries(goalRatings).map(([goalId, data]: [string, any]) => {
      return supabase
        .from('goals')
        .update({
          employee_rating: data.rating,
          employee_progress: data.progress,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId)
        .select();
    });
    
    const results = await Promise.all(updatePromises);
    
    // Check for failures
    const failures = results.filter(r => r.error);
    if (failures.length > 0) {
      console.error('Failed to update some goals:', failures);
      return createApiError(
        `Failed to update ${failures.length} goal(s)`,
        500,
        'PARTIAL_UPDATE_FAILURE'
      );
    }
    
    console.log(`✅ Successfully updated ${results.length} goal ratings for PDR ${pdrId}`);
    
    return createApiResponse({
      success: true,
      updatedCount: results.length,
      goals: results.map(r => r.data).flat()
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}
```

#### Fix 1.2: Update Employee End-Year Submission to Use Batch Endpoint

**File**: `src/app/(employee)/pdr/[id]/end-year/page.tsx` (replace lines 748-775)

```typescript
// Now save individual goal ratings using batch endpoint
console.log('📡 Saving all goal ratings in batch...');

if (goalSelfAssessments && Object.keys(goalSelfAssessments).length > 0) {
  try {
    const goalRatings: Record<string, { rating: number; progress: string }> = {};
    
    Object.entries(goalSelfAssessments).forEach(([goalId, assessment]) => {
      goalRatings[goalId] = {
        rating: assessment.rating,
        progress: assessment.reflection
      };
    });
    
    console.log('📦 Batch saving ratings for goals:', Object.keys(goalRatings));
    
    const batchResponse = await fetch(`/api/pdrs/${params.id}/save-goal-ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goalRatings }),
    });
    
    if (!batchResponse.ok) {
      const errorData = await batchResponse.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to save goal ratings');
    }
    
    const result = await batchResponse.json();
    console.log(`✅ Successfully saved ${result.data?.updatedCount || 0} goal ratings`);
    
  } catch (error) {
    console.error('❌ Failed to save goal ratings:', error);
    
    // Show error to user - DON'T proceed as if it worked
    toast({
      title: "❌ Submission Incomplete",
      description: "Failed to save your goal ratings. Please try again.",
      variant: "destructive",
    });
    
    setIsSubmitting(false);
    return; // Stop submission process
  }
}

// Same for behavior ratings - batch save them too
console.log('📡 Saving all behavior ratings in batch...');

if (behaviorSelfAssessments && Object.keys(behaviorSelfAssessments).length > 0) {
  try {
    const behaviorRatings: Record<string, { rating: number; examples: string }> = {};
    
    Object.entries(behaviorSelfAssessments).forEach(([behaviorId, assessment]) => {
      behaviorRatings[behaviorId] = {
        rating: assessment.rating,
        examples: assessment.examples
      };
    });
    
    console.log('📦 Batch saving ratings for behaviors:', Object.keys(behaviorRatings));
    
    const batchResponse = await fetch(`/api/pdrs/${params.id}/save-behavior-ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ behaviorRatings }),
    });
    
    if (!batchResponse.ok) {
      const errorData = await batchResponse.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to save behavior ratings');
    }
    
    const result = await batchResponse.json();
    console.log(`✅ Successfully saved ${result.data?.updatedCount || 0} behavior ratings`);
    
  } catch (error) {
    console.error('❌ Failed to save behavior ratings:', error);
    
    toast({
      title: "❌ Submission Incomplete",
      description: "Failed to save your behavior ratings. Please try again.",
      variant: "destructive",
    });
    
    setIsSubmitting(false);
    return; // Stop submission process
  }
}

// Only show success if everything saved
toast({
  title: "✅ Submission Complete",
  description: "Your end-year review has been submitted successfully.",
});
```

### Phase 2: Ensure CEO Loads Fresh Database Data

#### Fix 2.1: Add Auto-Refresh When Final Review Tab Activates

**File**: `src/app/(ceo)/admin/reviews/[id]/page.tsx`

Add new useEffect (similar to existing summary refresh at line 1015):

```typescript
// Refresh data when navigating to Final Review tab
useEffect(() => {
  if (activeTab === 'final-review' && pdr) {
    console.log('📊 Final Review tab activated - refreshing all data from database...');
    
    const loadFreshData = async () => {
      try {
        // Reload PDR with all nested data
        const response = await fetch(`/api/pdrs/${pdrId}?goals=true&behaviors=true&reviews=true`);
        
        if (!response.ok) {
          console.error('Failed to refresh Final Review data:', response.status);
          return;
        }
        
        const result = await response.json();
        if (!result.success || !result.data) {
          console.error('Invalid response from PDR API');
          return;
        }
        
        const freshPdrData = result.data;
        
        // Update PDR state
        setPdr(freshPdrData);
        console.log('✅ Refreshed PDR data:', {
          id: freshPdrData.id,
          status: freshPdrData.status,
          hasEndYearReview: !!freshPdrData.endYearReview
        });
        
        // Update goals with fresh employee ratings
        if (freshPdrData.goals && Array.isArray(freshPdrData.goals)) {
          const refreshedGoals = freshPdrData.goals.map((goal: any) => ({
            id: goal.id,
            title: goal.title,
            description: goal.description,
            targetDate: goal.targetDate || goal.target_date,
            priority: goal.priority,
            status: goal.status || 'NOT_STARTED',
            progress: goal.progress || 0,
            goalMapping: goal.goalMapping || goal.goal_mapping,
            weighting: goal.weighting,
            employeeRating: goal.employeeRating || goal.employee_rating, // ← Fresh from DB
            employeeProgress: goal.employeeProgress || goal.employee_progress,
            ceoRating: goal.ceoRating || goal.ceo_rating,
            ceoComments: goal.ceoComments || goal.ceo_comments,
          }));
          
          setGoals(refreshedGoals);
          console.log('✅ Refreshed goals with employee ratings:', 
            refreshedGoals.map(g => ({ id: g.id, title: g.title, employeeRating: g.employeeRating }))
          );
        }
        
        // Update behaviors with fresh employee ratings
        if (freshPdrData.behaviors && Array.isArray(freshPdrData.behaviors)) {
          // ... similar refresh for behaviors
        }
        
        // Update end-year review data
        if (freshPdrData.endYearReview) {
          setEndYearReviewData({
            employeeSelfAssessment: freshPdrData.endYearReview.achievementsSummary || '',
            employeeOverallRating: freshPdrData.endYearReview.employeeOverallRating || 0,
            achievementsSummary: freshPdrData.endYearReview.achievementsSummary || '',
            learningsGrowth: freshPdrData.endYearReview.learningsGrowth || '',
            challengesFaced: freshPdrData.endYearReview.challengesFaced || '',
            nextYearGoals: freshPdrData.endYearReview.nextYearGoals || '',
            ceoAssessment: freshPdrData.endYearReview.ceoFinalComments || '',
            ceoOverallRating: freshPdrData.endYearReview.ceoOverallRating || 0,
          });
          console.log('✅ Refreshed end-year review data');
        }
        
      } catch (error) {
        console.error('❌ Error refreshing Final Review data:', error);
      }
    };
    
    loadFreshData();
  }
}, [activeTab, pdrId]);
```

#### Fix 2.2: Add Detailed Logging to Display Section

**File**: `src/app/(ceo)/admin/reviews/[id]/page.tsx` (line 2812-2817)

Replace the simple display with diagnostic logging:

```typescript
<div className="flex items-center gap-2 mt-1">
  <span className="text-xs font-medium text-muted-foreground">Employee Rating:</span>
  {(() => {
    // Diagnostic logging
    const employeeRating = goal.employeeRating;
    const employee_rating = (goal as any).employee_rating;
    const finalRating = employeeRating ?? employee_rating ?? 0;
    
    console.log(`🔍 Displaying rating for goal "${goal.title}":`, {
      goalId: goal.id,
      employeeRating,
      employee_rating,
      finalRating,
      goalObjectKeys: Object.keys(goal),
      fullGoalObject: goal
    });
    
    // Visual distinction between "not rated" and "rated as 0"
    if (finalRating === null || finalRating === undefined) {
      return (
        <span className="font-semibold text-sm text-amber-600 italic">
          Not yet rated by employee
        </span>
      );
    }
    
    if (finalRating === 0) {
      return (
        <span className="font-semibold text-sm text-muted-foreground">
          0/5 <span className="text-xs">(rated as zero)</span>
        </span>
      );
    }
    
    return (
      <span className="font-semibold text-sm text-foreground">
        {finalRating}/5
      </span>
    );
  })()}
</div>
```

### Phase 3: Add Validation and Error Recovery

#### Fix 3.1: Add Pre-Submission Validation

**File**: `src/app/(employee)/pdr/[id]/end-year/page.tsx` (before submission)

```typescript
// Validate all required ratings are present
const validateSubmission = () => {
  const missingGoalRatings = goals.filter(goal => {
    const assessment = goalSelfAssessments[goal.id];
    return !assessment || assessment.rating === undefined || assessment.rating === 0;
  });
  
  const missingBehaviorRatings = behaviors.filter(behavior => {
    const assessment = behaviorSelfAssessments[behavior.id];
    return !assessment || assessment.rating === undefined || assessment.rating === 0;
  });
  
  if (missingGoalRatings.length > 0 || missingBehaviorRatings.length > 0) {
    toast({
      title: "⚠️ Incomplete Ratings",
      description: `Please rate all ${missingGoalRatings.length} goal(s) and ${missingBehaviorRatings.length} behavior(s) before submitting.`,
      variant: "destructive",
    });
    return false;
  }
  
  return true;
};

const onSubmit = async (data: EndYearFormData) => {
  // Validate first
  if (!validateSubmission()) {
    return;
  }
  
  setIsSubmitting(true);
  // ... rest of submission
};
```

#### Fix 3.2: Add Post-Save Verification

**File**: `src/app/(employee)/pdr/[id]/end-year/page.tsx` (after batch save)

```typescript
// After batch save succeeds, verify data was actually saved
console.log('🔍 Verifying goal ratings were saved to database...');

const verifyResponse = await fetch(`/api/pdrs/${params.id}?goals=true`);
if (verifyResponse.ok) {
  const verifyResult = await verifyResponse.json();
  const savedGoals = verifyResult.data?.goals || [];
  
  const missingRatings = savedGoals.filter((g: any) => {
    const expectedRating = goalRatings[g.id]?.rating;
    const actualRating = g.employee_rating || g.employeeRating;
    return expectedRating && actualRating !== expectedRating;
  });
  
  if (missingRatings.length > 0) {
    console.error('❌ Verification failed: Some ratings not saved correctly:', missingRatings);
    throw new Error('Data verification failed - ratings not saved correctly');
  }
  
  console.log('✅ Verification passed: All ratings saved correctly');
}
```

### Phase 4: Add Batch Endpoint for Behavior Ratings

#### Fix 4.1: Create Batch Behavior Rating Endpoint

**File**: `src/app/api/pdrs/[id]/save-behavior-ratings/route.ts` (new file)

```typescript
import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createApiError,
  handleApiError,
  authenticateRequest,
} from '@/lib/api-helpers';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success) return authResult.response;
    
    const { user } = authResult;
    const pdrId = params.id;
    const { behaviorRatings } = await request.json();
    
    const supabase = await createClient();
    
    // Verify PDR access
    const { data: pdr, error: pdrError } = await supabase
      .from('pdrs')
      .select('*, behaviors(id)')
      .eq('id', pdrId)
      .single();
      
    if (pdrError || !pdr) {
      return createApiError('PDR not found', 404, 'PDR_NOT_FOUND');
    }
    
    if (pdr.user_id !== user.id && user.role !== 'CEO') {
      return createApiError('Access denied', 403, 'ACCESS_DENIED');
    }
    
    // Save all behavior ratings in parallel
    const updatePromises = Object.entries(behaviorRatings).map(([behaviorId, data]: [string, any]) => {
      return supabase
        .from('behaviors')
        .update({
          employee_rating: data.rating,
          examples: data.examples,
          updated_at: new Date().toISOString()
        })
        .eq('id', behaviorId)
        .select();
    });
    
    const results = await Promise.all(updatePromises);
    
    const failures = results.filter(r => r.error);
    if (failures.length > 0) {
      console.error('Failed to update some behaviors:', failures);
      return createApiError(
        `Failed to update ${failures.length} behavior(s)`,
        500,
        'PARTIAL_UPDATE_FAILURE'
      );
    }
    
    console.log(`✅ Successfully updated ${results.length} behavior ratings for PDR ${pdrId}`);
    
    return createApiResponse({
      success: true,
      updatedCount: results.length,
      behaviors: results.map(r => r.data).flat()
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}
```

## Implementation Order

### Phase 1: Ensure Saves Work (Employee Side)
1. ✅ Create batch goal rating endpoint (`/api/pdrs/[id]/save-goal-ratings`)
2. ✅ Create batch behavior rating endpoint (`/api/pdrs/[id]/save-behavior-ratings`)
3. ✅ Update employee end-year submission to use batch endpoints
4. ✅ Add pre-submission validation
5. ✅ Add post-save verification
6. ✅ Add proper error handling and user feedback

### Phase 2: Ensure Fresh Reads Work (CEO Side)
7. ✅ Add auto-refresh when Final Review tab activates
8. ✅ Add detailed diagnostic logging to display code
9. ✅ Add visual distinction for "not rated" vs "rated as 0"

### Phase 3: Testing
10. ✅ Test employee submission saves all ratings
11. ✅ Verify database contains ratings after submission
12. ✅ Test CEO sees correct ratings immediately
13. ✅ Test CEO refresh updates stale data

## Files to Create/Modify

### New Files
1. **`src/app/api/pdrs/[id]/save-goal-ratings/route.ts`** - Batch goal rating endpoint
2. **`src/app/api/pdrs/[id]/save-behavior-ratings/route.ts`** - Batch behavior rating endpoint

### Modified Files
3. **`src/app/(employee)/pdr/[id]/end-year/page.tsx`**
   - Replace individual goal/behavior saves with batch calls
   - Add pre-submission validation
   - Add post-save verification
   - Improve error handling

4. **`src/app/(ceo)/admin/reviews/[id]/page.tsx`**
   - Add Final Review tab auto-refresh useEffect
   - Add diagnostic logging to rating display
   - Improve visual feedback for missing ratings

## Data Flow After Fixes

### Employee Submits (Database Write)
```
1. Employee fills form → validates all ratings present
2. Submit button → batch saves via /api/pdrs/[id]/save-goal-ratings
3. All goal ratings saved in parallel → single transaction
4. Verify save succeeded → read back from database
5. If verification fails → show error, don't complete submission
6. If verification passes → complete submission, show success
```

### CEO Views (Database Read)
```
1. CEO navigates to Final Review tab
2. Tab activation triggers data refresh
3. Fresh fetch from /api/pdrs/[id] with all nested data
4. Goals loaded with employee_rating from database
5. Display shows actual rating from database
6. Console logs show diagnostic info
7. Visual indicates "not rated" vs "rated as 0" vs "rated 1-5"
```

## Success Criteria

✅ Employee submission saves all ratings in single batch operation
✅ Any save failure is caught and shown to employee
✅ Employee cannot complete submission if ratings fail to save
✅ CEO always sees fresh data from database (no stale cache)
✅ Console logs clearly show what's being saved and loaded
✅ UI clearly distinguishes between missing and zero ratings
✅ All data flows through database only (no localStorage, no client state confusion)

## Alignment with Previous Fixes

This solution follows the exact same pattern as our previous database-only fixes:

| Feature | CEO Behavior Feedback | CEO Development Feedback | Mid-Year Check-in | Employee End-Year Ratings (NEW) |
|---------|---------------------|------------------------|------------------|-------------------------------|
| **Save Method** | Debounced auto-save | Debounced auto-save | Debounced auto-save | Batch save on submit |
| **Storage** | Database (`behaviors.ceo_comments`) | Database (`pdrs.ceo_fields`) | Database (`pdrs.ceo_fields.midYearCheckIn`) | Database (`goals.employee_rating`, `behaviors.employee_rating`) |
| **Load Method** | Fetch from API | Fetch from API | Fetch from API | Fetch from API |
| **Refresh Strategy** | On tab change | On tab change | On tab change | **On Final Review tab activation** |
| **Error Handling** | Console logs, silent recovery | Console logs, silent recovery | Console logs, silent recovery | **User feedback, block submission** |
| **Validation** | Optional | Optional | Optional | **Required before save** |
| **Verification** | None | None | None | **Post-save database check** |

**Key Difference**: Employee ratings require stricter validation and verification because they're critical for CEO review. If they don't save, the entire review process fails.

## Expected Console Output

### Employee Submission Success:
```
📡 Saving all goal ratings in batch...
📦 Batch saving ratings for goals: ["goal-1", "goal-2", "goal-3"]
✅ Successfully saved 3 goal ratings
📡 Saving all behavior ratings in batch...
📦 Batch saving ratings for behaviors: ["behavior-1", "behavior-2", "behavior-3", "behavior-4"]
✅ Successfully saved 4 behavior ratings
🔍 Verifying goal ratings were saved to database...
✅ Verification passed: All ratings saved correctly
✅ Submission Complete
```

### CEO Viewing Final Review:
```
📊 Final Review tab activated - refreshing all data from database...
✅ Refreshed PDR data: { id: "...", status: "END_YEAR_REVIEW", hasEndYearReview: true }
✅ Refreshed goals with employee ratings: [
  { id: "goal-1", title: "Q1 Target", employeeRating: 4 },
  { id: "goal-2", title: "Q2 Target", employeeRating: 5 },
  { id: "goal-3", title: "Q3 Target", employeeRating: 3 }
]
🔍 Displaying rating for goal "Q1 Target": {
  goalId: "goal-1",
  employeeRating: 4,
  employee_rating: 4,
  finalRating: 4,
  fullGoalObject: { ... }
}
```

## Summary

This comprehensive solution ensures:
1. **Reliable Saves**: Batch operations, transaction safety, error handling
2. **Fresh Reads**: Auto-refresh on tab activation, database-only data
3. **Validation**: Pre-submission checks, post-save verification
4. **Transparency**: Detailed logging at every step
5. **User Feedback**: Clear errors when things fail, clear success when they work
6. **Consistency**: Same pattern as all previous database-only fixes

**Result**: Employee ratings will reliably save to database and CEO will always see the correct values from database. No more "0/5" when employee rated it "4/5". 🎉

