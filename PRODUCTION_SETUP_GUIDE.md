# 🚀 **PDR SYSTEM - PRODUCTION SETUP GUIDE**

## 🎯 **OVERVIEW**

This guide will take your PDR system from a broken state (after changing Supabase databases) to a **fully functional, production-ready application** in approximately 30 minutes.

---

## ⚡ **QUICK START (5 STEPS)**

### **Step 1: Deploy Database Schema** ⏱️ *5 minutes*

1. **Open your NEW Supabase Dashboard**
   - Go to [supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your new project

2. **Run the Complete Schema**
   - Navigate to `SQL Editor`
   - Copy the ENTIRE contents of `DEPLOY_TO_NEW_SUPABASE.sql`
   - Paste into SQL Editor and click **RUN**
   - ✅ Should see: "PDR System Schema Deployment Complete!"

3. **Verify Deployment**
   - Copy contents of `VERIFY_DATABASE_DEPLOYMENT.sql`
   - Run in SQL Editor
   - ✅ Should see all green checkmarks (✅)

### **Step 2: Update Environment Variables** ⏱️ *2 minutes*

1. **Get Your Supabase Credentials**
   - In Supabase Dashboard → Settings → API
   - Copy these 3 values:
     - **Project URL** (starts with `https://`)
     - **anon public key** (long string starting with `eyJ`)
     - **service_role secret key** (long string starting with `eyJ`)

2. **Update Your Environment File**
   - Copy `env.local.template` to `.env.local`
   - Replace the placeholder values with your actual credentials:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-actual-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-actual-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-actual-service-role-key"
```

### **Step 3: Test the System** ⏱️ *3 minutes*

1. **Restart Development Server**
```bash
npm run dev
```

2. **Run API Tests**
```bash
node test-api-endpoints.js
```
   - ✅ Should see: "ALL TESTS PASSED!"

3. **Manual Health Check**
   - Open: http://localhost:3000/api/health
   - ✅ Should see: `"database": { "connected": true }`

### **Step 4: Test User Authentication** ⏱️ *5 minutes*

1. **Open the Application**
   - Go to: http://localhost:3000
   - Should redirect to login page

2. **Create Test User**
   - Click "Sign Up" tab
   - Fill in test details:
     - Email: `test@example.com`
     - Password: `testpass123`
     - First Name: `Test`
     - Last Name: `User`
     - Role: `EMPLOYEE`
   - Click "Create Account"
   - ✅ Should see: "Account created successfully"

3. **Verify Profile Creation**
   - In Supabase Dashboard → Table Editor → `profiles`
   - ✅ Should see your test user profile

### **Step 5: Test Core Functionality** ⏱️ *10 minutes*

1. **Login with Test User**
   - Use credentials from Step 4
   - ✅ Should redirect to employee dashboard

2. **Create a PDR**
   - Click "Create New PDR" or similar button
   - Select "FY 2024-2025"
   - ✅ Should create successfully

3. **Add Goals**
   - Navigate to Goals section
   - Add a test goal with title and weighting
   - ✅ Should save without errors

4. **Test CEO View**
   - Create another user with role "CEO"
   - Login as CEO
   - ✅ Should see admin dashboard with all employee PDRs

### **Step 6: Comprehensive Testing** ⏱️ *5 minutes*

Test every major button and flow:

**Employee Flow:**
- ✅ Dashboard loads
- ✅ Can create PDR
- ✅ Can add/edit goals
- ✅ Can add behavior entries
- ✅ Can submit for review

**CEO Flow:**
- ✅ Admin dashboard loads
- ✅ Can see all employee PDRs
- ✅ Can review and comment on goals
- ✅ Can add behavior feedback

---

## 🔧 **TROUBLESHOOTING**

### **Problem: Health Check Fails**
**Symptoms:** `"database": { "connected": false }`
**Solution:**
1. Check `.env.local` has correct Supabase credentials
2. Verify Supabase project is active (not paused)
3. Check database schema was deployed successfully

### **Problem: User Registration Fails**
**Symptoms:** "Profile creation failed" or similar
**Solution:**
1. Verify `handle_new_user()` function exists in Supabase
2. Check `profiles` table was created
3. Verify RLS policies are enabled

### **Problem: API Endpoints Return 500 Errors**
**Symptoms:** Internal server errors on API calls
**Solution:**
1. Check server logs for specific error messages
2. Verify all required tables exist
3. Check foreign key constraints are properly set up

### **Problem: Goals Can't Be Created**
**Symptoms:** "Column 'weighting' doesn't exist" or similar
**Solution:**
1. Run the `RUN_THIS_IN_SUPABASE_SQL_EDITOR.sql` script
2. Verify goals table has `weighting` and `goal_mapping` columns

---

## ✅ **SUCCESS CRITERIA**

Your system is production-ready when:

- [ ] ✅ Health check returns `database.connected: true`
- [ ] ✅ Company values API returns 6 values
- [ ] ✅ User registration creates profile in database
- [ ] ✅ Employee can create PDR and add goals
- [ ] ✅ CEO can view all employee PDRs
- [ ] ✅ All API endpoints return proper responses (not 500 errors)
- [ ] ✅ Authentication redirects work correctly
- [ ] ✅ No console errors in browser dev tools

---

## 🚀 **PRODUCTION DEPLOYMENT**

Once everything works locally:

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
- [ ] Verify email confirmations work (if enabled)
- [ ] Check all dashboard functions
- [ ] Monitor logs for any errors

---

## 📞 **SUPPORT**

If you encounter issues:

1. **Check the console logs** in your browser dev tools
2. **Check server logs** in your terminal where `npm run dev` is running
3. **Verify database state** in Supabase dashboard
4. **Run verification scripts** to confirm setup

Your PDR system should now be **fully functional and production-ready**! 🎉

---

*Last Updated: $(date)*
*Status: Production Ready*
