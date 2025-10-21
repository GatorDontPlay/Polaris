# 🎯 **FINAL SETUP INSTRUCTIONS - PDR SYSTEM**

## 📋 **QUICK CHECKLIST**

**Before you start, ensure you have:**
- [ ] Your new Supabase project is active and accessible
- [ ] You have the Supabase credentials (URL, anon key, service role key)
- [ ] Node.js development server can run (`npm run dev`)
- [ ] You can access your Supabase dashboard

---

## 🚀 **STEP-BY-STEP SETUP**

### **Step 1: Deploy Database Schema** ⏱️ *5 minutes*

1. **Open Supabase SQL Editor**
   - Go to your Supabase Dashboard
   - Navigate to `SQL Editor`

2. **Run Complete Schema**
   - Copy the ENTIRE contents of `scripts/database/DEPLOY_TO_NEW_SUPABASE.sql`
   - Paste into SQL Editor
   - Click **RUN**
   - ✅ Wait for "PDR System Schema Deployment Complete!"

3. **Verify Schema Deployment**
   - Copy contents of `scripts/database/VERIFY_DATABASE_DEPLOYMENT.sql`
   - Run in SQL Editor
   - ✅ Should show: Tables: 11, Enums: 7, Company Values: 6

### **Step 2: Configure Environment** ⏱️ *2 minutes*

1. **Get Supabase Credentials**
   - In Supabase Dashboard → Settings → API
   - Copy these values:
     - **Project URL**
     - **anon public key**  
     - **service_role secret key**

2. **Create Environment File**
   - Copy `env.local.template` to `.env.local`
   - Update with your actual credentials:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-actual-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-actual-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-actual-service-role-key"
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### **Step 3: Test System Foundation** ⏱️ *3 minutes*

1. **Start Development Server**
```bash
npm run dev
```

2. **Run Automated Tests**
```bash
# Test API endpoints
node scripts/testing/test-api-endpoints.js

# Test user flows  
node scripts/testing/test-user-flows.js
```
   - ✅ Both should show "ALL TESTS PASSED!"

3. **Manual Verification**
   - Open: http://localhost:3000/api/health
   - ✅ Should show: `"database": { "connected": true }`

### **Step 4: Test Authentication Flow** ⏱️ *5 minutes*

1. **Access Application**
   - Go to: http://localhost:3000
   - Should redirect to login page

2. **Create Test Employee**
   - Click "Sign Up" tab
   - Use these details:
     - Email: `employee@test.com`
     - Password: `testpass123`
     - First Name: `Test`
     - Last Name: `Employee`
     - Role: `EMPLOYEE`
   - ✅ Should see: "Account created successfully"

3. **Create Test CEO**
   - Sign out and create another account:
     - Email: `ceo@test.com`  
     - Password: `testpass123`
     - First Name: `Test`
     - Last Name: `CEO`
     - Role: `CEO`

4. **Verify Profile Creation**
   - In Supabase Dashboard → Table Editor → `profiles`
   - ✅ Should see both test user profiles

### **Step 5: Test Core PDR Functionality** ⏱️ *10 minutes*

#### **Employee Flow Test**
1. **Login as Employee** (`employee@test.com`)
   - ✅ Should redirect to `/dashboard`
   - ✅ Should see employee dashboard

2. **Create PDR**
   - Look for "Create New PDR" or "Start PDR" button
   - Select "FY 2024-2025"
   - ✅ Should create successfully without errors

3. **Add Goals**
   - Navigate to Goals section
   - Add a test goal:
     - Title: "Complete Project X"
     - Description: "Deliver project on time"
     - Goal Mapping: "OPERATING_EFFICIENCY"
     - Weighting: 25 (must total 100 across all goals)
   - ✅ Should save successfully

4. **Add Behavior Entries**
   - Navigate to Behaviors section
   - Add behavior example for any company value
   - ✅ Should save successfully

