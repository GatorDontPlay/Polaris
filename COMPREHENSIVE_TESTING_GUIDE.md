# 🧪 **COMPREHENSIVE TESTING GUIDE - PDR SYSTEM**

## 🎯 **TESTING OVERVIEW**

This guide provides step-by-step testing procedures to verify every feature and button in your PDR system works correctly after database migration.

---

## 📋 **PRE-TESTING CHECKLIST**

Before starting manual testing, ensure:
- [ ] ✅ Database schema deployed successfully
- [ ] ✅ Environment variables configured correctly  
- [ ] ✅ `npm run dev` running without errors
- [ ] ✅ API tests passed (`node test-api-endpoints.js`)
- [ ] ✅ User flow tests passed (`node test-user-flows.js`)

---

## 🔐 **PHASE 1: AUTHENTICATION TESTING**

### **Test 1.1: User Registration**
**Steps:**
1. Navigate to http://localhost:3000
2. Should redirect to `/login`
3. Click "Sign Up" tab
4. Fill registration form:
   - Email: `employee1@test.com`
   - Password: `testpass123`
   - First Name: `Test`
   - Last Name: `Employee`
   - Role: `EMPLOYEE`
5. Click "Create Account"

**Expected Results:**
- [ ] ✅ Form submits without errors
- [ ] ✅ Success message appears
- [ ] ✅ Redirected to login tab
- [ ] ✅ Profile created in Supabase `profiles` table

### **Test 1.2: User Login (Employee)**
**Steps:**
1. On login tab, enter:
   - Email: `employee1@test.com`
   - Password: `testpass123`
2. Click "Sign In"

**Expected Results:**
- [ ] ✅ Login successful message appears
- [ ] ✅ Redirected to `/dashboard` (employee dashboard)
- [ ] ✅ User name displayed in header
- [ ] ✅ Navigation menu shows employee options

### **Test 1.3: CEO Registration & Login**
**Steps:**
1. Sign out (if logged in)
2. Register CEO user:
   - Email: `ceo@test.com`
   - Password: `testpass123`
   - First Name: `Test`
   - Last Name: `CEO`
   - Role: `CEO`
3. Login with CEO credentials

**Expected Results:**
- [ ] ✅ CEO registration successful
- [ ] ✅ Login redirects to `/admin` (CEO dashboard)
- [ ] ✅ Different navigation menu for CEO
- [ ] ✅ Can see admin-specific features

### **Test 1.4: Authentication Security**
**Steps:**
1. While logged in, manually navigate to:
   - Employee logged in → `/admin`
   - CEO logged in → `/dashboard`
2. Try accessing API endpoints without auth (new browser/incognito)

**Expected Results:**
- [ ] ✅ Role-based redirects work correctly
- [ ] ✅ Unauthorized API access returns 401
- [ ] ✅ Protected pages redirect to login

---

## 👤 **PHASE 2: EMPLOYEE DASHBOARD TESTING**

*Login as employee (`employee1@test.com`) for this phase*

### **Test 2.1: Dashboard Overview**
**Steps:**
1. Verify dashboard loads completely
2. Check all sections are visible
3. Look for any console errors

**Expected Results:**
- [ ] ✅ Dashboard loads without errors
- [ ] ✅ User profile information displayed
- [ ] ✅ PDR status/progress shown
- [ ] ✅ Navigation menu functional
- [ ] ✅ No JavaScript errors in console

### **Test 2.2: PDR Creation**
**Steps:**
1. Look for "Create New PDR" or similar button
2. Click to start PDR creation
3. Select financial year "FY 2024-2025"
4. Complete PDR creation process

**Expected Results:**
- [ ] ✅ PDR creation form appears
- [ ] ✅ Financial year selection works
- [ ] ✅ PDR created successfully
- [ ] ✅ Redirected to PDR details/editing
- [ ] ✅ PDR visible in dashboard

### **Test 2.3: Goals Management**
**Steps:**
1. Navigate to Goals section of created PDR
2. Click "Add Goal" or similar button
3. Fill goal form:
   - Title: "Complete Project Alpha"
   - Description: "Deliver project on time and within budget"
   - Target Outcome: "Project delivered by Q2"
   - Goal Mapping: "OPERATING_EFFICIENCY"
   - Weighting: 25
4. Save goal
5. Add 3 more goals with different weightings (total must = 100)
6. Try editing an existing goal
7. Test goal validation (e.g., weighting over 100)

