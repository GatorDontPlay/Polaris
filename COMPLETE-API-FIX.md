# 🔧 COMPLETE API FIX GUIDE

## 🎯 Issues Identified

1. **❌ Notifications table missing** → 500 errors on `/api/notifications`
2. **❌ PDR API data mismatch** → 500 errors on `/api/pdrs` creation

## 🛠️ STEP 1: Add Missing Notifications Table

**Copy this SQL to Supabase SQL Editor and run:**

```sql
-- Create notifications table (missing from reset)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pdr_id UUID REFERENCES pdrs(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY IF NOT EXISTS "Users can view their notifications" ON notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can update their notifications" ON notifications
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "System can create notifications" ON notifications
FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT ALL ON notifications TO authenticated;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read_at ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
```

## 🛠️ STEP 2: Fix PDR API Data Format

The issue is data format mismatch:

**Frontend sends:**
```javascript
{
  label: "2025-2026",
  startDate: Date,
  endDate: Date
}
```

**API expects:**
```javascript
{
  fyLabel: "2025-2026", 
  fyStartDate: "2025-07-01",
  fyEndDate: "2026-06-30"
}
```

## 📋 QUICK SOLUTION

**Option A: Fix Frontend (Recommended)**
Update your PDR creation to send the correct format:

```javascript
const pdrData = {
  fyLabel: selectedFY.label,
  fyStartDate: selectedFY.startDate.toISOString().split('T')[0], 
  fyEndDate: selectedFY.endDate.toISOString().split('T')[0]
};
```

**Option B: Fix API (Alternative)** 
Update the API to accept the current frontend format.

## ⚡ Expected Results

After both fixes:
- ✅ No more 500 errors on `/api/notifications`
- ✅ PDR creation works successfully 
- ✅ Dashboard loads without errors
- ✅ All functionality restored