#### **CEO Flow Test**  
1. **Login as CEO** (`ceo@test.com`)
   - ✅ Should redirect to `/admin`
   - ✅ Should see admin dashboard

2. **View Employee PDRs**
   - Should see list of all employee PDRs
   - ✅ Should see the PDR created by test employee

3. **Review Employee Goals**
   - Click on employee's PDR
   - Navigate to goals section
   - Add CEO rating and comments
   - ✅ Should save successfully

### **Step 6: Final Verification** ⏱️ *5 minutes*

**Test These Critical Features:**

- [ ] ✅ User registration creates profile in database
- [ ] ✅ Employee can create PDR and add goals with weighting
- [ ] ✅ Employee can add behavior entries
- [ ] ✅ CEO can view all employee PDRs
- [ ] ✅ CEO can review and rate goals/behaviors
- [ ] ✅ Authentication redirects work (CEO→admin, Employee→dashboard)
- [ ] ✅ No 500 errors in API calls
- [ ] ✅ No console errors in browser dev tools

---

## 🎯 **SUCCESS CRITERIA**

Your system is **PRODUCTION READY** when:

### **✅ Database Health**
- Health check returns `database.connected: true`
- All 11 tables exist with proper relationships
- Seed data loaded (6 company values, 2 PDR periods)

### **✅ Authentication Works**
- User registration creates profiles automatically
- Login redirects to correct dashboard based on role
- Profile data syncs between auth.users and profiles table

### **✅ Core Functionality**
- Employees can create PDRs and add goals with weighting
- Goals table accepts weighting and goal_mapping columns
- CEO can view and review all employee PDRs
- No type errors or validation failures

### **✅ Technical Quality**
- API endpoints return proper HTTP status codes
- Error handling prevents 500 errors
- TypeScript types match database schema
- No console errors in browser

---

## 🚨 **TROUBLESHOOTING**

### **Problem: Health Check Fails**
```json
{ "database": { "connected": false } }
```
**Solution:**
1. Check `.env.local` has correct Supabase credentials
2. Verify Supabase project is not paused
3. Test credentials in Supabase dashboard

### **Problem: "relation 'goals' does not exist"**
**Solution:**
1. Re-run `DEPLOY_TO_NEW_SUPABASE.sql` in SQL Editor
2. Verify all tables created with `VERIFY_DATABASE_DEPLOYMENT.sql`

### **Problem: "Column 'weighting' doesn't exist"**
**Solution:**
1. Run `RUN_THIS_IN_SUPABASE_SQL_EDITOR.sql`
2. Verify goals table structure in Supabase Table Editor

### **Problem: User Registration Fails**
**Solution:**
1. Check `handle_new_user()` function exists in Supabase
2. Verify trigger `on_auth_user_created` is active
3. Check RLS policies on profiles table

### **Problem: 401 Errors on All API Calls**
**Solution:**
1. Clear browser cache and cookies
2. Check middleware.ts is not blocking requests
3. Verify Supabase session is valid

---

## 🎉 **PRODUCTION DEPLOYMENT**

Once all tests pass locally:

### **Environment Variables for Production**
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-prod-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-prod-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-prod-service-role-key"
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### **Build and Deploy**
```bash
npm run build
npm run start
```

### **Post-Deployment Checklist**
- [ ] Run `test-api-endpoints.js` against production URL
- [ ] Test user registration and login
- [ ] Verify all dashboard functions work
- [ ] Monitor logs for any errors

---

## 🏆 **CONGRATULATIONS!**

Your PDR System is now **fully functional and production-ready**!

**Key Features Achieved:**
- ✅ **Multi-user authentication** with role-based access
- ✅ **Complete PDR workflow** from creation to CEO review
- ✅ **Secure database** with Row Level Security
- ✅ **Type-safe development** with full TypeScript coverage
- ✅ **Production architecture** ready to scale

**Your system can now handle real users, real PDR data, and real business workflows!** 🎯

---

*Setup Guide Version: 1.0*  
*Last Updated: $(date)*  
*Status: Production Ready* 🚀