**Expected Results:**
- [ ] ✅ Add goal form opens correctly
- [ ] ✅ All form fields work properly
- [ ] ✅ Goal mapping dropdown populated
- [ ] ✅ Weighting validation works
- [ ] ✅ Goals save successfully
- [ ] ✅ Goals display in list
- [ ] ✅ Edit functionality works
- [ ] ✅ Total weighting validation (must = 100)

### **Test 2.4: Behavior Entries**
**Steps:**
1. Navigate to Behaviors/Values section
2. For each company value:
   - Click "Add Example" or similar
   - Fill behavior entry form:
     - Description: "Demonstrated [value] by..."
     - Examples: "Specific example of behavior"
     - Self Assessment: "Personal reflection"
     - Rating: 1-5
3. Save behavior entries
4. Edit an existing behavior entry

**Expected Results:**
- [ ] ✅ All 6 company values displayed
- [ ] ✅ Can add behavior entries for each value
- [ ] ✅ Form fields work correctly
- [ ] ✅ Rating system (1-5) functional
- [ ] ✅ Entries save and display properly
- [ ] ✅ Edit functionality works

### **Test 2.5: PDR Submission**
**Steps:**
1. Complete all required sections (goals, behaviors)
2. Look for "Submit for Review" button
3. Submit PDR
4. Check PDR status changes

**Expected Results:**
- [ ] ✅ Submit button appears when ready
- [ ] ✅ Submission process completes
- [ ] ✅ PDR status updates (e.g., to "SUBMITTED")
- [ ] ✅ Employee can no longer edit
- [ ] ✅ Confirmation message shown

### **Test 2.6: Mid-Year Review** 
**Steps:**
1. Navigate to Mid-Year Review section
2. Fill out mid-year review form:
   - Progress Summary: "Good progress on all goals..."
   - Blockers/Challenges: "Minor resource constraints..."
   - Support Needed: "Additional training required..."
   - Employee Comments: "Overall satisfied with progress..."
3. Submit mid-year review

**Expected Results:**
- [ ] ✅ Mid-year review form accessible
- [ ] ✅ All form fields work
- [ ] ✅ Review saves successfully
- [ ] ✅ Status updates appropriately

---

## 👔 **PHASE 3: CEO DASHBOARD TESTING**

*Login as CEO (`ceo@test.com`) for this phase*

### **Test 3.1: Admin Dashboard Overview**
**Steps:**
1. Verify admin dashboard loads
2. Check statistics/metrics display
3. Verify employee PDR list shows

**Expected Results:**
- [ ] ✅ Admin dashboard loads completely
- [ ] ✅ Statistics show correct numbers
- [ ] ✅ Can see all employee PDRs
- [ ] ✅ Dashboard widgets functional

### **Test 3.2: Employee PDR Review**
**Steps:**
1. Click on employee's submitted PDR
2. Review employee goals:
   - Add CEO comments
   - Add CEO ratings (1-5)
   - Save changes
3. Review employee behavior entries:
   - Add CEO feedback
   - Add CEO ratings
   - Save changes

**Expected Results:**
- [ ] ✅ Can access employee PDR details
- [ ] ✅ CEO comment fields work
- [ ] ✅ CEO rating system functional
- [ ] ✅ Changes save successfully
- [ ] ✅ Employee data preserved

### **Test 3.3: PDR Status Management**
**Steps:**
1. Test changing PDR status:
   - Move from "SUBMITTED" to "UNDER_REVIEW"
   - Move to "PLAN_LOCKED"
   - Mark as "PDR_BOOKED"
2. Verify status transitions work correctly

**Expected Results:**
- [ ] ✅ Status change options appear
- [ ] ✅ Status updates successfully
- [ ] ✅ Only valid transitions allowed
- [ ] ✅ Employee sees status changes

### **Test 3.4: Employee Management**
**Steps:**
1. Navigate to employee management section
2. View employee list
3. Test any employee management features

**Expected Results:**
- [ ] ✅ Employee list displays
- [ ] ✅ Employee profiles accessible
- [ ] ✅ Management features work

### **Test 3.5: Analytics & Reporting**
**Steps:**
1. Check analytics/reports section
2. Verify data displays correctly
3. Test any filtering/sorting options

**Expected Results:**
- [ ] ✅ Analytics load without errors
- [ ] ✅ Data appears accurate
- [ ] ✅ Filtering/sorting works

---

## 🔄 **PHASE 4: WORKFLOW TESTING**

### **Test 4.1: Complete PDR Lifecycle**
**Steps:**
1. As Employee: Create PDR → Add Goals → Add Behaviors → Submit
2. As CEO: Review PDR → Add Comments/Ratings → Change Status
3. Test mid-year review process
4. Test end-year review process

