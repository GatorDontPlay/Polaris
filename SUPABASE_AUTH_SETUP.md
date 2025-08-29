# Supabase Authentication Setup Guide

## Overview

This guide will help you set up Supabase authentication for the PDR Advanced system, replacing the demo authentication with a production-ready authentication system.

## Features Implemented

✅ **Supabase Authentication Integration**
- Email/password authentication
- User registration with role selection
- Password reset functionality
- Email confirmation flow
- Automatic profile creation

✅ **Role-Based Access Control**
- Employee role: Access to personal PDR dashboard
- CEO role: Access to admin dashboard and all PDRs
- Route protection via middleware
- Component-level role guards

✅ **Security Features**
- Server-side session validation
- Row Level Security (RLS) policies
- Secure middleware route protection
- Type-safe authentication utilities

## Setup Instructions

### 1. Supabase Project Setup

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project named "CFS_Polaris"
   - Note down your project URL and anon key

2. **Set up Database Schema**
   - Go to SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `supabase-schema.sql`
   - Run the SQL to create the necessary tables and policies

3. **Configure Authentication**
   - Go to Authentication > Settings
   - **Site URL**: Set to `http://localhost:3000` (for development)
   - **Redirect URLs**: Add the following:
     - `http://localhost:3000/auth/confirm`
     - `http://localhost:3000/auth/reset-password`
   - **Email Confirmation**: Enable "Enable email confirmations"

4. **Update Email Templates**
   - Go to Authentication > Email Templates
   - **Confirm Signup Template**: Update the template to use:
     ```html
     <h2>Confirm your signup</h2>
     <p>Follow this link to confirm your user:</p>
     <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard">Confirm your email</a></p>
     ```
   - **Reset Password Template**: Update to:
     ```html
     <h2>Reset Password</h2>
     <p>Follow this link to reset the password for your user:</p>
     <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/reset-password">Reset Password</a></p>
     ```

### 2. Environment Configuration

1. **Create Environment File**
   ```bash
   cp env.example .env.local
   ```

2. **Update Environment Variables**
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```

### 3. Installation and Setup

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

## Testing the Authentication System

### 1. User Registration Flow

1. **Navigate to Login Page**
   - Go to `http://localhost:3000/login`
   - Click on the "Sign Up" tab

2. **Create Employee Account**
   - First Name: John
   - Last Name: Doe
   - Email: employee@company.com
   - Password: password123
   - Role: Employee
   - Submit the form

3. **Email Confirmation**
   - Check your email for confirmation link
   - Click the confirmation link
   - Should redirect to `/dashboard`

4. **Create CEO Account**
   - Sign out and repeat with:
   - Email: ceo@company.com
   - Role: CEO
   - Should redirect to `/admin` after confirmation

### 2. Login Flow Testing

1. **Employee Login**
   - Email: employee@company.com
   - Password: password123
   - Should redirect to `/dashboard`

2. **CEO Login**
   - Email: ceo@company.com
   - Password: password123
   - Should redirect to `/admin`

### 3. Role-Based Access Testing

1. **Employee Access**
   - Try accessing `/admin` → Should redirect to `/dashboard`
   - Access `/dashboard` → Should work
   - Access `/` → Should redirect to `/dashboard`

2. **CEO Access**
   - Try accessing `/dashboard` → Should redirect to `/admin`
   - Access `/admin` → Should work
   - Access `/` → Should redirect to `/admin`

### 4. Password Reset Flow

1. **Reset Password**
   - Go to login page
   - Click "Reset Password" tab
   - Enter your email
   - Check email for reset link
   - Click link and set new password
   - Login with new password

### 5. Sign Out Testing

1. **Sign Out**
   - Use sign out functionality in the app
   - Should redirect to `/login`
   - Try accessing protected routes → Should redirect to `/login`

## Architecture Overview

### Authentication Provider

The `SupabaseAuthProvider` wraps the entire application and provides:
- User authentication state
- Role-based access utilities
- Automatic session management
- Login/logout functionality

### Middleware Protection

The middleware (`middleware.ts`) handles:
- Session refresh on every request
- Route protection based on authentication
- Role-based route redirection
- Public route allowlisting

### Role-Based Components

Use the role guard components for UI access control:

```tsx
import { RoleGuard, CEOOnly, EmployeeOnly } from '@/components/auth/role-guard'

// Show content only to CEOs
<CEOOnly>
  <AdminPanel />
</CEOOnly>

// Show content only to employees
<EmployeeOnly>
  <EmployeeDashboard />
</EmployeeOnly>

// Custom role combinations
<RoleGuard allowedRoles={['CEO']} fallback={<AccessDenied />}>
  <SensitiveData />
</RoleGuard>
```

### Server-Side Authentication

For API routes and server components:

```tsx
import { requireAuth, requireCEO, withPermission } from '@/lib/auth-server'
import { PERMISSIONS } from '@/lib/permissions'

// Require any authenticated user
export async function GET() {
  return withAuth(async (user) => {
    // user is guaranteed to be authenticated
    return Response.json({ user })
  })
}

// Require CEO role
export async function DELETE() {
  const user = await requireCEO()
  // Only CEOs can reach this point
}

// Check specific permissions
export async function POST() {
  return withPermission(PERMISSIONS.MANAGE_EMPLOYEES, async (user) => {
    // User has the required permission
  })
}
```

## Troubleshooting

### Common Issues

1. **Email Confirmation Not Working**
   - Check SMTP settings in Supabase
   - Verify redirect URLs are configured
   - Check email template configuration

2. **Redirect Loops**
   - Clear browser cache and cookies
   - Check middleware configuration
   - Verify environment variables

3. **Authentication State Issues**
   - Check browser console for errors
   - Verify Supabase project settings
   - Ensure database schema is applied

4. **Role Access Issues**
   - Verify user profile has correct role
   - Check RLS policies in database
   - Ensure middleware is running

### Database Verification

Run these queries in Supabase SQL Editor to verify setup:

```sql
-- Check if profiles table exists and has data
SELECT * FROM profiles;

-- Check RLS policies
SELECT schemaname, tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check user roles
SELECT email, role, is_active 
FROM profiles 
ORDER BY created_at DESC;
```

## Next Steps

1. **Configure SMTP** (for production)
   - Set up custom SMTP provider in Supabase
   - Update email templates with branded design

2. **Add MFA** (optional)
   - Enable multi-factor authentication for enhanced security

3. **Social Logins** (optional)
   - Configure Google, GitHub, or other OAuth providers

4. **User Management**
   - Build admin interface for user management
   - Add user invitation flow

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify environment variables are set correctly
3. Ensure Supabase project is properly configured
4. Review the middleware and auth provider logs
5. Check the database schema and RLS policies

The authentication system is now production-ready and provides a secure foundation for the PDR Advanced application.
