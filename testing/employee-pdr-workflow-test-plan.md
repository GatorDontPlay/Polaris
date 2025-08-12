# Employee PDR Workflow Testing Plan

## Overview
This document outlines comprehensive testing for the 5-step Employee Performance Development Review (PDR) workflow.

## Workflow Steps
1. **Goals** - Set performance objectives
2. **Behaviors** - Assess company values alignment  
3. **Review** - Review and submit for approval
4. **Mid-Year** - Mid-year check-in assessment
5. **End-Year** - Final evaluation and rating

## Test Scenarios

### Prerequisites
- Development server running (`npm run dev`)
- Database connection established
- Test user accounts available (Employee and CEO roles)
- Company values and PDR periods seeded

### Test Case 1: Complete Employee Journey (Happy Path)

#### Step 1: Goals Creation
**URL**: `/pdr/{id}/goals`
**Expected Behavior**:
- [ ] Employee can add new goals
- [ ] Goals form validation works (title required)
- [ ] Optional fields (description, target outcome, success criteria) work
- [ ] Priority dropdown functions (HIGH, MEDIUM, LOW)
- [ ] Goals save successfully
- [ ] Employee can edit existing goals
- [ ] Employee can delete goals (if editable)
- [ ] Progress to next step enabled after adding goals
- [ ] Stepper indicator shows step 1 as active

**Test Data**:
```
Goal 1: Improve customer satisfaction ratings
Priority: HIGH
Description: Focus on response time and solution quality

Goal 2: Complete professional development training
Priority: MEDIUM
Target Outcome: Obtain certification in new technology stack
```

#### Step 2: Behaviors Assessment
**URL**: `/pdr/{id}/behaviors`
**Expected Behavior**:
- [ ] Company values displayed correctly
- [ ] Employee can add behaviors for each value
- [ ] Behavior form validation works (description required)
- [ ] Examples field is optional
- [ ] Self-assessment rating works (1-5 stars)
- [ ] Self-assessment text area functions
- [ ] Behaviors save successfully
- [ ] Can edit existing behaviors
- [ ] Can delete behaviors (if editable)
- [ ] Stepper indicator shows step 2 as active

**Test Data**:
```
Value: Innovation
Description: Led implementation of new automation tool
Examples: Reduced manual work by 40%, improved team efficiency
Self-Rating: 4/5
Self-Assessment: Successfully identified and implemented process improvements
```

#### Step 3: Review & Submit
**URL**: `/pdr/{id}/review`
**Expected Behavior**:
- [ ] Summary displays all goals correctly
- [ ] Summary displays all behaviors correctly
- [ ] Statistics calculated properly (completion rates, averages)
- [ ] Submit button enabled only when complete
- [ ] Submit confirmation dialog appears
- [ ] PDR status changes to "SUBMITTED" after submit
- [ ] Employee cannot edit after submission
- [ ] Stepper indicator shows step 3 as active

#### Step 4: Mid-Year Check-in
**URL**: `/pdr/{id}/mid-year`
**Expected Behavior**:
- [ ] Form loads correctly
- [ ] Progress summary field required
- [ ] Optional fields work (blockers, support needed, comments)
- [ ] Form validation functions
- [ ] Save draft functionality works
- [ ] Submit advances to next step
- [ ] Previous step navigation works
- [ ] Stepper indicator shows step 4 as active

**Test Data**:
```
Progress Summary: Achieved 70% of Q2 goals, on track for year-end targets
Blockers: Limited access to training resources
Support Needed: Additional budget for certification courses
Employee Comments: Strong progress on customer satisfaction initiative
```

#### Step 5: End-Year Review
**URL**: `/pdr/{id}/end-year`
**Expected Behavior**:
- [ ] Form loads correctly
- [ ] Achievements summary field required
- [ ] Optional fields function (learnings, challenges, next year goals)
- [ ] Employee overall rating works (1-5 stars with labels)
- [ ] Form validation works
- [ ] Save draft functionality
- [ ] Submit completes the PDR
- [ ] PDR status changes to "COMPLETED"
- [ ] Stepper indicator shows step 5 as active

