# 🔐 AUTHENTICATION FIX GUIDE

## 🚨 Problem: 401 Unauthorized Errors on Login

When logging in, you're seeing console errors like:
- `Dashboard PDR fetch failed: 401 Unauthorized`
- `PDR History fetch failed: 401 Unauthorized`

## 🔍 Root Cause

The issue is a **profile synchronization problem** between:
- ✅ `auth.users` table (Supabase authentication) - Working  
- ❌ `profiles` table (application user data) - Missing/Incomplete

**What happens:**
1. User successfully logs in (stored in `auth.users`)
2. Server-side authentication checks fail because profile is missing from `profiles` table
3. Row Level Security (RLS) policies can't determine user permissions
4. API calls return 401 Unauthorized

## 🛠️ QUICK FIX (Recommended)

### Step 1: Diagnose the Issue
```bash
# Run the diagnostic script first
node diagnose-auth-issue.js
```

This will show you exactly what's wrong with your authentication setup.

### Step 2: Apply the Complete Fix
```bash
# Run the comprehensive fix
node fix-auth-complete.js
```

This script will:
- ✅ Verify Supabase connection
- ✅ Check/create user in auth.users
- ✅ Sync profile data between auth.users and profiles table
- ✅ Create test PDR data
- ✅ Verify permissions are working

### Step 3: Restart and Test
```bash
# Restart your development server
npm run dev

# Clear browser cache and cookies
# Login again - should work without errors!
```

## 🔧 Manual Fix (Alternative)

If you prefer to fix manually:

### 1. Check User Profile
```javascript
// In Supabase SQL Editor:
SELECT 
  au.id, au.email, au.user_metadata,
  p.id as profile_id, p.first_name, p.last_name, p.role
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE au.email = 'ryan.higginson@codefishstudio.com';
```

### 2. Create Missing Profile
```sql
-- If profile is missing, create it:
INSERT INTO profiles (id, email, first_name, last_name, role, is_active)
SELECT 
  id,
  email,
  COALESCE(user_metadata->>'first_name', 'Ryan'),
  COALESCE(user_metadata->>'last_name', 'Higginson'),
  COALESCE((user_metadata->>'role')::user_role, 'EMPLOYEE'),
  true
FROM auth.users
WHERE email = 'ryan.higginson@codefishstudio.com'
AND NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.users.id);
```

### 3. Ensure System Data Exists
```sql
-- Check company values exist
SELECT COUNT(*) FROM company_values;

-- If empty, insert defaults:
INSERT INTO company_values (name, description, sort_order) VALUES 
('Innovation', 'We embrace creativity and continuously seek new ways to improve and grow.', 1),
('Integrity', 'We act with honesty, transparency, and ethical behavior in all our interactions.', 2),
('Collaboration', 'We work together effectively, sharing knowledge and supporting each other.', 3),
('Excellence', 'We strive for the highest quality in everything we do and continuously improve.', 4),
('Customer Focus', 'We put our customers at the center of everything we do and exceed their expectations.', 5);

-- Check PDR periods exist
SELECT COUNT(*) FROM pdr_periods;

-- If empty, insert current financial year:
INSERT INTO pdr_periods (name, start_date, end_date, is_active) VALUES 
('FY2024-2025', '2024-07-01', '2025-06-30', true);
```

## 📋 Testing Your Fix

### Expected Behavior After Fix:
1. Login should work without console errors
2. Dashboard should load and show "Create PDR" button or existing PDRs
3. Navigation between pages should work smoothly
4. No more 401 Unauthorized errors

### Test Checklist:
- [ ] Login works without console errors
- [ ] Dashboard loads properly
- [ ] Can create a new PDR
- [ ] Can view existing PDRs
- [ ] API calls return data instead of 401 errors

## 🔍 Additional Diagnostics

### Check Authentication State:
```bash
# Run this anytime to check current state:
node diagnose-auth-issue.js
```

### Check Browser Network Tab:
- Open Developer Tools → Network tab
- Login and watch for API calls
- Should see 200 responses instead of 401s

### Check Database Directly:
```sql
-- Verify profile exists and is complete
SELECT * FROM profiles WHERE email = 'ryan.higginson@codefishstudio.com';

-- Check user's PDRs
SELECT p.*, pr.first_name, pr.last_name 
FROM pdrs p
JOIN profiles pr ON pr.id = p.user_id
WHERE pr.email = 'ryan.higginson@codefishstudio.com';
```

## 🆘 Still Having Issues?

If the fix doesn't work:

1. **Check .env.local**: Ensure you have correct Supabase credentials
2. **Clear all browser data**: Cookies, localStorage, sessionStorage
3. **Restart dev server**: `npm run dev`
4. **Check Supabase dashboard**: Verify RLS policies are enabled
5. **Run diagnostics again**: `node diagnose-auth-issue.js`

## 🧹 Clean Slate Option

If you want to start fresh with clean data:

```bash
# WARNING: This will delete all user data
node wipe-user-data-only.js --confirm

# Then run the fix
node fix-auth-complete.js
```

This preserves your database structure but removes all user-generated data, giving you a clean slate to test with.
