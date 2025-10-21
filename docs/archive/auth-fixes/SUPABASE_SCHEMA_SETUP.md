# 🗄️ Supabase Database Schema Setup

## 📋 Setup Instructions

### Step 1: Run the Complete Schema
1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy and paste the contents of `supabase-complete-schema.sql`
4. Click **Run** to execute the complete schema

### Step 2: Verify Tables Created
After running the schema, you should see these tables in your Supabase dashboard:

#### Core Tables:
- ✅ `profiles` (already exists)
- ✅ `pdr_periods` 
- ✅ `pdrs`
- ✅ `goals`
- ✅ `company_values`
- ✅ `behaviors`
- ✅ `behavior_entries`
- ✅ `mid_year_reviews`
- ✅ `end_year_reviews`
- ✅ `audit_logs`
- ✅ `notifications`

#### Features Configured:
- ✅ **Row Level Security (RLS)** on all tables
- ✅ **Role-based access policies** (Employee vs CEO permissions)
- ✅ **Performance indexes** on frequently queried fields
- ✅ **Automatic timestamps** via triggers
- ✅ **Foreign key relationships** between tables
- ✅ **Initial seed data** (company values and PDR period)

### Step 3: Verify RLS Policies
In the Supabase dashboard under **Authentication > Policies**, you should see policies for:
- User data isolation (employees see only their data)
- CEO admin access (CEOs can see all data)
- Secure data operations

### Step 4: Test Database Connection
Once schema is created, we'll update the TypeScript types and migrate the API routes.

## 🎯 What This Schema Provides

### **Complete PDR Workflow Support:**
1. **User Management** - Profiles with role-based access
2. **PDR Periods** - Annual review cycles
3. **PDR Records** - Individual performance reviews
4. **Goals** - Employee objectives and outcomes
5. **Behaviors** - Company value assessments
6. **Reviews** - Mid-year and end-year evaluations
7. **Audit Trail** - Complete change tracking
8. **Notifications** - System messaging

### **Security Features:**
- **Row Level Security** ensures data isolation
- **Role-based policies** provide proper permissions
- **Audit logging** tracks all changes
- **Secure relationships** prevent data orphaning

### **Performance Features:**
- **Strategic indexes** for fast queries
- **Optimized relationships** for efficient joins
- **Automatic timestamps** for data tracking

## 🚀 Next Steps

After running this schema:
1. ✅ Generate TypeScript types
2. ✅ Migrate API routes from Prisma to Supabase
3. ✅ Update data hooks to use Supabase
4. ✅ Remove demo code and Prisma dependencies
5. ✅ Test complete PDR workflow

The database will be production-ready with proper security, performance, and data integrity!