**Expected Results:**
- [ ] ✅ Full lifecycle completes without errors
- [ ] ✅ Data persists throughout process
- [ ] ✅ Status transitions work correctly
- [ ] ✅ Both roles can complete their parts

### **Test 4.2: Data Persistence**
**Steps:**
1. Add data in various sections
2. Log out and log back in
3. Navigate away and return
4. Refresh browser

**Expected Results:**
- [ ] ✅ All data persists correctly
- [ ] ✅ No data loss on refresh
- [ ] ✅ Session management works

### **Test 4.3: Concurrent User Testing**
**Steps:**
1. Open two browser windows/tabs
2. Login as different users
3. Make changes simultaneously
4. Verify no conflicts occur

**Expected Results:**
- [ ] ✅ Multiple users can work simultaneously
- [ ] ✅ No data conflicts
- [ ] ✅ Changes sync properly

---

## 📱 **PHASE 5: UI/UX TESTING**

### **Test 5.1: Responsive Design**
**Steps:**
1. Test on different screen sizes:
   - Desktop (1920x1080)
   - Tablet (768x1024)
   - Mobile (375x667)
2. Check all features work on each size

**Expected Results:**
- [ ] ✅ Layout adapts to screen size
- [ ] ✅ All buttons/features accessible
- [ ] ✅ Text remains readable
- [ ] ✅ Navigation works on mobile

### **Test 5.2: Form Validation**
**Steps:**
1. Test form validation on all forms:
   - Leave required fields empty
   - Enter invalid data
   - Test field length limits
   - Test special characters

**Expected Results:**
- [ ] ✅ Required field validation works
- [ ] ✅ Data type validation works
- [ ] ✅ Error messages are clear
- [ ] ✅ Form prevents invalid submission

### **Test 5.3: Loading States**
**Steps:**
1. Check loading indicators appear during:
   - Page navigation
   - Form submission
   - Data loading

**Expected Results:**
- [ ] ✅ Loading indicators show appropriately
- [ ] ✅ No blank screens during loading
- [ ] ✅ Loading states are informative

---

## 🔍 **PHASE 6: ERROR HANDLING TESTING**

### **Test 6.1: Network Error Handling**
**Steps:**
1. Simulate network issues:
   - Disconnect internet briefly
   - Try to submit forms
   - Navigate between pages

**Expected Results:**
- [ ] ✅ Graceful error messages
- [ ] ✅ No application crashes
- [ ] ✅ Recovery when connection restored

### **Test 6.2: Invalid Data Handling**
**Steps:**
1. Try to break the system:
   - Enter extremely long text
   - Use special characters
   - Submit incomplete forms
   - Access invalid URLs

**Expected Results:**
- [ ] ✅ System handles invalid input gracefully
- [ ] ✅ Appropriate error messages shown
- [ ] ✅ No system crashes or errors

---

## 📊 **TESTING RESULTS SUMMARY**

### **Overall System Health**
- [ ] ✅ All core features functional
- [ ] ✅ Authentication system working
- [ ] ✅ Data persistence reliable
- [ ] ✅ User roles and permissions correct
- [ ] ✅ No critical bugs found

### **Performance Metrics**
- [ ] ✅ Page load times acceptable (<3 seconds)
- [ ] ✅ Form submissions responsive
- [ ] ✅ Database queries efficient
- [ ] ✅ No memory leaks detected

### **Security Verification**
- [ ] ✅ Role-based access control working
- [ ] ✅ Data isolation between users
- [ ] ✅ API endpoints properly secured
- [ ] ✅ No unauthorized access possible

---

## 🎯 **FINAL CHECKLIST**

Before declaring the system production-ready:

- [ ] ✅ All test phases completed successfully
- [ ] ✅ No critical or high-priority bugs found
- [ ] ✅ Performance meets requirements
- [ ] ✅ Security measures verified
- [ ] ✅ User experience is smooth and intuitive
- [ ] ✅ Data integrity maintained throughout testing
- [ ] ✅ System handles edge cases gracefully

---

## 🚀 **PRODUCTION READINESS SIGN-OFF**

**Testing Completed By:** ________________  
**Date:** ________________  
**Overall Result:** ✅ PASS / ❌ FAIL  
**Notes:** ________________________________

**System Status:** 🎉 **PRODUCTION READY** 🎉

---

*This comprehensive testing ensures your PDR system is robust, reliable, and ready for real-world usage!*
