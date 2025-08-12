# 🔐 **How to Log In - PDR Advanced Testing**

## 📍 **Login URL**
```
http://localhost:3000/login
```

## 🚀 **Quick Start - Demo Login (Recommended for Testing)**

### **Option 1: Demo Employee Login**
1. Click the **"Demo Employee"** button
2. Automatically redirected to employee dashboard
3. Can access PDR workflow: `/pdr/test-123/goals`, `/pdr/test-123/behaviors`, etc.

### **Option 2: Demo CEO Login**  
1. Click the **"Demo CEO"** button
2. Automatically redirected to admin dashboard
3. Can access admin features and review capabilities

## 📧 **Standard Login Form (Database Required)**

### **When Database is Connected:**
- Enter email and password in the form
- Click "Sign In"
- Automatically redirected based on role

### **Without Database (Current Setup):**
- Form will show connection error
- Use demo buttons instead for testing

## 🎯 **What Happens After Login**

### **Employee User**
- **Redirected to**: `/dashboard` (Employee Dashboard)  
- **Can Access**: 
  - PDR workflow (Goals, Behaviors, Review, Mid-Year, End-Year)
  - Personal dashboard and history
  - Profile settings

### **CEO User**
- **Redirected to**: `/admin` (Admin Dashboard)
- **Can Access**:
  - Employee management
  - PDR review and approval
  - System analytics and reports
  - Admin settings

## 🔄 **Navigation Flow**

```
Homepage (/) 
    ↓
Login Page (/login)
    ↓
┌─ Demo Employee ──→ Employee Dashboard (/dashboard)
│                      ↓
│                   PDR Workflow (/pdr/[id]/goals)
│
└─ Demo CEO ──────→ Admin Dashboard (/admin)
                      ↓
                   Management Tools
```

## 🧪 **Testing the Complete PDR Workflow**

### **After Demo Employee Login:**
1. **Goals Page**: `http://localhost:3000/pdr/test-123/goals`
   - Add performance objectives
   - Set priorities and descriptions
   - Navigate to next step

2. **Behaviors Page**: `http://localhost:3000/pdr/test-123/behaviors`
   - Assess company values alignment
   - Rate yourself with star ratings
   - Add examples and self-assessments

3. **Review Page**: `http://localhost:3000/pdr/test-123/review`
   - Review all entered data
   - Submit for manager review
   - Check completion statistics

4. **Mid-Year Page**: `http://localhost:3000/pdr/test-123/mid-year`
   - Provide progress updates
   - Identify blockers and challenges
   - Request support and feedback

5. **End-Year Page**: `http://localhost:3000/pdr/test-123/end-year`
   - Summarize achievements
   - Rate overall performance
   - Set goals for next year

## 🛡️ **Authentication Features**

### **Demo Authentication (Current)**
- ✅ **Persistent**: Login state saved in localStorage
- ✅ **Role-based**: Automatic redirection by user type
- ✅ **Secure**: Session management and logout functionality
- ✅ **User-friendly**: Toast notifications and error handling

### **Database Authentication (Future)**
- 🔐 JWT token-based authentication
- 🔑 Secure password hashing
- 📊 Audit logging for security
- 🚨 Rate limiting and brute force protection

## 🎨 **Modern UI Features**

The login page showcases the modern design system:
- **shadcn/ui Components**: Professional card layout and form controls
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Toast Notifications**: User feedback for all actions
- **Loading States**: Visual feedback during authentication
- **Error Handling**: Clear messages for connection issues

## 🚨 **Troubleshooting**

### **Common Issues:**

#### **"No QueryClient set" Error**
- ✅ **Fixed**: QueryProvider now properly configured in root layout

#### **Can't Access PDR Pages**
- **Solution**: Make sure you're logged in first
- **Check**: Demo user data exists in localStorage

#### **Database Connection Errors**
- **Expected**: Database not configured yet
- **Solution**: Use demo login buttons for testing

#### **Pages Not Loading**
- **Check**: Development server is running (`npm run dev`)
- **Verify**: No console errors in browser DevTools

## 🏃‍♂️ **Quick Test Sequence**

1. **Start Server**: `npm run dev`
2. **Open Browser**: http://localhost:3000
3. **Login**: Click "Demo Employee" 
4. **Test Navigation**: Go to PDR workflow pages
5. **Test Forms**: Add goals and behaviors
6. **Test CEO View**: Logout and login as "Demo CEO"

## 💡 **Pro Tips**

- **Use Demo Login**: Fastest way to test features
- **Check Browser Console**: For any JavaScript errors  
- **Test Mobile**: Use browser responsive mode
- **Clear Storage**: localStorage.clear() to reset demo login
- **Multiple Tabs**: Test different user roles simultaneously

---

## 🎉 **Ready to Test!**

Your PDR Advanced system now has a fully functional authentication system perfect for testing the complete employee workflow and admin features.

**Next Steps**: After testing the UI/UX, you can set up database connection for full data persistence and production authentication.