**Test Data**:
```
Achievements Summary: Exceeded customer satisfaction targets by 15%, completed certification
Learnings & Growth: Developed expertise in new technology stack, improved leadership skills
Challenges Faced: Initial learning curve with new tools, resource constraints
Next Year Goals: Lead larger projects, mentor junior team members
Overall Rating: 4/5 (Very Good)
```

### Test Case 2: Navigation & State Management

#### Navigation Tests
- [ ] Stepper allows navigation to completed steps
- [ ] Stepper prevents navigation to future steps
- [ ] Direct URL access respects permissions
- [ ] Back/Next buttons work correctly
- [ ] Browser back/forward buttons work
- [ ] Refreshing page maintains state

#### State Persistence
- [ ] Form data persists across navigation
- [ ] Unsaved changes warning (if implemented)
- [ ] Data loads correctly after page refresh
- [ ] Draft saves work properly

### Test Case 3: Permission & Access Control

#### Employee Access
- [ ] Employee can only access own PDRs
- [ ] Employee cannot access other employee PDRs
- [ ] Employee cannot edit locked PDRs
- [ ] Employee cannot edit after submission (where applicable)

#### CEO Access
- [ ] CEO can view all employee PDRs
- [ ] CEO can add comments/ratings at appropriate steps
- [ ] CEO can lock/unlock PDRs

### Test Case 4: Error Handling & Edge Cases

#### Form Validation
- [ ] Required field validation displays properly
- [ ] Field length limits enforced
- [ ] Invalid data rejected gracefully
- [ ] Error messages are user-friendly

#### Network/Server Errors
- [ ] Loading states display during API calls
- [ ] Error states handle failed requests
- [ ] Retry mechanisms work
- [ ] Offline behavior (if applicable)

#### Edge Cases
- [ ] Empty states display correctly
- [ ] Very long text handles properly
- [ ] Special characters in input fields
- [ ] Rapid clicking doesn't cause issues

### Test Case 5: UI/UX Testing

#### Visual Design
- [ ] Modern shadcn/ui components render correctly
- [ ] Responsive design works on mobile/tablet
- [ ] Loading skeletons display during data fetching
- [ ] Icons and badges display properly
- [ ] Color coding works (status badges, priority indicators)

#### User Experience
- [ ] Form flows feel intuitive
- [ ] Progress indication is clear
- [ ] Success feedback is provided
- [ ] Help text/tooltips are useful
- [ ] Keyboard navigation works

### Test Case 6: Performance Testing

#### Load Times
- [ ] Initial page load < 3 seconds
- [ ] Navigation between steps < 1 second
- [ ] Form submissions < 2 seconds
- [ ] Large datasets handle properly

#### Memory/Resource Usage
- [ ] No memory leaks during extended use
- [ ] Efficient re-rendering
- [ ] Proper cleanup on unmount

## Manual Testing Checklist

### Before Testing
- [ ] Start development server
- [ ] Verify database connection
- [ ] Create test employee account
- [ ] Create test CEO account
- [ ] Ensure company values exist
- [ ] Ensure active PDR period exists

### During Testing
- [ ] Test in Chrome, Firefox, Safari
- [ ] Test on desktop and mobile viewports
- [ ] Test with different user roles
- [ ] Test with various data combinations
- [ ] Document any bugs or issues

### After Testing
- [ ] Verify all test cases pass
- [ ] Document performance observations
- [ ] Record any improvement suggestions
- [ ] Update test plan based on findings

## Automation Considerations

Future automated tests should cover:
- API endpoint testing
- Component unit tests
- Integration tests for full workflow
- E2E tests with Playwright/Cypress
- Performance benchmarking

## Success Criteria

The employee PDR workflow test is successful when:
1. All 5 steps function correctly
2. Data persists appropriately
3. Navigation works as expected
4. Permissions are enforced
5. UI/UX meets design requirements
6. Performance is acceptable
7. Error handling is robust

## Notes
- This test plan should be executed on each major release
- Update test cases when new features are added
- Consider user feedback for UX improvements
- Maintain test data integrity between test runs
