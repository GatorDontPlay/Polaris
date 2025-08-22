# CEO Salary Review Tab Testing Plan

## Overview
This document outlines the testing plan for the new "Salary Review" tab added to the CEO PDR review page. The tab allows CEOs to set salary adjustments based on performance reviews, visualize salary bands, book meetings, and send notifications.

## Prerequisites
- Access to the application with CEO role permissions
- At least one PDR in the "CALIBRATION" status
- Browser with developer tools for debugging

## Test Cases

### 1. Tab Visibility and Navigation
- **Test 1.1**: Verify the "Salary Review" tab is visible in the CEO review page
  - Navigate to `/admin/reviews/[id]` for a PDR
  - Confirm "Salary Review" tab is visible in the tab list
  - Click on the tab and verify it loads correctly

- **Test 1.2**: Verify tab navigation from "Final Review" to "Salary Review"
  - Complete the "Final Review" tab actions
  - Click "Complete Final Review" button
  - Verify navigation to Salary Calibration page in a new tab

### 2. CPI Slider Functionality
- **Test 2.1**: Verify CPI slider initial value
  - Open the "Salary Review" tab
  - Confirm slider is set to default value (2.5%)

- **Test 2.2**: Test slider manual adjustment
  - Drag the slider to different positions
  - Verify the percentage value updates correctly
  - Confirm it allows values between 0-10% in 0.01 increments

- **Test 2.3**: Test increment/decrement buttons
  - Click the "+" button and verify CPI increases by 0.25%
  - Click the "-" button and verify CPI decreases by 0.25%
  - Verify min/max boundaries (0% and 10%) are respected

### 3. Salary Calculations
- **Test 3.1**: Verify initial salary values
  - Open the "Salary Review" tab
  - Confirm current salary, super, and total package are displayed correctly

- **Test 3.2**: Test calculation accuracy
  - Set CPI to 5%
  - Verify new salary = current salary * 1.05
  - Verify new super = new salary * 0.11
  - Verify total package = new salary + new super
  - Verify annual increase = new salary - current salary

- **Test 3.3**: Test calculations with different CPI values
  - Try minimum (0%) and maximum (10%) values
  - Try a decimal value (e.g., 3.75%)
  - Verify all calculations update correctly

### 4. Salary Band Visualization
- **Test 4.1**: Verify salary band display
  - Confirm salary band visualization shows min, target, and max values
  - Verify position indicator shows correctly based on new salary
  - Confirm salary band label (e.g., "Mid-range") is accurate

- **Test 4.2**: Test band position updates
  - Adjust CPI to change salary
  - Verify band position indicator moves accordingly
  - Verify band label updates if crossing a threshold

### 5. Meeting & Notifications
- **Test 5.1**: Test "Book Meeting via Gmail" button
  - Click the button
  - Verify it opens Gmail calendar in a new tab or window
  - Verify employee information is pre-filled

- **Test 5.2**: Test "Send Email via Gmail" button
  - Click the button
  - Verify it opens Gmail compose in a new tab or window
  - Verify employee email and subject are pre-filled

### 6. Final Actions
- **Test 6.1**: Test confirmation checkboxes
  - Click each checkbox
  - Verify they toggle correctly

- **Test 6.2**: Test "Complete & Close PDR" button
  - Check both confirmation checkboxes
  - Click "Complete & Close PDR" button
  - Verify PDR status changes to "COMPLETED"
  - Verify user is redirected to the admin dashboard

### 7. Error Handling
- **Test 7.1**: Test form validation
  - Try to complete without checking confirmation checkboxes
  - Verify appropriate error message is shown

- **Test 7.2**: Test with invalid inputs
  - Manually attempt to set CPI outside allowed range
  - Verify system prevents or corrects invalid inputs

### 8. Accessibility
- **Test 8.1**: Keyboard navigation
  - Navigate through all elements using Tab key
  - Verify all interactive elements are reachable and operable

- **Test 8.2**: Screen reader compatibility
  - Test with a screen reader to ensure all elements are properly labeled
  - Verify slider announces current value when changed

## Bug Reporting
For any issues found during testing, please include:
1. Test case ID and description
2. Steps to reproduce
3. Expected vs. actual result
4. Browser and device information
5. Screenshots or video if applicable

## Sign-off Criteria
- All critical and high-priority test cases pass
- No blocking issues in core functionality
- UI renders correctly on supported browsers and devices
- All calculations produce accurate results
